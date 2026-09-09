import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as React from "react";
import ts from "typescript";
import { api, ApiError, configureApiAuth } from "./api.ts";
import { runAuthOperation } from './auth-operation.ts';

const compiled = ts.transpileModule(
  readFileSync(new URL("./auth-context.tsx", import.meta.url), "utf8"),
  { compilerOptions: {
    jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  } },
).outputText;

// Run the real provider/query/client before React has committed layout effects.
// This reproduces the cold-mount ordering; it is not authenticated browser QA.
function coldBootstrap(getToken: () => Promise<string | null>) {
  let query: {
    queryKey: unknown[];
    queryFn: (context: { signal: AbortSignal }) => Promise<unknown>;
  } | undefined;
  const modules: Record<string, unknown> = {
    react: {
      ...React,
      useState: () => [null, () => undefined],
      useMemo: (factory: () => unknown) => factory(),
      useCallback: (callback: unknown) => callback,
      useRef: (value: unknown) => ({ current: value }),
      useLayoutEffect: () => undefined,
      useEffect: () => undefined,
    },
    "react/jsx-runtime": { jsx: React.createElement, jsxs: React.createElement },
    "@clerk/nextjs": { useAuth: () => ({
      getToken, isLoaded: true, isSignedIn: true, userId: "qa-current-user",
    }) },
    "@tanstack/react-query": {
      useQueryClient: () => ({}),
      useQuery: (options: typeof query) => {
        query = options;
        return { data: undefined, error: null, isLoading: true };
      },
    },
    "./api": { api, ApiError, configureApiAuth },
    './auth-operation': { runAuthOperation },
  };
  const exports: { AuthProvider?: (props: { children: null }) => unknown } = {};
  new Function("exports", "require", compiled)(exports, (name: string) => {
    assert.ok(Object.hasOwn(modules, name), `Unexpected dependency: ${name}`);
    return modules[name];
  });
  assert.ok(exports.AuthProvider);
  exports.AuthProvider({ children: null });
  assert.ok(query);
  return query;
}

test("cold bootstrap sends the current session before the auth layout effect, without tenant", async (t) => {
  const restore = configureApiAuth(async () => {
    throw new Error("The business resolver must not supply bootstrap authority");
  });
  t.after(restore);
  const calls: RequestInit[] = [];
  t.mock.method(globalThis, "fetch", async (url: string, options: RequestInit) => {
    assert.ok(url.endsWith("/auth/clerk/bootstrap"));
    calls.push(options);
    return Response.json({ state: "READY" });
  });
  let resolveToken!: (value: string) => void;
  const token = new Promise<string>((resolve) => { resolveToken = resolve; });
  const query = coldBootstrap(() => token);
  const controller = new AbortController();
  const pending = query.queryFn({ signal: controller.signal });
  assert.equal(calls.length, 0);
  resolveToken("synthetic-current-session");
  assert.deepEqual(await pending, { state: "READY" });
  assert.deepEqual(query.queryKey, ["auth", "clerk-bootstrap", "qa-current-user"]);
  assert.equal(calls.length, 1);
  const headers = new Headers(calls[0].headers);
  assert.equal(headers.get("authorization"), "Bearer synthetic-current-session");
  assert.equal(headers.has("x-organization-id"), false);
  assert.equal(calls[0].signal?.aborted, false);
  assert.equal(Object.hasOwn(calls[0], "authContext"), false);
});

test("missing Clerk token fails without sending an anonymous bootstrap request", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", async () => Response.json({}));
  const query = coldBootstrap(async () => null);
  await assert.rejects(query.queryFn({ signal: new AbortController().signal }),
    (error: unknown) => error instanceof ApiError && error.status === 401);
  assert.equal(fetchMock.mock.callCount(), 0);
});

test("business requests keep the existing tenant/session resolver", async (t) => {
  t.after(configureApiAuth(async () => ({
    token: "synthetic-business-session", organizationId: "qa-organization",
  })));
  t.mock.method(globalThis, "fetch", async (_url: string, options: RequestInit) => {
    const headers = new Headers(options.headers);
    assert.equal(headers.get("authorization"), "Bearer synthetic-business-session");
    assert.equal(headers.get("x-organization-id"), "qa-organization");
    return Response.json([]);
  });
  assert.deepEqual(await api.get("/organizations/mine/team-members"), []);
});

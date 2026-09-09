import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as React from "react";
import ts from "typescript";

const source = readFileSync(
  new URL("../app/auth/continue/page.tsx", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

function renderContinue(options: {
  loaded: boolean;
  signedIn: boolean;
  next?: string;
}) {
  const redirects: string[] = [];
  const effects: Array<() => void> = [];
  const modules: Record<string, unknown> = {
    react: {
      ...React,
      useEffect: (effect: () => void) => effects.push(effect),
    },
    "react/jsx-runtime": { jsx: React.createElement, jsxs: React.createElement },
    "@clerk/nextjs": {
      useAuth: () => ({
        isLoaded: options.loaded,
        isSignedIn: options.signedIn,
      }),
    },
    "next/navigation": {
      useRouter: () => ({
        replace: (destination: string) => redirects.push(destination),
      }),
      useSearchParams: () =>
        new URLSearchParams(
          options.next ? `next=${encodeURIComponent(options.next)}` : "",
        ),
    },
    "@/components/auth/AuthShell": { AuthShell: () => null },
    "@/lib/auth-routes": {
      resolveDashboardRedirect: (requested: string | null) =>
        requested?.startsWith("/dashboard") ? requested : "/dashboard",
    },
  };
  const exports: { default?: () => React.ReactElement } = {};
  new Function("exports", "require", compiled)(exports, (name: string) => {
    assert.ok(Object.hasOwn(modules, name), `Unexpected dependency: ${name}`);
    return modules[name];
  });
  assert.ok(exports.default);
  const shell = exports.default() as React.ReactElement<{
    children: React.ReactElement;
  }>;
  const Content = shell.props.children.type as () => React.ReactElement;
  Content();
  return { effects, redirects };
}

test("legacy continue waits only for Clerk and then opens the requested dashboard", () => {
  const loading = renderContinue({
    loaded: false,
    signedIn: false,
    next: "/dashboard/team",
  });
  loading.effects.forEach((effect) => effect());
  assert.deepEqual(loading.redirects, []);

  const ready = renderContinue({
    loaded: true,
    signedIn: true,
    next: "/dashboard/team",
  });
  ready.effects.forEach((effect) => effect());
  assert.deepEqual(ready.redirects, ["/dashboard/team"]);
});

test("legacy continue sends unsigned sessions to Clerk login", () => {
  const view = renderContinue({
    loaded: true,
    signedIn: false,
    next: "/dashboard/professionals",
  });
  view.effects.forEach((effect) => effect());
  assert.deepEqual(view.redirects, [
    "/login?next=%2Fdashboard%2Fprofessionals",
  ]);
});

test("business onboarding no longer lives in the authentication bridge", () => {
  for (const removedConcern of [
    "/auth/clerk/onboarding",
    "organizationName",
    "organizationSlug",
    "organizationEmail",
  ]) {
    assert.equal(source.includes(removedConcern), false);
  }
});

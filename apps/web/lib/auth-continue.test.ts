import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as React from "react";
import ts from "typescript";

// Ejecuta el componente real; dobles solo para hooks, navegación y servicios.
// No sustituye la verificación de una sesión Clerk real en navegador.
const compiled = ts.transpileModule(
  readFileSync(new URL("../app/auth/continue/page.tsx", import.meta.url), "utf8"),
  {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;

function renderOnboarding(options: { submitting?: boolean; signedIn?: boolean; ready?: boolean } = {}) {
  const requests: Array<{ path: string; body: unknown }> = [];
  const redirects: string[] = [];
  const effects: Array<() => void> = [];
  let logoutCalls = 0;
  let stateIndex = 0;
  const values = ["  Negocio QA  ", "  negocio-qa  ", "  negocio@example.test  ", false, options.submitting ?? false, null];
  const Button = () => null;
  const auth = {
    isLoaded: true,
    isSignedIn: options.signedIn ?? true,
    isReady: options.ready ?? false,
    state: "ONBOARDING_REQUIRED",
    error: null,
    logout: async () => { logoutCalls += 1; },
    refresh: async () => ({ state: "READY" }),
  };
  const modules: Record<string, unknown> = {
    react: {
      ...React,
      useState: () => [values[stateIndex++], () => undefined],
      useEffect: (effect: () => void) => { effects.push(effect); },
    },
    "react/jsx-runtime": { jsx: React.createElement, jsxs: React.createElement },
    "next/navigation": {
      useRouter: () => ({ replace: (path: string) => { redirects.push(path); } }),
      useSearchParams: () => new URLSearchParams("next=%2Fdashboard%2Fprofessionals"),
    },
    "@/lib/auth-context": { useAuth: () => auth },
    "@/lib/api": {
      ApiError: class extends Error {},
      api: { post: async (path: string, body: unknown) => { requests.push({ path, body }); } },
    },
    "@/components/auth/AuthShell": { AuthShell: () => null },
    "@/components/ui/Button": { Button },
    "@/components/ui/Field": { InputField: () => null },
  };
  const exports: { default?: () => React.ReactElement } = {};
  new Function("exports", "require", compiled)(exports, (name: string) => {
    assert.ok(Object.hasOwn(modules, name), `Unexpected dependency: ${name}`);
    return modules[name];
  });
  assert.ok(exports.default);
  const shell = exports.default() as React.ReactElement<{ children: React.ReactElement }>;
  const Content = shell.props.children.type as () => React.ReactElement;
  const tree = Content();
  const elements: React.ReactElement<Record<string, unknown>>[] = [];
  function visit(node: React.ReactNode) {
    React.Children.forEach(node, (child) => {
      if (!React.isValidElement<Record<string, unknown>>(child)) return;
      elements.push(child);
      visit(child.props.children as React.ReactNode);
    });
  }
  visit(tree);
  return { elements, Button, requests, redirects, effects, logoutCalls: () => logoutCalls };
}

test("switching account does not submit onboarding or require valid form inputs", async () => {
  const view = renderOnboarding();
  const action = view.elements.find((element) => element.type === view.Button && element.props.children === "Usar otra cuenta");
  assert.ok(action);
  assert.equal(action.props.type, "button");
  assert.equal(action.props.disabled, false);
  await (action.props.onClick as () => void)();
  assert.equal(view.logoutCalls(), 1);
  assert.deepEqual(view.requests, []);
});

test("both onboarding actions are disabled while the creation is pending", () => {
  const view = renderOnboarding({ submitting: true });
  const buttons = view.elements.filter((element) => element.type === view.Button);
  assert.equal(buttons.length, 2);
  assert.ok(buttons.every((button) => button.props.disabled === true));
  assert.equal(buttons[0].props.type, "submit");
  assert.equal(buttons[1].props.type, "button");
});

test("submitting still sends only the existing normalized onboarding contract", async () => {
  const view = renderOnboarding();
  const form = view.elements.find((element) => element.type === "form");
  assert.ok(form);
  let prevented = false;
  await (form.props.onSubmit as (event: { preventDefault: () => void }) => Promise<void>)({
    preventDefault: () => { prevented = true; },
  });
  assert.equal(prevented, true);
  assert.deepEqual(view.requests, [{ path: "/auth/clerk/onboarding", body: {
    organizationName: "Negocio QA", organizationSlug: "negocio-qa", organizationEmail: "negocio@example.test",
  } }]);
  assert.equal(view.logoutCalls(), 0);
  assert.deepEqual(view.redirects, ["/dashboard/professionals"]);
});

test("the access effect still redirects unsigned sessions to login", () => {
  const view = renderOnboarding({ signedIn: false });
  view.effects.forEach((effect) => effect());
  assert.deepEqual(view.redirects, ["/login?next=%2Fdashboard%2Fprofessionals"]);
});

test("a ready session still continues to its dashboard without onboarding", () => {
  const view = renderOnboarding({ ready: true });
  view.effects.forEach((effect) => effect());
  assert.deepEqual(view.redirects, ["/dashboard/professionals"]);
  assert.equal(view.elements.some((element) => element.type === "form"), false);
  assert.deepEqual(view.requests, []);
});

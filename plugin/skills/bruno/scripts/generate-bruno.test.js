import { test } from "node:test";
import assert from "node:assert/strict";
import {
  slug, pathParams, resourceOf, groupRoutes, resolveAuth,
  renderRequest, renderEnvironment, renderBrunoJson, renderFolder,
  renderCollectionBru, buildCollection, writeCollection, parseArgs,
} from "./generate-bruno.js";
import { mkdtempSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// ---------- helpers ----------

test("slug normalizes names", () => {
  assert.equal(slug("Get User by ID"), "get-user-by-id");
  assert.equal(slug("  Create  User!! "), "create-user");
});

test("pathParams extracts :params", () => {
  assert.deepEqual(pathParams("/users/:id/posts/:postId"), ["id", "postId"]);
  assert.deepEqual(pathParams("/users"), []);
});

test("resourceOf uses folder then first segment", () => {
  assert.equal(resourceOf({ path: "/users/:id" }), "users");
  assert.equal(resourceOf({ path: "/users", folder: "people" }), "people");
  assert.equal(resourceOf({ path: "/" }), "root");
});

test("groupRoutes groups by resource", () => {
  const g = groupRoutes([
    { path: "/users", name: "a" },
    { path: "/users/:id", name: "b" },
    { path: "/orders", name: "c" },
  ]);
  assert.deepEqual(Object.keys(g), ["users", "orders"]);
  assert.equal(g.users.length, 2);
});

test("resolveAuth maps shorthands", () => {
  assert.equal(resolveAuth({ auth: true }, {}), "inherit");
  assert.equal(resolveAuth({ auth: false }, {}), "none");
  assert.equal(resolveAuth({ auth: "bearer" }, {}), "bearer");
  assert.equal(resolveAuth({}, { auth: { type: "bearer" } }), "inherit");
  assert.equal(resolveAuth({}, {}), "none");
});

// ---------- renderRequest ----------

test("renderRequest emits params:query, not legacy query", () => {
  const out = renderRequest(
    { method: "GET", path: "/users", name: "List Users", query: { page: 1, limit: 10 } },
    1, {}
  );
  assert.match(out, /params:query \{/);
  assert.doesNotMatch(out, /\nquery \{/);
  assert.match(out, /page: 1/);
});

// bru run sends only the url: line; params:query alone is never sent.
test("renderRequest puts query params on the url line and mirrors them in params:query", () => {
  const out = renderRequest(
    { method: "GET", path: "/users/:id", name: "Get User", query: { expand: "profile", limit: 10 } },
    1, {}
  );
  assert.match(out, /url: \{\{baseUrl\}\}\/users\/:id\?expand=profile&limit=10\n/);
  assert.match(out, /params:query \{\n {2}expand: profile\n {2}limit: 10\n\}/);
});

test("renderRequest appends with & when the path already has a query", () => {
  const out = renderRequest(
    { method: "GET", path: "/search?type=user", name: "Search", query: { q: "{{term}}" } },
    1, {}
  );
  assert.match(out, /url: \{\{baseUrl\}\}\/search\?type=user&q=\{\{term\}\}\n/);
});

test("renderRequest leaves the url alone without query params", () => {
  const out = renderRequest({ method: "GET", path: "/users", name: "List" }, 1, {});
  assert.match(out, /url: \{\{baseUrl\}\}\/users\n/);
});

test("renderRequest keeps :param in url and emits params:path", () => {
  const out = renderRequest({ method: "GET", path: "/users/:id", name: "Get User" }, 2, {});
  assert.match(out, /url: \{\{baseUrl\}\}\/users\/:id/);
  assert.match(out, /params:path \{/);
  assert.match(out, /\n {2}id: /);
  assert.doesNotMatch(out, /\{\{id\}\}/);
});

test("renderRequest uses auth: inherit for authed child, no inline token block", () => {
  const out = renderRequest({ method: "GET", path: "/users", name: "List", auth: true }, 1, {});
  assert.match(out, /auth: inherit/);
  assert.doesNotMatch(out, /auth:bearer \{/);
});

test("renderRequest emits auth:bearer block only for explicit bearer", () => {
  const out = renderRequest({ method: "GET", path: "/me", name: "Me", auth: "bearer" }, 1, {});
  assert.match(out, /auth: bearer/);
  assert.match(out, /auth:bearer \{\n {2}token: \{\{authToken\}\}/);
});

test("renderRequest emits body:json + Content-Type for POST with body", () => {
  const out = renderRequest(
    { method: "POST", path: "/users", name: "Create", body: { name: "x" } }, 1, {}
  );
  assert.match(out, /body: json/);
  assert.match(out, /body:json \{/);
  assert.match(out, /Content-Type: application\/json/);
});

test("renderRequest emits meta tags, token-capture script, and test presets", () => {
  const out = renderRequest(
    { method: "POST", path: "/auth/login", name: "Login", body: { email: "" },
      tags: ["smoke"], script: "token-capture", tests: ["status-200"] }, 1, {}
  );
  assert.match(out, /tags: \[smoke\]/);
  assert.match(out, /script:post-response \{/);
  assert.match(out, /bru\.setVar\("authToken", res\.body\.token\)/);
  assert.doesNotMatch(out, /setEnvVar/);
  assert.match(out, /tests \{/);
  assert.match(out, /expect\(res\.status\)\.to\.equal\(200\)/);
});

// ---------- environment / bruno.json / folder ----------

test("renderEnvironment writes vars and vars:secret names only (no secret values)", () => {
  const out = renderEnvironment({
    name: "dev", baseUrl: "http://localhost:3000",
    vars: { userId: 1 }, secretVars: ["authToken", "apiKey"],
  });
  assert.match(out, /vars \{\n {2}baseUrl: http:\/\/localhost:3000/);
  assert.match(out, /userId: 1/);
  assert.match(out, /vars:secret \[\n {2}authToken,\n {2}apiKey\n\]/);
  assert.doesNotMatch(out, /\n {2}authToken:/);
});

test("renderBrunoJson omits ignore unless provided", () => {
  const a = renderBrunoJson({ name: "My API" });
  assert.match(a, /"version": "1"/);
  assert.match(a, /"type": "collection"/);
  assert.doesNotMatch(a, /ignore/);
  const b = renderBrunoJson({ name: "My API", ignore: ["node_modules"] });
  assert.match(b, /"ignore"/);
});

test("renderFolder writes name and seq", () => {
  assert.equal(renderFolder("users", 2), "meta {\n  name: Users\n  seq: 2\n}\n");
});

// ---------- collection.bru ----------

test("renderCollectionBru emits bearer auth for the collection root", () => {
  const out = renderCollectionBru({ name: "My API", auth: { type: "bearer" } });
  assert.match(out, /meta \{\n {2}name: My API\n\}/);
  assert.match(out, /auth \{\n {2}mode: bearer\n\}/);
  assert.match(out, /auth:bearer \{\n {2}token: \{\{authToken\}\}\n\}/);
});

test("renderCollectionBru emits basic auth with username/password vars", () => {
  const out = renderCollectionBru({ name: "My API", auth: { type: "basic" } });
  assert.match(out, /auth \{\n {2}mode: basic\n\}/);
  assert.match(out, /auth:basic \{\n {2}username: \{\{username\}\}\n {2}password: \{\{password\}\}\n\}/);
});

test("renderCollectionBru defaults to mode none without manifest auth", () => {
  const out = renderCollectionBru({ name: "My API" });
  assert.match(out, /auth \{\n {2}mode: none\n\}/);
  assert.doesNotMatch(out, /auth:bearer/);
});

// ---------- assembler / writer / CLI ----------

const MANIFEST = {
  name: "My API", baseUrl: "http://localhost:3000",
  auth: { type: "bearer" },
  environments: [{ name: "dev", baseUrl: "http://localhost:3000", secretVars: ["authToken"] }],
  routes: [
    { method: "POST", path: "/auth/login", name: "Login", body: { email: "" },
      auth: false, script: "token-capture", tests: ["status-200"] },
    { method: "GET", path: "/users/:id", name: "Get User", auth: true, tests: ["status-200"] },
  ],
};

test("buildCollection returns expected file map", () => {
  const files = buildCollection(MANIFEST);
  const keys = Object.keys(files);
  assert.ok(keys.includes("bruno.json"));
  assert.ok(keys.includes("collection.bru"));
  assert.match(files["collection.bru"], /mode: bearer/);
  assert.ok(keys.includes("environments/dev.bru"));
  assert.ok(keys.includes("auth/folder.bru"));
  assert.ok(keys.includes("auth/login.bru"));
  assert.ok(keys.includes("users/folder.bru"));
  assert.ok(keys.includes("users/get-user.bru"));
});

// bru run orders folders alphabetically unless folder.bru has meta { seq }.
test("buildCollection numbers folders in order of each resource's first route", () => {
  const files = buildCollection({
    name: "Order", baseUrl: "http://localhost:3000",
    routes: [
      { method: "POST", path: "/session/login", name: "Login" },
      { method: "GET", path: "/accounts", name: "List Accounts" },
      { method: "POST", path: "/session/logout", name: "Logout" },
      { method: "GET", path: "/2024/report", name: "Report" },
    ],
  });
  assert.match(files["session/folder.bru"], /\n {2}seq: 1\n/);
  assert.match(files["accounts/folder.bru"], /\n {2}seq: 2\n/);
  assert.match(files["2024/folder.bru"], /\n {2}seq: 3\n/);
  assert.match(files["session/logout.bru"], /\n {2}seq: 2\n/);
});

test("writeCollection writes, then is idempotent without --force", () => {
  const out = mkdtempSync(join(tmpdir(), "bruno-test-"));
  const files = buildCollection(MANIFEST);
  const r1 = writeCollection(files, out, {});
  assert.ok(r1.written.length > 0);
  assert.ok(existsSync(join(out, "users/get-user.bru")));
  const r2 = writeCollection(files, out, {});
  assert.equal(r2.written.length, 0);
  assert.equal(r2.skipped.length, r1.written.length);
});

test("writeCollection --dry-run writes nothing", () => {
  const out = mkdtempSync(join(tmpdir(), "bruno-test-"));
  const files = buildCollection(MANIFEST);
  const r = writeCollection(files, out, { dryRun: true });
  assert.ok(r.written.length > 0);
  assert.equal(existsSync(join(out, "bruno.json")), false);
});

test("writeCollection --force overwrites", () => {
  const out = mkdtempSync(join(tmpdir(), "bruno-test-"));
  const files = buildCollection(MANIFEST);
  writeCollection(files, out, {});
  writeFileSync(join(out, "bruno.json"), "STALE");
  writeCollection(files, out, { force: true });
  assert.notEqual(readFileSync(join(out, "bruno.json"), "utf8"), "STALE");
});

test("parseArgs reads flags", () => {
  const a = parseArgs(["--manifest", "m.json", "--out", "o", "--force"]);
  assert.equal(a.manifest, "m.json");
  assert.equal(a.out, "o");
  assert.equal(a.force, true);
  assert.equal(a.dryRun, false);
});

// Skills are usually installed as a symlinked directory (~/.claude/skills/x ->
// ~/.agents/skills/x). Node resolves import.meta.url through the symlink but
// not process.argv[1], so a naive "am I main?" check silently does nothing.
test("CLI runs when invoked through a symlinked directory", async () => {
  const { symlinkSync } = await import("node:fs");
  const { execFileSync } = await import("node:child_process");
  const here = dirname(fileURLToPath(import.meta.url));
  const tmp = mkdtempSync(join(tmpdir(), "bruno-link-"));
  symlinkSync(here, join(tmp, "scripts"), "dir");
  const out = join(tmp, "out");
  const stdout = execFileSync(process.execPath, [
    join(tmp, "scripts", "generate-bruno.js"),
    "--manifest", join(here, "..", "references", "sample-manifest.json"),
    "--out", out,
  ], { encoding: "utf8" });
  assert.match(stdout, /wrote \d+ file\(s\)/);
  assert.ok(existsSync(join(out, "bruno.json")));
});

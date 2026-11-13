import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Optional token auth: the server is booted with BTL_TOKEN set, so
// every page and API route is gated until a login sets the cookie.
const PORT = 3220;
const BASE = `http://127.0.0.1:${PORT}`;
const TOKEN = "test-token-123";
const dir = mkdtempSync(join(tmpdir(), "btl-auth-test-"));
let proc: ReturnType<typeof Bun.spawn> | null = null;

async function login(token: string) {
  const res = await fetch(BASE + "/login", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token }).toString(),
    redirect: "manual",
  });
  return { status: res.status, cookie: res.headers.get("set-cookie") ?? "", body: await res.text() };
}

beforeAll(async () => {
  proc = Bun.spawn(["bun", "run", "server.ts"], {
    cwd: join(import.meta.dir, ".."),
    env: { ...process.env, PORT: String(PORT), DATA_FILE: join(dir, "store.json"), BTL_TOKEN: TOKEN },
    stdout: "ignore", stderr: "ignore",
  });
  for (let i = 0; i < 50; i++) {
    try { const r = await fetch(BASE + "/login"); if (r.ok) return; } catch { /* not up yet */ }
    await Bun.sleep(100);
  }
  throw new Error("server did not start");
});
afterAll(() => {
  proc?.kill();
  rmSync(dir, { recursive: true, force: true });
});

describe("token auth (BTL_TOKEN set)", () => {
  test("API and pages refuse unauthenticated access", async () => {
    const api = await fetch(BASE + "/api/state");
    expect(api.status).toBe(401);
    const page = await fetch(BASE + "/", { redirect: "manual" });
    expect(page.status).toBe(302);
    expect(page.headers.get("location")).toContain("/login");
  });

  test("the login form is open and a wrong token is refused generically", async () => {
    const form = await fetch(BASE + "/login");
    expect(form.status).toBe(200);
    expect(await form.text()).toContain("トークン");
    const bad = await login("wrong-token");
    expect(bad.status).toBe(401);
    expect(bad.body).toContain("トークンが違います");
    expect(bad.cookie).toBe("");
  });

  test("the right token sets an HttpOnly cookie that opens everything", async () => {
    const ok = await login(TOKEN);
    expect(ok.status).toBe(303);
    expect(ok.cookie).toContain("btl_auth=");
    expect(ok.cookie).toContain("HttpOnly");
    const pair = ok.cookie.split(";")[0];
    const st = await fetch(BASE + "/api/state", { headers: { cookie: pair } });
    expect(st.status).toBe(200);
    const page = await fetch(BASE + "/", { headers: { cookie: pair } });
    expect(page.status).toBe(200);
    // A forged cookie value does not pass.
    const forged = await fetch(BASE + "/api/state", { headers: { cookie: "btl_auth=deadbeef" } });
    expect(forged.status).toBe(401);
  });
});

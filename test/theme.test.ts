import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { themeOf } from "../src/i18n";
import { parseStoreImport } from "../src/validate";

// Theme setting (dark / light / system): stored server-side like the
// language, defaulting to "system"; validated on write and on import.
const PORT = 3223;
const BASE = `http://127.0.0.1:${PORT}`;
const dir = mkdtempSync(join(tmpdir(), "btl-theme-test-"));
const dataFile = join(dir, "store.json");
let proc: ReturnType<typeof Bun.spawn> | null = null;

async function boot() {
  proc = Bun.spawn(["bun", "run", "server.ts"], {
    cwd: join(import.meta.dir, ".."),
    env: { ...process.env, PORT: String(PORT), DATA_FILE: dataFile },
    stdout: "ignore", stderr: "ignore",
  });
  for (let i = 0; i < 50; i++) {
    try { const r = await fetch(BASE + "/api/state"); if (r.ok) return; } catch { /* not up yet */ }
    await Bun.sleep(100);
  }
  throw new Error("server did not start");
}
async function post(path: string, body: unknown) {
  const res = await fetch(BASE + path, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json().catch(() => ({})) as Record<string, unknown> };
}
async function getState() {
  const res = await fetch(BASE + "/api/state");
  return res.json() as Promise<Record<string, any>>;
}
afterAll(() => {
  proc?.kill();
  rmSync(dir, { recursive: true, force: true });
});

test("themeOf defaults to system", () => {
  expect(themeOf(null)).toBe("system");
  expect(themeOf({})).toBe("system");
  expect(themeOf({ theme: "light" })).toBe("light");
});

describe("theme setting (real server)", () => {
  test("default is system; a saved theme persists across a restart; invalid is 400", async () => {
    await boot();
    expect((await getState()).theme).toBe("system");
    expect((await post("/api/theme", { theme: "neon" })).status).toBe(400);
    expect((await post("/api/theme", { theme: "light" })).status).toBe(200);
    expect((await getState()).theme).toBe("light");
    proc?.kill(); proc = null;
    await Bun.sleep(150);
    await boot();
    expect((await getState()).theme).toBe("light");
    expect((await post("/api/theme", { theme: "dark" })).status).toBe(200);
    expect((await getState()).theme).toBe("dark");
  });

  test("import: theme is optional, carried when valid, refused when unknown", async () => {
    const minimal = { profile: null, pain: [], sessions: [], nextSessionId: 1, nextExerciseId: 1 };
    expect(parseStoreImport(structuredClone(minimal)).theme).toBeUndefined();
    expect(parseStoreImport({ ...structuredClone(minimal), theme: "dark" }).theme).toBe("dark");
    expect(() => parseStoreImport({ ...structuredClone(minimal), theme: "neon" })).toThrow();
  });
});

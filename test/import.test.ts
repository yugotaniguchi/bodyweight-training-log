import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Boots the real server on a scratch DATA_FILE and checks the data
// export / import endpoints and the PWA asset delivery (manifest,
// icons). Import is all-or-nothing: a bad file is a 400 and the stored
// data is left untouched.
const PORT = 3218;
const BASE = `http://127.0.0.1:${PORT}`;
const dir = mkdtempSync(join(tmpdir(), "btl-import-test-"));
let proc: ReturnType<typeof Bun.spawn> | null = null;

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

beforeAll(async () => {
  proc = Bun.spawn(["bun", "run", "server.ts"], {
    cwd: join(import.meta.dir, ".."),
    env: { ...process.env, PORT: String(PORT), DATA_FILE: join(dir, "store.json") },
    stdout: "ignore", stderr: "ignore",
  });
  for (let i = 0; i < 50; i++) {
    try { const r = await fetch(BASE + "/api/state"); if (r.ok) return; } catch { /* not up yet */ }
    await Bun.sleep(100);
  }
  throw new Error("server did not start");
});
afterAll(() => {
  proc?.kill();
  rmSync(dir, { recursive: true, force: true });
});

describe("export / import", () => {
  test("export downloads the whole store as JSON", async () => {
    await post("/api/profile", { age: 30, sex: "女性", heightCm: 160, weightKg: 55, note: "" });
    await post("/api/pain", { soreness: { "胸": 1 }, jointPain: {}, redFlags: [] });
    expect((await post("/api/session/generate", {})).status).toBe(200);
    const res = await fetch(BASE + "/api/export");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toContain("attachment");
    expect(res.headers.get("content-type")).toContain("application/json");
    const store = await res.json() as Record<string, any>;
    expect(store.profile.age).toBe(30);
    expect(Array.isArray(store.pain)).toBe(true);
    expect(store.sessions).toHaveLength(1);
    expect(typeof store.nextSessionId).toBe("number");
  });

  test("a valid export imports back and replaces the store", async () => {
    const store = await (await fetch(BASE + "/api/export")).json() as Record<string, any>;
    // Change the live data, then import the snapshot over it.
    await post("/api/profile", { age: 41, sex: "男性", heightCm: 180, weightKg: 80, note: "" });
    expect((await getState()).profile.age).toBe(41);
    const imp = await post("/api/import", store);
    expect(imp.status).toBe(200);
    const st = await getState();
    expect(st.profile.age).toBe(30);
    expect(st.sessions).toHaveLength(1);
  });

  test("invalid files are 400 and replace nothing", async () => {
    const good = await (await fetch(BASE + "/api/export")).json() as Record<string, any>;
    const before = await getState();
    const cases: unknown[] = [
      null, [], "x", 42,
      { ...good, sessions: undefined }, // missing key (dropped by JSON)
      { profile: null, pain: [], sessions: [] }, // missing counters
      { ...good, pain: [{ date: "2026/01/01", soreness: {}, jointPain: {}, redFlags: [] }] }, // bad date
      { ...good, pain: [{ date: "2026-01-01", soreness: { "胸": 9 }, jointPain: {}, redFlags: [] }] }, // pain level range
      { ...good, profile: { age: 3, sex: "", heightCm: 160, weightKg: 55, note: "" } }, // profile range
    ];
    const badSession = structuredClone(good);
    badSession.sessions[0].exercises[0].loggedSets = [-1];
    cases.push(badSession);
    const badRpe = structuredClone(good);
    badRpe.sessions[0].exercises[0].rpe = 7.3;
    cases.push(badRpe);
    for (const c of cases) {
      expect((await post("/api/import", c)).status).toBe(400);
    }
    const after = await getState();
    expect(after.profile.age).toBe(before.profile.age);
    expect(after.sessions).toHaveLength(before.sessions.length);
    expect(after.stats.totalVolume).toBe(before.stats.totalVolume);
  });
  test("a legacy profile (two note fields, free-text sex) imports merged and folded", async () => {
    const good = await (await fetch(BASE + "/api/export")).json() as Record<string, any>;
    const legacy = structuredClone(good);
    legacy.profile = { age: 33, sex: "その他", heightCm: 170, weightKg: 66, bodyFatNote: "体脂肪20%", habitNote: "週2回" };
    expect((await post("/api/import", legacy)).status).toBe(200);
    const st = await getState();
    expect(st.profile.note).toBe("体脂肪20%\n週2回");
    expect(st.profile.sex).toBe(""); // folded to 選択しない
    expect(st.profile.bodyFatNote).toBeUndefined();
    expect(st.profile.habitNote).toBeUndefined();
  });

  test("CSV export: BOM, Japanese headers, one row per exercise, RFC 4180 quoting", async () => {
    const st = await getState();
    const s = st.sessions[0];
    const ex = s.exercises[0];
    // A note containing a comma must come out quoted.
    expect((await post(`/api/session/${s.id}/exercise/${ex.id}`, { loggedSets: [10, 9], rpe: 8, completed: true, note: "効いた,気がする" })).status).toBe(200);
    const res = await fetch(BASE + "/api/export.csv");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");
    expect(res.headers.get("content-disposition")).toContain("bodyweight-training-log.csv");
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]); // UTF-8 BOM: Excel opens it without mojibake
    const text = new TextDecoder().decode(bytes);
    const lines = text.replace(/^\uFEFF/, "").split("\r\n").filter((l) => l !== "");
    expect(lines[0]).toBe("日付,ローテーション,タイトル,状態,種目,部位,バリエーション,目標セット,目標回数,単位,セット実績,合計,RPE,メモ");
    expect(lines).toHaveLength(1 + s.exercises.length);
    expect(lines[1]).toContain("10 / 9");
    expect(lines[1]).toContain(",19,8,"); // 合計 19, RPE 8
    expect(lines[1]).toContain('"効いた,気がする"');
  });
});

describe("PWA assets", () => {
  test("manifest is served as application/manifest+json with the app identity", async () => {
    const res = await fetch(BASE + "/manifest.webmanifest");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/manifest+json");
    const m = await res.json() as Record<string, any>;
    expect(m.name).toBe("自重トレーニング記録");
    expect(m.short_name).toBe("自重トレ");
    expect(m.display).toBe("standalone");
    expect(m.theme_color).toBe("#0f0f0f");
    expect(m.background_color).toBe("#0f0f0f");
    expect(m.icons.some((i: { sizes: string }) => i.sizes === "192x192")).toBe(true);
    expect(m.icons.some((i: { sizes: string }) => i.sizes === "512x512")).toBe(true);
  });

  test("icons are served as PNG", async () => {
    for (const p of ["/icon-192.png", "/icon-512.png", "/icon-maskable-512.png", "/apple-touch-icon.png"]) {
      const res = await fetch(BASE + p);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("image/png");
    }
  });

  test("index.html carries the PWA meta and icon links", async () => {
    const html = await (await fetch(BASE + "/")).text();
    expect(html).toContain('rel="manifest"');
    expect(html).toContain('name="theme-color" content="#0f0f0f"');
    expect(html).toContain('rel="apple-touch-icon"');
    expect(html).toContain("apple-mobile-web-app-capable");
  });
});

import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assessPain, personalAdjustment, painDurationGuidance, emptyStore, type PainEntry } from "../src/logic";
import { EXERCISES } from "../src/exercises";
import { validNote, validReps } from "../src/validate";

// UI language (ja / en): unit checks that the server-side text tables
// produce English wording without touching any decision, plus a real
// server boot (scratch DATA_FILE) for the language setting itself —
// default, switching, error wording, persistence across a restart,
// the login page language, and how imports treat the lang field.
const PORT = 3221;
const BASE = `http://127.0.0.1:${PORT}`;
const dir = mkdtempSync(join(tmpdir(), "btl-i18n-test-"));
const DATA = join(dir, "store.json");
let proc: ReturnType<typeof Bun.spawn> | null = null;

async function boot(extraEnv: Record<string, string> = {}) {
  // Spawn server.ts directly (not via `bun run`) so the spawned process
  // IS the server and kill() really stops it — restarts in this file
  // depend on the port being released.
  proc = Bun.spawn(["bun", "server.ts"], {
    cwd: join(import.meta.dir, ".."),
    env: { ...process.env, PORT: String(PORT), DATA_FILE: DATA, ...extraEnv },
    stdout: "ignore", stderr: "ignore",
  });
  // With a token set, /api/state answers 401 by design, so readiness is
  // probed on the open /login route instead.
  const probe = extraEnv.BTL_TOKEN ? "/login" : "/api/state";
  for (let i = 0; i < 40; i++) {
    try { const r = await fetch(BASE + probe); if (r.ok) return; } catch { /* not up yet */ }
    await Bun.sleep(100);
  }
  throw new Error("server did not start");
}
async function stop() {
  proc?.kill();
  proc = null;
  // Wait until the port is really released before any reboot.
  for (let i = 0; i < 30; i++) {
    try { await fetch(BASE + "/login"); } catch { return; }
    await Bun.sleep(100);
  }
}
async function post(path: string, body: unknown) {
  const res = await fetch(BASE + path, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json().catch(() => ({})) as Record<string, any> };
}
async function getState() {
  const res = await fetch(BASE + "/api/state");
  return res.json() as Promise<Record<string, any>>;
}

afterAll(async () => {
  await stop();
  rmSync(dir, { recursive: true, force: true });
});

describe("server text tables (unit)", () => {
  test("validators answer in English when asked", () => {
    expect(() => validReps(-1, "en")).toThrow("integer between 0 and 999");
    expect(() => validReps(-1)).toThrow("0〜999");
    expect(() => validNote("a".repeat(201), "en")).toThrow("200 characters");
  });

  test("assessment reasons are English in en, Japanese by default", () => {
    const entry: PainEntry = { date: "2026-01-01", soreness: { "胸": 3 }, jointPain: {}, redFlags: ["numbness"] };
    const en = assessPain(entry, "en");
    expect(en.care).toBe(true);
    expect(en.careReasons[0]).toContain("Warning sign");
    expect(en.careReasons[0]).toContain("Numbness or weakness");
    expect(en.parts[0].reasons[0]).toContain("Soreness level 3");
    const ja = assessPain(entry);
    expect(ja.careReasons[0]).toContain("警告サイン");
    expect(ja.parts[0].reasons[0]).toContain("筋肉痛レベル3");
  });

  test("duration guidance and progression notes follow the language", () => {
    const store = emptyStore();
    const pain: PainEntry[] = [];
    for (let d = 1; d <= 5; d++) {
      pain.push({ date: `2026-01-0${d}`, soreness: { "胸": 1 }, jointPain: {}, redFlags: [] });
    }
    store.pain = pain;
    const gEn = painDurationGuidance(store, "en");
    expect(gEn).toHaveLength(1);
    expect(gEn[0].message).toContain("Soreness in the Chest has lasted 5 days");
    const gJa = painDurationGuidance(store);
    expect(gJa[0].message).toContain("筋肉痛（胸）が5日続いています");
    expect(personalAdjustment(EXERCISES.pushup, null, true, "en").notes[0]).toContain("First time");
    expect(personalAdjustment(EXERCISES.pushup, null, true).notes[0]).toContain("初回");
  });
});

describe("language setting (real server)", () => {
  test("default language is Japanese, in state and catalog", async () => {
    await boot();
    const st = await getState();
    expect(st.lang).toBe("ja");
    expect(st.catalog.redFlags[0].label).toBe("しびれ・脱力がある");
    expect(st.catalog.rotations[0].title).toBe("押す + 脚");
  });

  test("switching to English localizes state, catalog, errors and generation", async () => {
    const sw = await post("/api/lang", { lang: "en" });
    expect(sw.status).toBe(200);
    expect(sw.data.lang).toBe("en");
    const st = await getState();
    expect(st.catalog.redFlags[0].label).toBe("Numbness or weakness");
    expect(st.catalog.rotations[0].title).toBe("Push + Legs");

    // Validation errors come back in English now.
    const bad = await post("/api/pain", { soreness: { "胸下部": 9 }, jointPain: {}, redFlags: [] });
    expect(bad.status).toBe(400);
    expect(String(bad.data.error)).toContain("between 0 and 5");

    // Assessment reasons (computed per request) are English.
    const flagged = await post("/api/pain", { soreness: {}, jointPain: {}, redFlags: ["chestPain"] });
    expect(flagged.status).toBe(200);
    expect(flagged.data.assessment.careReasons[0]).toContain("Warning sign");
    const blocked = await post("/api/session/generate", {});
    expect(blocked.status).toBe(403);
    expect(String(blocked.data.error)).toContain("Cannot start");

    // A generated session's notes are written in the current language.
    await post("/api/pain", { soreness: { "胸下部": 2 }, jointPain: {}, redFlags: [] });
    const gen = await post("/api/session/generate", {});
    expect(gen.status).toBe(200);
    const notes = (gen.data.todaySession.progressionNotes as string[]).join("\n");
    expect(notes).toContain("First time");
    expect(notes).toContain("pain coefficient");
    const again = await post("/api/session/generate", {});
    expect(again.status).toBe(409);
    expect(String(again.data.error)).toContain("already been created");
  });

  test("an unknown language is refused and changes nothing", async () => {
    const bad = await post("/api/lang", { lang: "fr" });
    expect(bad.status).toBe(400);
    expect((await getState()).lang).toBe("en");
  });

  test("the language survives a server restart", async () => {
    await stop();
    await boot();
    expect((await getState()).lang).toBe("en");
  });

  test("the login page follows the saved language", async () => {
    await stop();
    await boot({ BTL_TOKEN: "secret-token" });
    const res = await fetch(BASE + "/login");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Enter your token to continue.");
    expect(html).toContain("Log in");
    await stop();
    await boot();
  });

  test("imports: lang is optional, carried when valid, refused when unknown", async () => {
    // The live store currently has lang "en" (and one session).
    const exported = await (await fetch(BASE + "/api/export")).json() as Record<string, any>;
    expect(exported.lang).toBe("en");

    // An old-format file without lang imports fine and resets to Japanese.
    const noLang = structuredClone(exported);
    delete noLang.lang;
    await post("/api/lang", { lang: "en" }); // make sure we start from en
    const imp1 = await post("/api/import", noLang);
    expect(imp1.status).toBe(200);
    expect((await getState()).lang).toBe("ja");

    // A file carrying lang "en" restores English.
    const imp2 = await post("/api/import", exported);
    expect(imp2.status).toBe(200);
    expect((await getState()).lang).toBe("en");

    // An unknown lang value is a 400 and replaces nothing.
    const badFile = structuredClone(exported);
    badFile.lang = "fr";
    expect((await post("/api/import", badFile)).status).toBe(400);
    expect((await getState()).lang).toBe("en");
  });
});

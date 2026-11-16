import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Boots the real server as a subprocess on a scratch DATA_FILE and checks
// that invalid writes are refused with HTTP 400 (and store nothing), while
// valid writes still succeed.
const PORT = 3217;
const BASE = `http://127.0.0.1:${PORT}`;
const dir = mkdtempSync(join(tmpdir(), "btl-api-test-"));
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

describe("API input validation", () => {
  test("pain levels: out-of-range / decimal / negative are 400, valid is 200", async () => {
    expect((await post("/api/pain", { soreness: { "胸下部": 6 }, jointPain: {}, redFlags: [] })).status).toBe(400);
    expect((await post("/api/pain", { soreness: { "胸下部": 1.5 }, jointPain: {}, redFlags: [] })).status).toBe(400);
    const neg = await post("/api/pain", { soreness: {}, jointPain: { "膝": -1 }, redFlags: [] });
    expect(neg.status).toBe(400);
    expect(String(neg.data.error)).toContain("0〜5");
    expect((await post("/api/pain", { soreness: { "胸下部": 2 }, jointPain: {}, redFlags: [] })).status).toBe(200);
  });

  test("profile: ranges enforced and required fields cannot be empty", async () => {
    const base = { age: 28, sex: "男性", heightCm: 171, weightKg: 64, note: "" };
    expect((await post("/api/profile", { ...base, age: 9 })).status).toBe(400);
    expect((await post("/api/profile", { ...base, age: "" })).status).toBe(400);
    expect((await post("/api/profile", { ...base, heightCm: 251 })).status).toBe(400);
    expect((await post("/api/profile", { ...base, weightKg: 10 })).status).toBe(400);
    expect((await post("/api/profile", base)).status).toBe(200);
    const st = await getState();
    expect(st.profile.age).toBe(28);
    expect(st.profile.weightKg).toBe(64);
  });

  test("profile: sex must be a select option; the merged note is capped at 500", async () => {
    const base = { age: 28, sex: "男性", heightCm: 171, weightKg: 64, note: "" };
    expect((await post("/api/profile", { ...base, sex: "その他" })).status).toBe(400);
    expect((await post("/api/profile", { ...base, sex: "" })).status).toBe(200); // 選択しない
    expect((await post("/api/profile", { ...base, note: "x".repeat(501) })).status).toBe(400);
    expect((await post("/api/profile", { ...base, note: "x".repeat(500) })).status).toBe(200);
  });

  test("exercise update: bad reps / RPE / long note are 400 and store nothing", async () => {
    expect((await post("/api/session/generate", {})).status).toBe(200);
    const st = await getState();
    const s = st.todaySession;
    const ex = s.exercises[0];
    const url = `/api/session/${s.id}/exercise/${ex.id}`;
    const good = { loggedSets: [5, 5], rpe: 8.5, completed: true, note: "ok" };
    expect((await post(url, { ...good, loggedSets: [-1, 0] })).status).toBe(400); // negative reps
    expect((await post(url, { ...good, loggedSets: [1.5, 0] })).status).toBe(400); // decimal reps
    expect((await post(url, { ...good, loggedSets: [1000, 0] })).status).toBe(400); // reps too large
    expect((await post(url, { ...good, loggedSets: ["8", 0] })).status).toBe(400); // string reps
    expect((await post(url, { ...good, rpe: 5 })).status).toBe(400); // RPE below range
    expect((await post(url, { ...good, rpe: 7.3 })).status).toBe(400); // RPE off-step
    const longNote = await post(url, { ...good, note: "あ".repeat(201) });
    expect(longNote.status).toBe(400); // note too long
    expect(String(longNote.data.error)).toContain("200文字");
    expect((await post(url, good)).status).toBe(200);
    const st2 = await getState();
    const saved = st2.todaySession.exercises.find((e: { id: number }) => e.id === ex.id);
    expect(saved.loggedSets).toEqual([5, 5]);
    expect(saved.rpe).toBe(8.5);
    expect(saved.note).toBe("ok");
  });

  test("history record edit rejects invalid values too", async () => {
    const st = await getState();
    const s = st.todaySession;
    const ex = s.exercises[1] ?? s.exercises[0];
    const bad = await post(`/api/session/${s.id}/record`, {
      exercises: [{ exerciseId: ex.id, loggedSets: [3, -2], rpe: null, completed: false, note: "" }],
    });
    expect(bad.status).toBe(400);
    const badRpe = await post(`/api/session/${s.id}/record`, {
      exercises: [{ exerciseId: ex.id, loggedSets: [3, 3], rpe: 12, completed: false, note: "" }],
    });
    expect(badRpe.status).toBe(400);
  });
});

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Boots the real server on a scratch DATA_FILE and checks, end to end:
// - item 1: re-saving the condition check rebuilds the planned session
//   (unrecorded exercises follow the new assessment, recorded ones are
//   fixed, a completed session is untouched);
// - item 6: left/right pair records are stored per side, validated per
//   side, and summed into the session total.
const PORT = 3221;
const BASE = `http://127.0.0.1:${PORT}`;
const dir = mkdtempSync(join(tmpdir(), "btl-refresh-test-"));
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

describe("condition re-save rebuilds the planned session", () => {
  test("pair records validate per side and sum into the total", async () => {
    expect((await post("/api/pain", { soreness: {}, jointPain: {}, redFlags: [] })).status).toBe(200);
    expect((await post("/api/session/generate", {})).status).toBe(200);
    const st = await getState();
    expect(st.catalog.unilateral).toEqual(expect.arrayContaining(["rdl", "reverseLunge"]));
    const s = st.todaySession;
    const ex = s.exercises.find((e: { baseId: string }) => e.baseId === "pushup"); // pairs are accepted for any exercise record
    const url = `/api/session/${s.id}/exercise/${ex.id}`;
    expect((await post(url, { loggedSets: [{ l: -1, r: 5 }, 0, 0] })).status).toBe(400);
    expect((await post(url, { loggedSets: [{ l: "5", r: 5 }, 0, 0] })).status).toBe(400);
    expect((await post(url, { loggedSets: [{ l: 11, r: 10 }, 0, 0], rpe: 8, completed: true, note: "" })).status).toBe(200);
    const st2 = await getState();
    const saved = st2.todaySession.exercises.find((e: { id: number }) => e.id === ex.id);
    expect(saved.loggedSets[0]).toEqual({ l: 11, r: 10 });
    expect(st2.todaySession.totalVolume).toBe(21);
  });

  test("excluding a part drops its unrecorded exercise; the recorded one stays; clearing restores", async () => {
    // 肩 level 5 makes pike's pain coefficient 0 (unrecorded, so it
    // drops out); pushup is already recorded and stays.
    expect((await post("/api/pain", { soreness: { "肩前部": 5 }, jointPain: {}, redFlags: [] })).status).toBe(200);
    const st = await getState();
    const ids = st.activeSession.exercises.map((e: { baseId: string }) => e.baseId);
    expect(ids).not.toContain("pike");
    expect(ids).toContain("pushup");
    const pushup = st.activeSession.exercises.find((e: { baseId: string }) => e.baseId === "pushup");
    expect(pushup.loggedSets[0]).toEqual({ l: 11, r: 10 });
    // Pain cleared: the excluded exercise is planned again.
    expect((await post("/api/pain", { soreness: {}, jointPain: {}, redFlags: [] })).status).toBe(200);
    const st2 = await getState();
    expect(st2.activeSession.exercises.map((e: { baseId: string }) => e.baseId)).toContain("pike");
  });

  test("a completed session is not rebuilt by later pain saves", async () => {
    const st = await getState();
    const s = st.activeSession;
    expect((await post(`/api/session/${s.id}/complete`, {})).status).toBe(200);
    const before = (await getState()).sessions.find((x: { id: number }) => x.id === s.id);
    expect((await post("/api/pain", { soreness: { "肩前部": 3 }, jointPain: {}, redFlags: [] })).status).toBe(200);
    const after = (await getState()).sessions.find((x: { id: number }) => x.id === s.id);
    expect(after.exercises.map((e: { baseId: string }) => e.baseId))
      .toEqual(before.exercises.map((e: { baseId: string }) => e.baseId));
    expect(after.status).toBe("completed");
  });
});

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// End-to-end scenario against the real server over HTTP: profile save
// (with its change history) → condition save → session generation →
// exercise record → completion → the state shows it in the history.
// Then the data-protection behaviour: backup generations on disk, and
// recovery of a corrupted store file from the newest backup, with the
// recovery recorded in the server log.
// (Browser automation such as Playwright is intentionally not used:
// the project is zero-dependency, so flows are verified at API level.)
const PORT = 3219;
const BASE = `http://127.0.0.1:${PORT}`;
const dir = mkdtempSync(join(tmpdir(), "btl-scenario-test-"));
const DATA = join(dir, "store.json");
let proc: ReturnType<typeof Bun.spawn> | null = null;

async function post(path: string, body: unknown) {
  const res = await fetch(BASE + path, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json().catch(() => ({})) as Record<string, unknown> };
}
async function getState() {
  const res = await fetch(BASE + "/api/state");
  expect(res.status).toBe(200);
  return res.json() as Promise<Record<string, any>>;
}

beforeAll(async () => {
  proc = Bun.spawn(["bun", "run", "server.ts"], {
    cwd: join(import.meta.dir, ".."),
    env: { ...process.env, PORT: String(PORT), DATA_FILE: DATA },
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

describe("main flow scenario", () => {
  test("profile → condition → generate → record → complete → history", async () => {
    // 1. Profile save (first save is recorded in the profile history).
    const prof = { age: 28, sex: "男性", heightCm: 171, weightKg: 64, note: "" };
    expect((await post("/api/profile", prof)).status).toBe(200);
    let st = await getState();
    expect(st.profile.age).toBe(28);
    expect(st.profileHistory).toHaveLength(1);
    expect(st.profileHistory[0].changes.some((c: { field: string }) => c.field === "weightKg")).toBe(true);

    // 2. A second save with one field changed records just that diff.
    expect((await post("/api/profile", { ...prof, weightKg: 63 })).status).toBe(200);
    st = await getState();
    expect(st.profileHistory).toHaveLength(2);
    const latest = st.profileHistory[0]; // newest first
    expect(latest.changes).toHaveLength(1);
    expect(latest.changes[0]).toMatchObject({ field: "weightKg", from: 64, to: 63 });

    // 3. Condition (pain) save.
    expect((await post("/api/pain", { soreness: { "胸": 1 }, jointPain: {}, redFlags: [] })).status).toBe(200);

    // 4. Session generation: rotation A, planned, and it is the active session.
    expect((await post("/api/session/generate", {})).status).toBe(200);
    st = await getState();
    expect(st.todaySession.rotation).toBe("A");
    expect(st.todaySession.status).toBe("planned");
    expect(st.activeSession.id).toBe(st.todaySession.id);

    // 5. Record the first exercise.
    const s = st.todaySession;
    const ex = s.exercises[0];
    const rec = await post(`/api/session/${s.id}/exercise/${ex.id}`, {
      loggedSets: ex.loggedSets.map(() => 5), rpe: 8, completed: true, note: "",
    });
    expect(rec.status).toBe(200);

    // 6. Complete the session; it now shows in the history and stats.
    expect((await post(`/api/session/${s.id}/complete`, {})).status).toBe(200);
    st = await getState();
    expect(st.sessions).toHaveLength(1);
    expect(st.sessions[0].status).toBe("completed");
    expect(st.sessions[0].totalVolume).toBeGreaterThan(0);
    expect(st.stats.totalCompleted).toBe(1);
  });

  test("saves leave backup generations next to the store file", () => {
    const bak = join(dir, "store.backup.1.json");
    expect(existsSync(bak)).toBe(true);
    const parsed = JSON.parse(readFileSync(bak, "utf8")) as Record<string, any>;
    expect(parsed.profile.age).toBe(28);
    expect(Array.isArray(parsed.sessions)).toBe(true);
  });

  test("a corrupted store file is recovered from the newest backup and logged", async () => {
    writeFileSync(DATA, "{ this is not json");
    const st = await getState(); // the server must recover, not crash or empty out
    expect(st.profile.age).toBe(28);
    expect(st.profile.weightKg).toBe(63);
    expect(st.sessions).toHaveLength(1);
    // The main file was restored to valid JSON.
    const restored = JSON.parse(readFileSync(DATA, "utf8")) as Record<string, any>;
    expect(restored.profile.age).toBe(28);
    // …and the recovery was written to the server log.
    const log = readFileSync(join(dir, "server.log"), "utf8");
    expect(log).toContain("[recovery]");
    expect(log).toContain("[start]");
  });
});

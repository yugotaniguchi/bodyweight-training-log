import { describe, expect, test } from "bun:test";
import { EXERCISES } from "../src/exercises";
import {
  emptyStore, generateSession, personalAdjustment, refreshPlannedSession, sessionTotal,
  type PainEntry, type Session, type SessionExercise, type Store,
} from "../src/logic";
import { parseStoreImport } from "../src/validate";

// Re-saving the condition check rebuilds the day's planned session
// around what is already recorded, under the load planner.
const gen = (): { store: Store; s: Session } => {
  const store = emptyStore();
  const s = generateSession(store, "2026-01-01", null);
  store.sessions.push(s);
  return { store, s };
};
const entry = (over: Partial<PainEntry>): PainEntry => ({
  date: "2026-01-01", soreness: {}, jointPain: {}, redFlags: [], ...over,
});
const byBase = (s: Session, baseId: string) => s.exercises.find((e) => e.baseId === baseId);

describe("refreshPlannedSession", () => {
  test("a newly pained part lowers the unrecorded target; other parts are unchanged", () => {
    const { store, s } = gen();
    const before = byBase(s, "pushup")!.targetReps;
    const out = refreshPlannedSession(store, s, entry({ soreness: { "胸下部": 2 } }));
    expect(byBase(out, "pushup")!.targetReps).toBeLessThan(before);
    expect(byBase(out, "squat")!.targetReps).toBe(byBase(s, "squat")!.targetReps);
    expect(out.progressionNotes.join("")).toContain("痛み係数");
    expect(out.id).toBe(s.id); expect(out.date).toBe(s.date); expect(out.rotation).toBe(s.rotation);
  });

  test("a part at pain level 5 drops out, and returns when the pain clears", () => {
    const { store, s } = gen();
    const out = refreshPlannedSession(store, s, entry({ soreness: { "肩前部": 5 } }));
    expect(out.exercises.map((e) => e.baseId)).not.toContain("pike");
    expect(out.exercises.map((e) => e.baseId)).toContain("pushup");
    expect(out.title).toContain("（代替）");
    const back = refreshPlannedSession(store, out, null);
    expect(back.exercises.map((e) => e.baseId)).toContain("pike");
  });

  test("recorded exercises are fixed: kept verbatim even when their part's coefficient is 0", () => {
    const { store, s } = gen();
    const pushup = byBase(s, "pushup")!;
    pushup.loggedSets = [5, 5, 0]; pushup.rpe = 8; pushup.completed = true;
    const targetBefore = pushup.targetReps;
    const out = refreshPlannedSession(store, s, entry({ soreness: { "胸下部": 5 } }));
    const kept = byBase(out, "pushup")!;
    expect(kept).toBeDefined();
    expect(kept.loggedSets).toEqual([5, 5, 0]);
    expect(kept.rpe).toBe(8);
    expect(kept.targetReps).toBe(targetBefore); // not even reduced
    expect(out.exercises.filter((e) => e.baseId === "pushup")).toHaveLength(1); // never duplicated
  });

  test("a note-only record also counts as recorded", () => {
    const { store, s } = gen();
    byBase(s, "squat")!.note = "左がきつい";
    const out = refreshPlannedSession(store, s, entry({ soreness: { "大腿四頭筋": 5 } }));
    expect(byBase(out, "squat")!.note).toBe("左がきつい");
  });

  test("warning sign strips every unrecorded exercise and leaves the reason", () => {
    const { store, s } = gen();
    byBase(s, "pushup")!.loggedSets = [8, 8, 8];
    const out = refreshPlannedSession(store, s, entry({ redFlags: ["numbness"] }));
    expect(out.exercises.map((e) => e.baseId)).toEqual(["pushup"]);
    expect(out.progressionNotes.join("")).toContain("警告サイン");
  });

  test("full rest strips unrecorded exercises too", () => {
    const { store, s } = gen();
    const out = refreshPlannedSession(store, s, entry({ soreness: { "胸下部": 4, "背中上部": 5 } }));
    expect(out.exercises).toHaveLength(0);
    expect(out.progressionNotes.length).toBeGreaterThan(0);
  });

  test("a completed session is never touched", () => {
    const { store, s } = gen();
    s.status = "completed";
    const out = refreshPlannedSession(store, s, entry({ soreness: { "胸下部": 3 } }));
    expect(out).toBe(s);
  });
});

// Left/right pairs for unilateral exercises.
const uniPrev = (loggedSets: SessionExercise["loggedSets"]): SessionExercise => ({
  id: 1, baseId: "rdl", name: "シングルレッグRDL", muscleGroup: "脚（後ろ）・お尻", painPart: "ハムストリング",
  variation: "シングルレッグRDL（支えあり）", ladderIndex: 1, targetSets: 2, targetReps: 8, targetUnit: "回",
  cue: "", loggedSets, rpe: 6, completed: true, note: "",
});

describe("unilateral pairs", () => {
  test("the flagged exercises are rep-based only", () => {
    const flagged = Object.values(EXERCISES).filter((e) => e.unilateral);
    expect(flagged.map((e) => e.baseId).sort()).toEqual(["pistolSquat", "rdl", "reverseLunge", "sideLyingAbduction", "stepUp"]);
    for (const e of flagged) expect(e.unit).toBe("回");
  });

  test("session total sums both sides", () => {
    const s: Session = {
      id: 1, date: "2026-01-01", rotation: "B", title: "", status: "completed", intro: false,
      focusNote: "", progressionNotes: [], totalVolume: 0,
      exercises: [{ ...uniPrev([{ l: 11, r: 10 }, 5]), loggedSets: [{ l: 11, r: 10 }, 5] }],
    };
    expect(sessionTotal(s)).toBe(26);
  });

  test("achievement is judged on the weaker side", () => {
    // Both sides at target with an easy RPE: a rep is priced cheaper.
    const even = personalAdjustment(EXERCISES.rdl, uniPrev([{ l: 8, r: 8 }, { l: 8, r: 8 }]), false);
    expect(even.repFactor).toBe(0.9);
    // A lagging right side (2 of 8) must not be masked by the left:
    // achievement collapses, so no cheap-rep pricing applies.
    const uneven = personalAdjustment(EXERCISES.rdl, uniPrev([{ l: 8, r: 2 }, { l: 8, r: 2 }]), false);
    expect(uneven.repFactor).toBe(1);
  });

  test("import accepts pairs and plain numbers, refuses a broken pair", () => {
    const base = {
      profile: null, pain: [], nextSessionId: 2, nextExerciseId: 2, profileHistory: [],
      sessions: [{
        id: 1, date: "2026-01-01", rotation: "B", title: "x", status: "completed", intro: false,
        focusNote: "", progressionNotes: [],
        exercises: [{
          id: 1, baseId: "rdl", name: "シングルレッグRDL", muscleGroup: "脚（後ろ）・お尻", painPart: "ハムストリング",
          variation: "v", ladderIndex: 1, targetSets: 2, targetReps: 8, targetUnit: "回", cue: "",
          loggedSets: [{ l: 11, r: 10 }, 7], rpe: 8, completed: true, note: "",
        }],
      }],
    };
    const ok = parseStoreImport(structuredClone(base));
    expect(ok.sessions[0].exercises[0].loggedSets).toEqual([{ l: 11, r: 10 }, 7]);
    expect(ok.sessions[0].totalVolume).toBe(28);
    const bad = structuredClone(base);
    (bad.sessions[0].exercises[0].loggedSets as unknown[])[0] = { l: -1, r: 10 };
    expect(() => parseStoreImport(bad)).toThrow();
    const bad2 = structuredClone(base);
    (bad2.sessions[0].exercises[0].loggedSets as unknown[])[0] = { l: "11", r: 10 };
    expect(() => parseStoreImport(bad2)).toThrow();
  });
});

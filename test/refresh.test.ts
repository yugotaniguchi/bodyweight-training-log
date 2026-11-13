import { describe, expect, test } from "bun:test";
import { EXERCISES } from "../src/exercises";
import {
  assessPain, decideNext, emptyStore, generateSession, refreshPlannedSession, sessionTotal,
  type Session, type SessionExercise, type Store,
} from "../src/logic";
import { parseStoreImport } from "../src/validate";

// Item 1: re-saving the condition check rebuilds the day's planned
// session around what is already recorded.
const gen = (): { store: Store; s: Session } => {
  const store = emptyStore();
  const s = generateSession(store, "2026-01-01", assessPain(null));
  store.sessions.push(s);
  return { store, s };
};
const byBase = (s: Session, baseId: string) => s.exercises.find((e) => e.baseId === baseId);

describe("refreshPlannedSession", () => {
  test("a newly reduced part lowers the unrecorded target", () => {
    const { store, s } = gen();
    const before = byBase(s, "pushup")!.targetReps;
    const out = refreshPlannedSession(store, s, assessPain({ date: "2026-01-01", soreness: { "胸": 2 }, jointPain: {}, redFlags: [] }));
    expect(byBase(out, "pushup")!.targetReps).toBe(Math.floor(before * 0.8));
    expect(byBase(out, "squat")!.targetReps).toBe(byBase(s, "squat")!.targetReps);
    expect(out.id).toBe(s.id); expect(out.date).toBe(s.date); expect(out.rotation).toBe(s.rotation);
  });

  test("a newly excluded part drops out, and returns when the pain clears", () => {
    const { store, s } = gen();
    const out = refreshPlannedSession(store, s, assessPain({ date: "2026-01-01", soreness: { "肩": 3 }, jointPain: {}, redFlags: [] }));
    expect(out.exercises.map((e) => e.baseId)).not.toContain("pike");
    expect(out.exercises.map((e) => e.baseId)).toContain("pushup");
    expect(out.title).toContain("（代替）");
    const back = refreshPlannedSession(store, out, assessPain(null));
    expect(back.exercises.map((e) => e.baseId)).toContain("pike");
  });

  test("recorded exercises are fixed: kept verbatim even when their part is excluded or reduced", () => {
    const { store, s } = gen();
    const pushup = byBase(s, "pushup")!;
    pushup.loggedSets = [5, 5, 0]; pushup.rpe = 8; pushup.completed = true;
    const targetBefore = pushup.targetReps;
    const out = refreshPlannedSession(store, s, assessPain({ date: "2026-01-01", soreness: { "胸": 3 }, jointPain: {}, redFlags: [] }));
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
    const out = refreshPlannedSession(store, s, assessPain({ date: "2026-01-01", soreness: { "脚（前）": 3 }, jointPain: {}, redFlags: [] }));
    expect(byBase(out, "squat")!.note).toBe("左がきつい");
  });

  test("warning sign strips every unrecorded exercise and leaves the reason", () => {
    const { store, s } = gen();
    byBase(s, "pushup")!.loggedSets = [8, 8, 8];
    const out = refreshPlannedSession(store, s, assessPain({ date: "2026-01-01", soreness: {}, jointPain: {}, redFlags: ["numbness"] }));
    expect(out.exercises.map((e) => e.baseId)).toEqual(["pushup"]);
    expect(out.progressionNotes.join("")).toContain("警告サイン");
  });

  test("full rest strips unrecorded exercises too", () => {
    const { store, s } = gen();
    const out = refreshPlannedSession(store, s, assessPain({ date: "2026-01-01", soreness: { "胸": 4, "背中": 5 }, jointPain: {}, redFlags: [] }));
    expect(out.exercises).toHaveLength(0);
    expect(out.progressionNotes.length).toBeGreaterThan(0);
  });

  test("a completed session is never touched", () => {
    const { store, s } = gen();
    s.status = "completed";
    const out = refreshPlannedSession(store, s, assessPain({ date: "2026-01-01", soreness: { "胸": 3 }, jointPain: {}, redFlags: [] }));
    expect(out).toBe(s);
  });
});

// Item 6: left/right pairs for unilateral exercises.
const uniPrev = (loggedSets: SessionExercise["loggedSets"]): SessionExercise => ({
  id: 1, baseId: "rdl", name: "シングルレッグRDL", muscleGroup: "脚（後ろ）・お尻", painPart: "脚（後ろ）・お尻",
  variation: "シングルレッグRDL（支えあり）", ladderIndex: 1, targetSets: 2, targetReps: 8, targetUnit: "回",
  cue: "", loggedSets, rpe: 6, completed: true, note: "",
});

describe("unilateral pairs", () => {
  test("the flagged exercises are rep-based only", () => {
    const flagged = Object.values(EXERCISES).filter((e) => e.unilateral);
    expect(flagged.map((e) => e.baseId).sort()).toEqual(["rdl", "reverseLunge"]);
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
    // Both sides at target with an easy RPE: the ladder steps up.
    const even = decideNext(EXERCISES.rdl, uniPrev([{ l: 8, r: 8 }, { l: 8, r: 8 }]), false);
    expect(even.ladderIndex).toBe(2);
    // A lagging right side (2 of 8) must not be masked by the left:
    // no ladder-up; the plain mid-RPE step applies instead.
    const uneven = decideNext(EXERCISES.rdl, uniPrev([{ l: 8, r: 2 }, { l: 8, r: 2 }]), false);
    expect(uneven.ladderIndex).toBe(1);
    expect(uneven.targetReps).toBe(9);
  });

  test("import accepts pairs and plain numbers, refuses a broken pair", () => {
    const base = {
      profile: null, pain: [], nextSessionId: 2, nextExerciseId: 2, profileHistory: [],
      sessions: [{
        id: 1, date: "2026-01-01", rotation: "B", title: "x", status: "completed", intro: false,
        focusNote: "", progressionNotes: [],
        exercises: [{
          id: 1, baseId: "rdl", name: "シングルレッグRDL", muscleGroup: "脚（後ろ）・お尻", painPart: "脚（後ろ）・お尻",
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

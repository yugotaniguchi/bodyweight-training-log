import { describe, expect, test } from "bun:test";
import { EXERCISES } from "../src/exercises";
import { assessPain, decideNext, generateSession, emptyStore, type SessionExercise } from "../src/logic";

const prev = (over: Partial<SessionExercise>): SessionExercise => ({
  id: 1, baseId: "pushup", name: "プッシュアップ", muscleGroup: "胸・三頭", painPart: "胸",
  variation: "膝つきプッシュアップ", ladderIndex: 1, targetSets: 3, targetReps: 8, targetUnit: "回",
  cue: "", loggedSets: [8, 8, 8], rpe: 8, completed: true, note: "", ...over,
});

describe("assessPain", () => {
  test("red flag blocks as care", () => {
    const a = assessPain({ date: "2026-01-01", soreness: {}, jointPain: {}, redFlags: ["numbness"] });
    expect(a.care).toBe(true);
  });
  test("level2 reduces, level3 excludes", () => {
    const a = assessPain({ date: "2026-01-01", soreness: { "胸": 2, "背中": 3 }, jointPain: { "腰": 2 } });
    expect(a.reducedParts).toContain("胸"); expect(a.excludedParts).toContain("背中"); expect(a.rest).toBe(false);
  });
  test("full rest only at 4+ in 2+ parts", () => {
    const a = assessPain({ date: "2026-01-01", soreness: { "胸": 4, "背中": 5 }, jointPain: {} });
    expect(a.rest).toBe(true);
    const b = assessPain({ date: "2026-01-01", soreness: { "胸": 4 }, jointPain: {} });
    expect(b.rest).toBe(false);
  });
});

describe("decideNext", () => {
  test("all-zero record switches to easier variation", () => {
    const d = decideNext(EXERCISES.pushup, prev({ loggedSets: [0, 0, 0], rpe: 10 }), false);
    expect(d.ladderIndex).toBe(0);
    expect(d.notes.join("")).toContain("できない種目の切り替え");
  });
  test("per-exercise memo 'できない' also switches, memo for other exercises does not leak", () => {
    const d = decideNext(EXERCISES.pike, prev({ baseId: "pike", ladderIndex: 1, note: "できない" }), false);
    expect(d.ladderIndex).toBe(0);
    const other = decideNext(EXERCISES.squat, prev({ baseId: "squat", note: "" }), false);
    expect(other.notes.join("")).not.toContain("できない");
  });
  test("low RPE + full achievement steps the ladder up", () => {
    const d = decideNext(EXERCISES.pushup, prev({ rpe: 6, loggedSets: [8, 8, 8] }), false);
    expect(d.ladderIndex).toBe(2);
  });
  test("high RPE + low achievement steps down / reduces", () => {
    const d = decideNext(EXERCISES.pushup, prev({ rpe: 10, loggedSets: [2, 2, 2] }), false);
    expect(d.ladderIndex).toBe(0);
  });
  test("timed exercise adjusts by percentage, rounded to 5s", () => {
    const d = decideNext(EXERCISES.plank, prev({ baseId: "plank", targetUnit: "秒", targetReps: 40, targetSets: 2, loggedSets: [40, 40], rpe: 8 }), false);
    expect(d.targetReps).toBe(45); // +10% -> 44 -> round to 45
  });
  test("memo takes priority over RPE", () => {
    const d = decideNext(EXERCISES.pushup, prev({ rpe: 6, note: "ちょうどいい" }), false);
    expect(d.targetReps).toBe(8);
  });
});

test("knee joint pain level 3 excludes knee-loading exercises from the menu", () => {
  const store = emptyStore();
  const a = assessPain({ date: "2026-01-01", soreness: {}, jointPain: { "膝": 3 } });
  const s = generateSession(store, "2026-01-01", a);
  expect(s.exercises.map((e) => e.baseId)).not.toContain("squat");
  expect(s.exercises.map((e) => e.baseId)).toContain("pushup");
});

test("empty store generates an intro session A without personal data", () => {
  const store = emptyStore();
  const s = generateSession(store, "2026-01-01", assessPain(null));
  expect(s.rotation).toBe("A"); expect(s.intro).toBe(true);
  expect(s.exercises.map((e) => e.baseId)).not.toContain("deadBug");
  expect(JSON.stringify(s)).not.toContain("memo\""); // no session-wide memo field
});

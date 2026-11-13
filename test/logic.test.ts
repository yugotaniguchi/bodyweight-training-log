import { describe, expect, test } from "bun:test";
import { EXERCISES } from "../src/exercises";
import {
  assessPain, decideNext, detectOverload, diffProfile, generateSession, migrateProfile, painDurationGuidance, emptyStore, setSum,
  type PainEntry, type Profile, type Session, type SessionExercise, type Store,
} from "../src/logic";

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

// ---------- fixtures for history-based rules ----------
const doneSession = (date: string, ex: SessionExercise): Session => ({
  id: 1, date, rotation: "A", title: "押す + 脚", status: "completed", intro: false,
  focusNote: "", progressionNotes: [], exercises: [ex], totalVolume: ex.loggedSets.reduce((a: number, v) => a + setSum(v), 0),
});
const storeWith = (pain: PainEntry[], sessions: Session[]): Store => ({ ...emptyStore(), pain, sessions, nextSessionId: 9, nextExerciseId: 9 });

describe("24-hour rule (detectOverload)", () => {
  const prePain: PainEntry = { date: "2026-01-01", soreness: { "胸": 0 }, jointPain: {}, redFlags: [] };
  const session = doneSession("2026-01-02", prev({})); // pushup, logged [8,8,8] RPE 8
  // generateSession picks the rotation from sessions.length % 3, so pad with
  // two older empty completed sessions to land back on rotation A.
  const blank = (id: number, date: string): Session => ({ id, date, rotation: "A", title: "", status: "completed", intro: false, focusNote: "", progressionNotes: [], exercises: [], totalVolume: 0 });
  const sessionsA = [blank(7, "2025-12-29"), blank(8, "2025-12-31"), session];

  test("pain still above the pre-session level the next day flags the part", () => {
    const store = storeWith([prePain, { date: "2026-01-03", soreness: { "胸": 2 }, jointPain: {}, redFlags: [] }], [session]);
    const flags = detectOverload(store);
    expect(flags.some((f) => f.subject === "胸" && f.baseline === 0 && f.nextLevel === 2)).toBe(true);
  });
  test("pain back at baseline the next day does not flag", () => {
    const store = storeWith([prePain, { date: "2026-01-03", soreness: { "胸": 0 }, jointPain: {}, redFlags: [] }], [session]);
    expect(detectOverload(store).filter((f) => f.subject === "胸")).toHaveLength(0);
  });
  test("generation reduces the overloaded part and names the 24-hour rule, overriding the RPE increase", () => {
    const store = storeWith([prePain, { date: "2026-01-03", soreness: { "胸": 2 }, jointPain: {}, redFlags: [] }], sessionsA);
    const s = generateSession(store, "2026-01-04", assessPain(null));
    const pushup = s.exercises.find((e) => e.baseId === "pushup")!;
    // RPE 8 at full achievement would give 9 reps (+1); overload cuts to floor(9*0.8)=7
    expect(pushup.targetReps).toBe(7);
    expect(s.progressionNotes.join("")).toContain("24時間ルール");
  });
  test("no overload: the plain RPE adjustment applies", () => {
    const store = storeWith([prePain, { date: "2026-01-03", soreness: { "胸": 0 }, jointPain: {}, redFlags: [] }], sessionsA);
    const s = generateSession(store, "2026-01-04", assessPain(null));
    expect(s.exercises.find((e) => e.baseId === "pushup")!.targetReps).toBe(9);
  });
});

describe("pain duration guidance", () => {
  const series = (kind: "soreness" | "jointPain", part: string, start: string, days: number, level = 2): PainEntry[] =>
    Array.from({ length: days }, (_, i) => {
      const d = new Date(Date.UTC(2026, 0, Number(start.slice(8, 10))) + i * 86400000).toISOString().slice(0, 10);
      return { date: d, soreness: kind === "soreness" ? { [part]: level } : {}, jointPain: kind === "jointPain" ? { [part]: level } : {}, redFlags: [] };
    });
  test("muscle soreness on 5 consecutive days gives see-a-doctor guidance", () => {
    const g = painDurationGuidance(storeWith(series("soreness", "胸", "2026-01-01", 5), []));
    expect(g.some((x) => x.subject === "胸" && x.days === 5 && x.severity === "care")).toBe(true);
  });
  test("muscle soreness for 4 days gives no guidance yet", () => {
    const g = painDurationGuidance(storeWith(series("soreness", "胸", "2026-01-01", 4), []));
    expect(g.filter((x) => x.subject === "胸")).toHaveLength(0);
  });
  test("joint pain: 7 days is a caution, 14 days is see-a-doctor guidance", () => {
    const g7 = painDurationGuidance(storeWith(series("jointPain", "膝", "2026-01-01", 7), []));
    expect(g7.some((x) => x.subject === "膝" && x.severity === "caution")).toBe(true);
    const g14 = painDurationGuidance(storeWith(series("jointPain", "膝", "2026-01-01", 14), []));
    expect(g14.some((x) => x.subject === "膝" && x.days === 14 && x.severity === "care")).toBe(true);
  });
  test("a resolved day breaks the streak", () => {
    const entries = [...series("soreness", "胸", "2026-01-01", 4), { date: "2026-01-05", soreness: { "胸": 0 }, jointPain: {}, redFlags: [] }, ...series("soreness", "胸", "2026-01-06", 2)];
    expect(painDurationGuidance(storeWith(entries, [])).filter((x) => x.subject === "胸")).toHaveLength(0);
  });
});

describe("joint -> muscle part mapping", () => {
  test("lower-back joint pain level 3 excludes squats (legs via the map) but not push-ups", () => {
    const store = emptyStore();
    const s = generateSession(store, "2026-01-01", assessPain({ date: "2026-01-01", soreness: {}, jointPain: { "腰": 3 }, redFlags: [] }));
    const ids = s.exercises.map((e) => e.baseId);
    expect(ids).not.toContain("squat");
    expect(ids).not.toContain("plank"); // 体幹 is in the 腰 map
    expect(ids).toContain("pushup");
    expect(s.progressionNotes.join("")).toContain("関節");
  });
  test("lower-back joint pain level 2 reduces leg work via the map", () => {
    const store = emptyStore();
    const s = generateSession(store, "2026-01-01", assessPain({ date: "2026-01-01", soreness: {}, jointPain: { "腰": 2 }, redFlags: [] }));
    const squat = s.exercises.find((e) => e.baseId === "squat")!;
    expect(squat.targetReps).toBe(8); // 10 * 0.8
    expect(s.progressionNotes.join("")).toContain("軽減");
  });
  test("elbow joint pain level 3 excludes pushing and pulling exercises", () => {
    const store = emptyStore();
    const s = generateSession(store, "2026-01-01", assessPain({ date: "2026-01-01", soreness: {}, jointPain: { "肘": 3 }, redFlags: [] }));
    const ids = s.exercises.map((e) => e.baseId);
    expect(ids).not.toContain("pushup"); // 胸 via 肘 map / direct joint load
    expect(ids).not.toContain("pike");   // 肩 via 肘 map
  });
});

test("empty store generates an intro session A without personal data", () => {
  const store = emptyStore();
  const s = generateSession(store, "2026-01-01", assessPain(null));
  expect(s.rotation).toBe("A"); expect(s.intro).toBe(true);
  expect(s.exercises.map((e) => e.baseId)).not.toContain("deadBug");
  expect(JSON.stringify(s)).not.toContain("memo\""); // no session-wide memo field
});

describe("profile migration (two note fields -> one, sex -> select values)", () => {
  const legacy = (over: Record<string, unknown>): Profile =>
    ({ age: 28, sex: "男性", heightCm: 171, weightKg: 64, ...over }) as unknown as Profile;
  test("the two legacy notes merge with a newline, nothing lost", () => {
    expect(migrateProfile(legacy({ bodyFatNote: "体脂肪20%", habitNote: "週2回" }))?.note).toBe("体脂肪20%\n週2回");
    expect(migrateProfile(legacy({ bodyFatNote: "", habitNote: "週2回" }))?.note).toBe("週2回");
    expect(migrateProfile(legacy({ bodyFatNote: "体脂肪20%", habitNote: "" }))?.note).toBe("体脂肪20%");
    expect(migrateProfile(legacy({ bodyFatNote: "", habitNote: "" }))?.note).toBe("");
  });
  test("a free-text sex value folds to 選択しない (\"\"), the options survive", () => {
    expect(migrateProfile(legacy({ sex: "その他" }))?.sex).toBe("");
    expect(migrateProfile(legacy({ sex: "女性" }))?.sex).toBe("女性");
    expect(migrateProfile(legacy({ sex: "男性" }))?.sex).toBe("男性");
  });
  test("idempotent on the new shape and null-safe", () => {
    const cur: Profile = { age: 28, sex: "女性", heightCm: 160, weightKg: 55, note: "既往症なし" };
    expect(migrateProfile(cur)).toEqual(cur);
    expect(migrateProfile(migrateProfile(legacy({ bodyFatNote: "a", habitNote: "b" })))).toEqual(migrateProfile(legacy({ bodyFatNote: "a", habitNote: "b" })));
    expect(migrateProfile(null)).toBeNull();
  });
  test("the history diff follows the merged field", () => {
    const before: Profile = { age: 28, sex: "", heightCm: 171, weightKg: 64, note: "" };
    const after: Profile = { ...before, note: "週2回" };
    const diff = diffProfile(before, after);
    expect(diff).toHaveLength(1);
    expect(diff[0]).toMatchObject({ field: "note", label: "補足", from: "", to: "週2回" });
  });
});

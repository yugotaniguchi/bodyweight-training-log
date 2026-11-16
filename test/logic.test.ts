import { describe, expect, test } from "bun:test";
import { EXERCISES, defaultCatalog, loadOf } from "../src/exercises";
import {
  assessPain, painFactorOf, personalAdjustment, achievedLoad, exerciseLoad, generateSession, painDurationGuidance, emptyStore, setSum,
  type PainEntry, type Profile, type Session, type SessionExercise, type Store,
} from "../src/logic";
import { diffProfile, migrateProfile } from "../src/logic";

const prev = (over: Partial<SessionExercise>): SessionExercise => ({
  id: 1, baseId: "pushup", name: "プッシュアップ", muscleGroup: "胸・三頭", painPart: "胸",
  variation: "膝つきプッシュアップ", ladderIndex: 1, targetSets: 3, targetReps: 8, targetUnit: "回",
  cue: "", loggedSets: [8, 8, 8], rpe: 8, completed: true, note: "", ...over,
});
const entry = (over: Partial<PainEntry>): PainEntry => ({
  date: "2026-01-01", soreness: {}, jointPain: {}, redFlags: [], ...over,
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

describe("painFactorOf", () => {
  const cat = defaultCatalog();
  test("no entry or no pain means factor 1", () => {
    expect(painFactorOf(EXERCISES.pushup, null, cat)).toBe(1);
    expect(painFactorOf(EXERCISES.pushup, entry({}), cat)).toBe(1);
  });
  test("muscle soreness scales by the 5-step table", () => {
    expect(painFactorOf(EXERCISES.pushup, entry({ soreness: { "胸": 1 } }), cat)).toBeCloseTo(0.9);
    expect(painFactorOf(EXERCISES.pushup, entry({ soreness: { "胸": 2 } }), cat)).toBeCloseTo(0.7);
    expect(painFactorOf(EXERCISES.pushup, entry({ soreness: { "胸": 3 } }), cat)).toBeCloseTo(0.45);
    expect(painFactorOf(EXERCISES.pushup, entry({ soreness: { "胸": 5 } }), cat)).toBe(0);
  });
  test("joint pain uses the steeper table, directly and via the map", () => {
    // squat loads the knee directly
    expect(painFactorOf(EXERCISES.squat, entry({ jointPain: { "膝": 3 } }), cat)).toBeCloseTo(0.25);
    // the lower back maps to 脚（前）, so it reaches the squat too
    expect(painFactorOf(EXERCISES.squat, entry({ jointPain: { "腰": 2 } }), cat)).toBeCloseTo(0.55);
    expect(painFactorOf(EXERCISES.squat, entry({ jointPain: { "腰": 5 } }), cat)).toBe(0);
    // an unrelated joint does not reach the exercise
    expect(painFactorOf(EXERCISES.pushup, entry({ jointPain: { "足首": 5 } }), cat)).toBe(1);
  });
  test("muscle and joint factors multiply", () => {
    const f = painFactorOf(EXERCISES.pushup, entry({ soreness: { "胸": 2 }, jointPain: { "肘": 2 } }), cat);
    expect(f).toBeCloseTo(0.7 * 0.55);
  });
});

describe("personalAdjustment", () => {
  test("all-zero record is a cannot-do directive", () => {
    const a = personalAdjustment(EXERCISES.pushup, prev({ loggedSets: [0, 0, 0], rpe: 10 }), false);
    expect(a.cannotDo).toBe(true);
  });
  test("memo 'できない' is also cannot-do, and only for its own exercise", () => {
    expect(personalAdjustment(EXERCISES.pike, prev({ baseId: "pike", note: "できない" }), false).cannotDo).toBe(true);
    expect(personalAdjustment(EXERCISES.squat, prev({ baseId: "squat", note: "" }), false).cannotDo).toBe(false);
  });
  test("memo takes priority over RPE: 'ちょうど' keeps both factors at 1", () => {
    const a = personalAdjustment(EXERCISES.pushup, prev({ rpe: 6, note: "ちょうどいい" }), false);
    expect(a.shareScale).toBe(1); expect(a.repFactor).toBe(1);
    expect(a.notes.join("")).toContain("種目メモ");
  });
  test("pain memo shrinks the share; easy memo grows it", () => {
    expect(personalAdjustment(EXERCISES.pushup, prev({ note: "肩に違和感" }), false).shareScale).toBe(0.7);
    expect(personalAdjustment(EXERCISES.pushup, prev({ note: "楽だった" }), false).shareScale).toBe(1.15);
  });
  test("low RPE + full achievement prices a rep cheaper (more reps fit the load)", () => {
    const a = personalAdjustment(EXERCISES.pushup, prev({ rpe: 6, loggedSets: [8, 8, 8] }), false);
    expect(a.repFactor).toBe(0.9);
    expect(a.notes.join("")).toContain("余裕");
  });
  test("high RPE + low achievement prices a rep costlier", () => {
    const a = personalAdjustment(EXERCISES.pushup, prev({ rpe: 10, loggedSets: [2, 2, 2] }), false);
    expect(a.repFactor).toBe(1.15);
  });
  test("no previous record is neutral, with a first-time note", () => {
    const a = personalAdjustment(EXERCISES.pushup, null, true);
    expect(a.shareScale).toBe(1); expect(a.repFactor).toBe(1);
    expect(a.notes.join("")).toContain("初回");
  });
});

// ---------- fixtures for history-based rules ----------
const doneSession = (date: string, exs: SessionExercise[]): Session => ({
  id: 1, date, rotation: "A", title: "押す + 脚", status: "completed", intro: false,
  focusNote: "", progressionNotes: [], exercises: exs,
  totalVolume: exs.reduce((a, e) => a + e.loggedSets.reduce((x: number, v) => x + setSum(v), 0), 0),
});
const storeWith = (pain: PainEntry[], sessions: Session[]): Store => ({ ...emptyStore(), pain, sessions, nextSessionId: 9, nextExerciseId: 9 });

describe("load planner (generateSession)", () => {
  test("first session: 6 exercises, pattern coverage, intro, no rotation", () => {
    const s = generateSession(emptyStore(), "2026-01-01", null);
    expect(s.rotation).toBe("");
    expect(s.intro).toBe(true);
    expect(s.exercises).toHaveLength(6);
    const parts = new Set(s.exercises.map((e) => e.painPart));
    expect(parts.size).toBeGreaterThanOrEqual(4);
    expect(s.title).toBe("全身"); // push + pull + legs + core all present
    expect(JSON.stringify(s)).not.toContain("memo\""); // no session-wide memo field
  });
  test("at most 2 exercises per muscle part", () => {
    const s = generateSession(emptyStore(), "2026-01-01", null);
    const counts = new Map<string, number>();
    for (const e of s.exercises) counts.set(e.painPart, (counts.get(e.painPart) ?? 0) + 1);
    for (const n of counts.values()) expect(n).toBeLessThanOrEqual(2);
  });
  test("achievedLoad prices performed work by step load", () => {
    const s = doneSession("2026-01-01", [prev({ ladderIndex: 2, loggedSets: [8, 8, 8] })]);
    expect(achievedLoad(s, defaultCatalog())).toBe(loadOf(EXERCISES.pushup, 2) * 24);
  });
  test("legacy exercises missing from the catalog still score at the generic anchor", () => {
    const legacy = prev({ baseId: "deadBug", name: "デッドバグ", ladderIndex: 0, loggedSets: [10, 10] });
    expect(exerciseLoad(legacy, defaultCatalog())).toBe(60 * 20); // 60 points per rep
    const timed = prev({ baseId: "oldTimer", targetUnit: "秒", loggedSets: [30, 30] });
    expect(exerciseLoad(timed, defaultCatalog())).toBe(4 * 60); // 4 points per second
  });
  // One completed session that trained every exercise at a neutral
  // RPE 8 with full achievement, so recency is uniform and the
  // pattern-coverage picks (pushup, squat, ...) are selected again.
  const fullHistory = (date: string): Session => doneSession(date, Object.values(EXERCISES).map((def, i) => ({
    id: i + 1, baseId: def.baseId, name: def.name, muscleGroup: def.muscleGroup, painPart: def.painPart,
    variation: def.ladder[def.defaultLadder], ladderIndex: def.defaultLadder,
    targetSets: def.baseSets, targetReps: def.baseTarget, targetUnit: def.unit, cue: "",
    loggedSets: Array(def.baseSets).fill(def.baseTarget), rpe: 8, completed: true, note: "",
  })));
  test("muscle soreness 5 removes the part; level 2 scales it and nothing else grows", () => {
    const base = storeWith([], [fullHistory("2026-01-01")]);
    const plain = generateSession(structuredClone(base), "2026-01-03", null);
    const pained = generateSession(structuredClone(base), "2026-01-03", entry({ date: "2026-01-03", soreness: { "胸": 2 } }));
    const plainSquat = plain.exercises.find((e) => e.baseId === "squat")!;
    const painedSquat = pained.exercises.find((e) => e.baseId === "squat")!;
    const plainPush = plain.exercises.find((e) => e.baseId === "pushup")!;
    const painedPush = pained.exercises.find((e) => e.baseId === "pushup")!;
    expect(painedSquat.targetReps).toBe(plainSquat.targetReps); // no redistribution
    expect(painedPush.targetReps).toBeLessThan(plainPush.targetReps);
    expect(pained.progressionNotes.join("")).toContain("痛み係数");
    const excluded = generateSession(structuredClone(base), "2026-01-03", entry({ date: "2026-01-03", soreness: { "胸": 5 } }));
    expect(excluded.exercises.map((e) => e.baseId)).not.toContain("pushup");
    expect(excluded.title).toContain("代替");
  });
  test("joint pain 5 removes exercises loading it; level 3 keeps them, heavily scaled", () => {
    const hard = generateSession(emptyStore(), "2026-01-01", entry({ jointPain: { "肘": 5 } }));
    const ids = hard.exercises.map((e) => e.baseId);
    expect(ids).not.toContain("pushup");
    expect(ids).not.toContain("pike");
    const mid = generateSession(emptyStore(), "2026-01-01", entry({ jointPain: { "肘": 3 } }));
    expect(mid.exercises.map((e) => e.baseId)).toContain("pushup");
    expect(mid.progressionNotes.join("")).toContain("25%");
  });
  test("a cannot-do exercise comes back one ladder step easier", () => {
    const history = doneSession("2025-12-25", [
      prev({ loggedSets: [0, 0, 0], rpe: 10 }),
      prev({ id: 2, baseId: "pike", name: "パイクプッシュアップ", muscleGroup: "肩", painPart: "肩", variation: "パイクプッシュアップ（浅め）", targetReps: 6, targetSets: 2, loggedSets: [6, 6] }),
      prev({ id: 3, baseId: "squat", name: "スクワット", muscleGroup: "脚（前）", painPart: "脚（前）", variation: "スクワット", targetReps: 10, loggedSets: [10, 10, 10] }),
      prev({ id: 4, baseId: "proneW", name: "プローンWレイズ", muscleGroup: "背中", painPart: "背中", variation: "プローンWレイズ", targetReps: 12, targetSets: 2, loggedSets: [12, 12] }),
      prev({ id: 5, baseId: "legRaise", name: "レッグレイズ", muscleGroup: "腹筋", painPart: "腹筋", variation: "レッグレイズ", targetReps: 10, targetSets: 2, loggedSets: [10, 10] }),
      prev({ id: 6, baseId: "plank", name: "プランク", muscleGroup: "体幹", painPart: "体幹", variation: "プランク", targetUnit: "秒", targetReps: 40, targetSets: 2, loggedSets: [40, 40] }),
    ]);
    const s = generateSession(storeWith([], [history]), "2026-01-01", null);
    const pushup = s.exercises.find((e) => e.baseId === "pushup")!;
    expect(pushup.ladderIndex).toBe(0);
    expect(s.progressionNotes.join("")).toContain("できない種目の切り替え");
  });
  test("next-day pain is priced by the coefficient, not a separate 24-hour rule", () => {
    const s = generateSession(storeWith([], [fullHistory("2026-01-02")]), "2026-01-03", entry({ date: "2026-01-03", soreness: { "胸": 2 } }));
    expect(s.progressionNotes.join("")).not.toContain("24時間ルール");
    expect(s.progressionNotes.join("")).toContain("痛み係数");
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

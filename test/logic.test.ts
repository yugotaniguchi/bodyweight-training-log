import { describe, expect, test } from "bun:test";
import { EXERCISES, defaultCatalog, loadOf } from "../src/exercises";
import {
  assessPain, painFactorOf, personalAdjustment, achievedLoad, exerciseLoad, generateSession, painDurationGuidance, emptyStore, setSum,
  type PainEntry, type Profile, type Session, type SessionExercise, type Store,
} from "../src/logic";
import { diffProfile, migrateProfile, migrateStoreData } from "../src/logic";

const prev = (over: Partial<SessionExercise>): SessionExercise => ({
  id: 1, baseId: "pushup", name: "プッシュアップ", muscleGroup: "胸・三頭", painPart: "胸下部",
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
    const a = assessPain({ date: "2026-01-01", soreness: { "胸下部": 2, "背中上部": 3 }, jointPain: { "腰": 2 } });
    expect(a.reducedParts).toContain("胸下部"); expect(a.excludedParts).toContain("背中上部"); expect(a.rest).toBe(false);
  });
  test("full rest only at 4+ in 2+ parts", () => {
    const a = assessPain({ date: "2026-01-01", soreness: { "胸下部": 4, "背中上部": 5 }, jointPain: {} });
    expect(a.rest).toBe(true);
    const b = assessPain({ date: "2026-01-01", soreness: { "胸下部": 4 }, jointPain: {} });
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
    expect(painFactorOf(EXERCISES.pushup, entry({ soreness: { "胸下部": 1 } }), cat)).toBeCloseTo(0.9);
    expect(painFactorOf(EXERCISES.pushup, entry({ soreness: { "胸下部": 2 } }), cat)).toBeCloseTo(0.7);
    expect(painFactorOf(EXERCISES.pushup, entry({ soreness: { "胸下部": 3 } }), cat)).toBeCloseTo(0.45);
    expect(painFactorOf(EXERCISES.pushup, entry({ soreness: { "胸下部": 5 } }), cat)).toBe(0);
  });
  test("joint pain uses the steeper table, directly and via the map", () => {
    // squat loads the knee directly
    expect(painFactorOf(EXERCISES.squat, entry({ jointPain: { "膝": 3 } }), cat)).toBeCloseTo(0.25);
    // the lower back maps to 大腿四頭筋, so it reaches the squat too
    expect(painFactorOf(EXERCISES.squat, entry({ jointPain: { "腰": 2 } }), cat)).toBeCloseTo(0.55);
    expect(painFactorOf(EXERCISES.squat, entry({ jointPain: { "腰": 5 } }), cat)).toBe(0);
    // an unrelated joint does not reach the exercise
    expect(painFactorOf(EXERCISES.pushup, entry({ jointPain: { "足首": 5 } }), cat)).toBe(1);
  });
  test("muscle and joint factors multiply", () => {
    const f = painFactorOf(EXERCISES.pushup, entry({ soreness: { "胸下部": 2 }, jointPain: { "肘": 2 } }), cat);
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
    const legacy = prev({ baseId: "diamond", name: "ダイヤモンドプッシュアップ", ladderIndex: 0, loggedSets: [10, 10] });
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
    const pained = generateSession(structuredClone(base), "2026-01-03", entry({ date: "2026-01-03", soreness: { "胸下部": 2 } }));
    const plainSquat = plain.exercises.find((e) => e.baseId === "squat")!;
    const painedSquat = pained.exercises.find((e) => e.baseId === "squat")!;
    const plainPush = plain.exercises.find((e) => e.baseId === "pushup")!;
    const painedPush = pained.exercises.find((e) => e.baseId === "pushup")!;
    expect(painedSquat.targetReps).toBe(plainSquat.targetReps); // no redistribution
    expect(painedPush.targetReps).toBeLessThan(plainPush.targetReps);
    expect(pained.progressionNotes.join("")).toContain("痛み係数");
    const excluded = generateSession(structuredClone(base), "2026-01-03", entry({ date: "2026-01-03", soreness: { "胸下部": 5 } }));
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
    // History spread over realistic sessions (six exercises each,
    // the whole catalog covered), with pushup's record in the
    // oldest session replaced by an all-zero cannot-do record:
    // pushup is the stalest exercise, so it is selected again, and
    // the directive steps it down from 膝つき (2) to インクライン (1).
    const defs = Object.values(EXERCISES);
    const sessions: Session[] = [];
    for (let d = 0; d * 6 < defs.length; d++) {
      const date = new Date(Date.UTC(2025, 11, 22 + d)).toISOString().slice(0, 10);
      sessions.push(doneSession(date, defs.slice(d * 6, d * 6 + 6).map((def, i) => ({
        id: d * 6 + i + 1, baseId: def.baseId, name: def.name, muscleGroup: def.muscleGroup, painPart: def.painPart,
        variation: def.ladder[def.defaultLadder], ladderIndex: def.defaultLadder,
        targetSets: def.baseSets, targetReps: def.baseTarget, targetUnit: def.unit, cue: "",
        loggedSets: Array(def.baseSets).fill(def.baseTarget), rpe: 8, completed: true, note: "",
      }))));
    }
    const pushupRec = sessions[0].exercises.find((e) => e.baseId === "pushup")!;
    pushupRec.loggedSets = [0, 0, 0];
    pushupRec.rpe = 10;
    const s = generateSession(storeWith([], sessions), "2026-01-01", null);
    const pushup = s.exercises.find((e) => e.baseId === "pushup")!;
    expect(pushup.ladderIndex).toBe(1);
    expect(s.progressionNotes.join("")).toContain("できない種目の切り替え");
  });
  test("next-day pain is priced by the coefficient, not a separate 24-hour rule", () => {
    const s = generateSession(storeWith([], [fullHistory("2026-01-02")]), "2026-01-03", entry({ date: "2026-01-03", soreness: { "胸下部": 2 } }));
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
    const g = painDurationGuidance(storeWith(series("soreness", "胸下部", "2026-01-01", 5), []));
    expect(g.some((x) => x.subject === "胸下部" && x.days === 5 && x.severity === "care")).toBe(true);
  });
  test("muscle soreness for 4 days gives no guidance yet", () => {
    const g = painDurationGuidance(storeWith(series("soreness", "胸下部", "2026-01-01", 4), []));
    expect(g.filter((x) => x.subject === "胸下部")).toHaveLength(0);
  });
  test("joint pain: 7 days is a caution, 14 days is see-a-doctor guidance", () => {
    const g7 = painDurationGuidance(storeWith(series("jointPain", "膝", "2026-01-01", 7), []));
    expect(g7.some((x) => x.subject === "膝" && x.severity === "caution")).toBe(true);
    const g14 = painDurationGuidance(storeWith(series("jointPain", "膝", "2026-01-01", 14), []));
    expect(g14.some((x) => x.subject === "膝" && x.days === 14 && x.severity === "care")).toBe(true);
  });
  test("a resolved day breaks the streak", () => {
    const entries = [...series("soreness", "胸下部", "2026-01-01", 4), { date: "2026-01-05", soreness: { "胸下部": 0 }, jointPain: {}, redFlags: [] }, ...series("soreness", "胸下部", "2026-01-06", 2)];
    expect(painDurationGuidance(storeWith(entries, [])).filter((x) => x.subject === "胸下部")).toHaveLength(0);
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

describe("migrateStoreData (data migrations)", () => {
  const v1Store = (): Store => ({
    ...emptyStore(),
    pain: [
      { date: "2026-01-01", soreness: { "胸": 2, "背中": 3, "ふくらはぎ": 1 }, jointPain: { "腰": 2 }, redFlags: [] },
      { date: "2026-01-02", soreness: { "胸": 1, "胸下部": 4 }, jointPain: {}, redFlags: [] },
    ],
    sessions: [{
      id: 1, date: "2026-01-01", rotation: "A", title: "押す + 脚", status: "completed", intro: false,
      focusNote: "", progressionNotes: [], totalVolume: 100,
      exercises: [
        prev({ baseId: "pushup", ladderIndex: 3 }),   // was ダイヤモンド (80)
        prev({ id: 2, baseId: "plank", ladderIndex: 1, targetUnit: "秒" }), // was プランク (6)
        prev({ id: 3, baseId: "deadBug", ladderIndex: 0 }), // legacy standard form
        prev({ id: 4, baseId: "crunch", ladderIndex: 1 }),  // append-only family: unchanged
      ],
    }],
  });

  test("renames pain parts to their primary successors, larger level wins", () => {
    const s = migrateStoreData(v1Store());
    expect(s.dataVersion).toBe(4);
    expect(s.pain[0].soreness).toEqual({ "胸下部": 2, "背中上部": 3, "ふくらはぎ": 1 });
    expect(s.pain[0].jointPain).toEqual({ "腰": 2 }); // joints are not renamed
    expect(s.pain[1].soreness).toEqual({ "胸下部": 4 });
  });

  test("remaps ladder indexes whose ladders gained inserted steps", () => {
    const s = migrateStoreData(v1Store());
    const byBase = Object.fromEntries(s.sessions[0].exercises.map((e) => [e.baseId, e.ladderIndex]));
    // ダイヤモンド: v1 index 3 -> v2 index 5 -> v3 index 6 (the
    // incline step inserted in round 2 shifts it once more).
    expect(byBase.pushup).toBe(6);
    expect(byBase.plank).toBe(2);   // プランク sits at 2
    expect(byBase.deadBug).toBe(1); // the standard form
    expect(byBase.crunch).toBe(1);  // untouched
    // The remapped indexes price the records at the same steps as before.
    expect(loadOf(EXERCISES.pushup, byBase.pushup)).toBe(80);
    expect(loadOf(EXERCISES.plank, byBase.plank)).toBe(6);
  });

  test("a version-2 store gains only the pushup incline shift", () => {
    const s = migrateStoreData({
      ...emptyStore(), dataVersion: 2,
      pain: [{ date: "2026-01-01", soreness: { "胸下部": 2 }, jointPain: {}, redFlags: [] }],
      sessions: [{
        id: 1, date: "2026-01-01", rotation: "A", title: "押す + 脚", status: "completed", intro: false,
        focusNote: "", progressionNotes: [], totalVolume: 100,
        exercises: [
          prev({ baseId: "pushup", ladderIndex: 3 }),  // プッシュアップ in the v2 ladder
          prev({ id: 2, baseId: "plank", ladderIndex: 2, targetUnit: "秒" }),
        ],
      }],
    });
    expect(s.dataVersion).toBe(4);
    expect(s.pain[0].soreness).toEqual({ "胸下部": 2 }); // already renamed in v2: untouched
    const byBase = Object.fromEntries(s.sessions[0].exercises.map((e) => [e.baseId, e.ladderIndex]));
    expect(byBase.pushup).toBe(4); // プッシュアップ sits at 4 in the v3 ladder
    expect(loadOf(EXERCISES.pushup, byBase.pushup)).toBe(60);
    expect(byBase.plank).toBe(2); // untouched by the v3 step
  });

  test("a version-3 store gains only the family merges", () => {
    const s = migrateStoreData({
      ...emptyStore(), dataVersion: 3,
      sessions: [{
        id: 1, date: "2026-01-01", rotation: "B", title: "背中 + 脚裏 + 体幹", status: "completed", intro: false,
        focusNote: "", progressionNotes: [], totalVolume: 100,
        exercises: [
          prev({ baseId: "superman", ladderIndex: 1 }),       // スーパーマン (35)
          prev({ id: 2, baseId: "backExtension", ladderIndex: 2 }), // 手を頭の後ろ (40)
          prev({ id: 3, baseId: "reverseSnowAngel", ladderIndex: 1 }), // 浮かせた弧の動作 (30)
          prev({ id: 4, baseId: "proneT", ladderIndex: 0 }),  // Tスライド (25)
          prev({ id: 5, baseId: "pushup", ladderIndex: 4 }),  // untouched by v4
        ],
      }],
    });
    expect(s.dataVersion).toBe(4);
    const byId = Object.fromEntries(s.sessions[0].exercises.map((e) => [e.id, e]));
    expect(byId[1].baseId).toBe("floorBackExtension");
    expect(byId[1].ladderIndex).toBe(3);
    expect(loadOf(EXERCISES.floorBackExtension, byId[1].ladderIndex)).toBe(35); // same step, same price
    expect(byId[2].baseId).toBe("floorBackExtension");
    expect(byId[2].ladderIndex).toBe(4);
    expect(loadOf(EXERCISES.floorBackExtension, byId[2].ladderIndex)).toBe(40);
    expect(byId[3].baseId).toBe("proneT");
    expect(byId[3].ladderIndex).toBe(2); // the floating arc lands on プローンTレイズ
    expect(loadOf(EXERCISES.proneT, byId[3].ladderIndex)).toBe(35); // the merge's one repricing: 30 -> 35
    expect(byId[4].baseId).toBe("proneT");
    expect(byId[4].ladderIndex).toBe(1); // Tスライド shifts by one, same price
    expect(loadOf(EXERCISES.proneT, byId[4].ladderIndex)).toBe(25);
    expect(byId[5].baseId).toBe("pushup");
    expect(byId[5].ladderIndex).toBe(4);
  });

  test("a version-1 superman record chains through both remaps into the merged family", () => {
    // Legacy step 0 was the standard form: the v2 step moves it to
    // index 1 (スーパーマン), and the v4 merge maps that to index 3
    // of floorBackExtension — the same step at the same price, never
    // remapped twice.
    const s = migrateStoreData({
      ...emptyStore(),
      sessions: [{
        id: 1, date: "2026-01-01", rotation: "B", title: "背中 + 脚裏 + 体幹", status: "completed", intro: false,
        focusNote: "", progressionNotes: [], totalVolume: 24,
        exercises: [prev({ baseId: "superman", ladderIndex: 0 })],
      }],
    });
    expect(s.dataVersion).toBe(4);
    expect(s.sessions[0].exercises[0].baseId).toBe("floorBackExtension");
    expect(s.sessions[0].exercises[0].ladderIndex).toBe(3);
    expect(loadOf(EXERCISES.floorBackExtension, 3)).toBe(35);
  });

  test("is idempotent and leaves current stores untouched", () => {
    const once = migrateStoreData(v1Store());
    const snapshot = structuredClone(once);
    expect(migrateStoreData(once)).toEqual(snapshot);
    const current: Store = { ...emptyStore(), dataVersion: 4 };
    expect(migrateStoreData(current)).toBe(current);
  });
});

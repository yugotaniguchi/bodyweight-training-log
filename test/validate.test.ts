import { describe, expect, test } from "bun:test";
import { emptyStore, type Store } from "../src/logic";
import {
  InvalidInput, isValidDateString, parseProfile, parseStoreImport, validDateString, validNote, validPainLevel, validReps, validRpe,
} from "../src/validate";

describe("validReps", () => {
  test("accepts integers 0-999", () => {
    expect(validReps(0)).toBe(0);
    expect(validReps(999)).toBe(999);
    expect(validReps(42)).toBe(42);
  });
  test("rejects negatives, decimals, out-of-range and non-numbers", () => {
    for (const v of [-1, 1.5, 1000, "8", null, undefined, NaN, {}]) {
      expect(() => validReps(v)).toThrow(InvalidInput);
    }
  });
});

describe("validRpe", () => {
  test("empty means not entered", () => {
    expect(validRpe(null)).toBeNull();
    expect(validRpe("")).toBeNull();
    expect(validRpe(undefined)).toBeNull();
  });
  test("accepts 6-10 in 0.5 steps", () => {
    for (const v of [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10]) expect(validRpe(v)).toBe(v);
  });
  test("rejects below-range, off-step and non-numbers", () => {
    for (const v of [5, 5.5, 7.3, 10.5, 11, "8", NaN]) {
      expect(() => validRpe(v)).toThrow(InvalidInput);
    }
  });
});

describe("validPainLevel", () => {
  test("accepts integers 0-5 only", () => {
    for (const v of [0, 1, 2, 3, 4, 5]) expect(validPainLevel(v)).toBe(v);
    for (const v of [-1, 6, 2.5, "3", null]) {
      expect(() => validPainLevel(v)).toThrow(InvalidInput);
    }
  });
});

describe("validNote", () => {
  test("accepts up to 200 characters, rejects 201 and non-strings", () => {
    expect(validNote("")).toBe("");
    expect(validNote("あ".repeat(200))).toHaveLength(200);
    expect(() => validNote("あ".repeat(201))).toThrow(InvalidInput);
    expect(() => validNote(123)).toThrow(InvalidInput);
  });
});

describe("date strings", () => {
  test("accepts real YYYY-MM-DD dates only", () => {
    expect(isValidDateString("2026-11-13")).toBe(true);
    expect(isValidDateString("2024-02-29")).toBe(true); // leap day
    for (const v of ["2026-1-3", "2026/11/13", "2026-02-30", "2025-02-29", "2026-13-01", "2026-00-10", "", "20261113", 20261113, null]) {
      expect(isValidDateString(v)).toBe(false);
    }
    expect(validDateString("2026-11-13")).toBe("2026-11-13");
    expect(() => validDateString("13/11/2026")).toThrow(InvalidInput);
  });
});

describe("parseProfile", () => {
  const ok = { age: 28, sex: "男性", heightCm: 171, weightKg: 64, bodyFatNote: "", habitNote: "" };
  test("accepts numbers and numeric strings (the client sends strings)", () => {
    expect(parseProfile(ok)).toMatchObject({ age: 28, heightCm: 171, weightKg: 64 });
    expect(parseProfile({ ...ok, age: "28", heightCm: "171", weightKg: "64.5" }).weightKg).toBe(64.5);
  });
  test("required fields cannot be empty", () => {
    for (const patch of [{ age: "" }, { age: undefined }, { heightCm: "" }, { weightKg: null }]) {
      expect(() => parseProfile({ ...ok, ...patch })).toThrow(InvalidInput);
    }
  });
  test("ranges are enforced", () => {
    for (const patch of [
      { age: 9 }, { age: 101 }, { age: 28.5 },
      { heightCm: 99 }, { heightCm: 251 }, { heightCm: 170.5 },
      { weightKg: 19.9 }, { weightKg: 301 },
    ]) {
      expect(() => parseProfile({ ...ok, ...patch })).toThrow(InvalidInput);
    }
    expect(parseProfile({ ...ok, age: 10, heightCm: 100, weightKg: 20 })).toBeTruthy();
    expect(parseProfile({ ...ok, age: 100, heightCm: 250, weightKg: 300 })).toBeTruthy();
  });
  test("free-text fields are length-capped", () => {
    expect(() => parseProfile({ ...ok, bodyFatNote: "x".repeat(201) })).toThrow(InvalidInput);
    expect(parseProfile({ ...ok, habitNote: "週2回" }).habitNote).toBe("週2回");
  });
});

describe("parseStoreImport", () => {
  const sample = (): Store => {
    const s = emptyStore();
    s.profile = { age: 28, sex: "男性", heightCm: 171, weightKg: 64, bodyFatNote: "", habitNote: "" };
    s.pain = [{ date: "2026-11-13", soreness: { "胸": 2 }, jointPain: { "膝": 1 }, redFlags: [] }];
    s.sessions = [{
      id: 1, date: "2026-11-13", rotation: "A", title: "押す + 脚", status: "completed", intro: true,
      focusNote: "", progressionNotes: ["初回"],
      exercises: [{
        id: 1, baseId: "pushup", name: "腕立て伏せ", muscleGroup: "胸・肩・上腕", painPart: "胸",
        variation: "膝つき腕立て伏せ", ladderIndex: 0, targetSets: 2, targetReps: 10, targetUnit: "回",
        cue: "", loggedSets: [10, 9], rpe: 8, completed: true, note: "",
      }],
      totalVolume: 19,
    }];
    s.nextSessionId = 2; s.nextExerciseId = 2;
    return s;
  };
  test("accepts a well-formed store and recomputes totals", () => {
    const out = parseStoreImport(structuredClone(sample()));
    expect(out.profile?.age).toBe(28);
    expect(out.sessions[0].totalVolume).toBe(19);
    expect(out.nextSessionId).toBe(2);
  });
  test("raises id counters past imported ids", () => {
    const s = sample(); s.nextSessionId = 1; s.nextExerciseId = 1;
    const out = parseStoreImport(structuredClone(s));
    expect(out.nextSessionId).toBe(2);
    expect(out.nextExerciseId).toBe(2);
  });
  test("rejects non-objects and missing keys", () => {
    for (const v of [null, [], "x", 42, {}, { profile: null, pain: [], sessions: [] }]) {
      expect(() => parseStoreImport(v)).toThrow(InvalidInput);
    }
  });
  test("rejects broken records anywhere in the file", () => {
    const badPain = sample(); badPain.pain[0].soreness["胸"] = 6;
    expect(() => parseStoreImport(structuredClone(badPain))).toThrow(InvalidInput);
    const badDate = sample(); badDate.sessions[0].date = "13/11/2026";
    expect(() => parseStoreImport(structuredClone(badDate))).toThrow(InvalidInput);
    const badReps = sample(); badReps.sessions[0].exercises[0].loggedSets = [1.5];
    expect(() => parseStoreImport(structuredClone(badReps))).toThrow(InvalidInput);
    const badStatus = sample(); (badStatus.sessions[0] as { status: string }).status = "done";
    expect(() => parseStoreImport(structuredClone(badStatus))).toThrow(InvalidInput);
  });
});

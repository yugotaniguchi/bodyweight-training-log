import { describe, expect, test } from "bun:test";
import { defaultCatalog, type Catalog } from "../src/exercises";
import { assessPain, catalogOf, emptyStore, generateSession, type Store } from "../src/logic";
import { InvalidInput, parseCatalogImport, parseStoreImport } from "../src/validate";

const clone = (c: Catalog): Catalog => JSON.parse(JSON.stringify(c)) as Catalog;
const noPain = assessPain(null);

describe("parseCatalogImport", () => {
  test("the built-in catalog round-trips", () => {
    const c = parseCatalogImport(clone(defaultCatalog()));
    expect(Object.keys(c.exercises).length).toBe(13);
    expect(c.exercises.pushup.steps.length).toBe(3);
    expect(c.exercises.pushup.focus).toBe("胸と腕の裏側");
    expect(c.joints).toContain("背骨");
  });

  test("loads and pattern round-trip; bad loads are rejected", () => {
    const c = parseCatalogImport(clone(defaultCatalog()));
    expect(c.exercises.pushup.loads).toEqual([30, 45, 60, 80]);
    expect(c.exercises.pushup.pattern).toBe("push");
    const raw = clone(defaultCatalog()) as unknown as { exercises: Record<string, Record<string, unknown>> };
    raw.exercises.pushup.loads = [30, 45];
    expect(() => parseCatalogImport(raw)).toThrow(InvalidInput);
    raw.exercises.pushup.loads = [30, 45, -1, 80];
    expect(() => parseCatalogImport(raw)).toThrow(InvalidInput);
    raw.exercises.pushup.loads = [30, 45, 60, 80];
    raw.exercises.pushup.pattern = "";
    expect(() => parseCatalogImport(raw)).toThrow(InvalidInput);
  });

  test("steps / focus fall back to the cue and the muscle group when omitted", () => {
    const raw = clone(defaultCatalog()) as unknown as { exercises: Record<string, Record<string, unknown>> };
    delete raw.exercises.pushup.steps;
    delete raw.exercises.pushup.focus;
    const c = parseCatalogImport(raw);
    expect(c.exercises.pushup.steps).toEqual([c.exercises.pushup.cue]);
    expect(c.exercises.pushup.focus).toBe(c.exercises.pushup.muscleGroup);
  });

  test("rejects a painPart that is not in muscleParts", () => {
    const raw = clone(defaultCatalog());
    raw.exercises.pushup.painPart = "存在しない部位";
    expect(() => parseCatalogImport(raw)).toThrow(InvalidInput);
  });

  test("rejects a jointParts entry that is not in joints", () => {
    const raw = clone(defaultCatalog());
    raw.exercises.pushup.jointParts = ["存在しない関節"];
    expect(() => parseCatalogImport(raw)).toThrow(InvalidInput);
  });

  test("rejects a rotation naming an unknown exercise", () => {
    const raw = clone(defaultCatalog());
    raw.rotations[0].exerciseIds = ["pushup", "nope"];
    expect(() => parseCatalogImport(raw)).toThrow(InvalidInput);
  });

  test("rejects rotations that are not A, B, C exactly once", () => {
    const raw = clone(defaultCatalog());
    raw.rotations = raw.rotations.slice(0, 2);
    expect(() => parseCatalogImport(raw)).toThrow(InvalidInput);
  });

  test("rejects an empty ladder and an out-of-range defaultLadder", () => {
    const a = clone(defaultCatalog());
    a.exercises.pushup.ladder = [];
    expect(() => parseCatalogImport(a)).toThrow(InvalidInput);
    const b = clone(defaultCatalog());
    b.exercises.pushup.defaultLadder = 99;
    expect(() => parseCatalogImport(b)).toThrow(InvalidInput);
  });

  test("rejects a substitute pointing at an unknown exercise, and a self-substitute", () => {
    const a = clone(defaultCatalog());
    a.substitutes = { pushup: "nope" };
    expect(() => parseCatalogImport(a)).toThrow(InvalidInput);
    const b = clone(defaultCatalog());
    b.substitutes = { pushup: "pushup" };
    expect(() => parseCatalogImport(b)).toThrow(InvalidInput);
  });

  test("rejects a joint map naming an unknown joint or part", () => {
    const a = clone(defaultCatalog());
    a.jointToMuscleParts = { "存在しない関節": ["胸"] };
    expect(() => parseCatalogImport(a)).toThrow(InvalidInput);
    const b = clone(defaultCatalog());
    b.jointToMuscleParts = { "腰": ["存在しない部位"] };
    expect(() => parseCatalogImport(b)).toThrow(InvalidInput);
  });

  test("rejects unilateral on a timed exercise", () => {
    const raw = clone(defaultCatalog());
    raw.exercises.plank.unilateral = true;
    expect(() => parseCatalogImport(raw)).toThrow(InvalidInput);
  });
});

describe("custom catalog in the store", () => {
  test("catalogOf falls back to the built-in catalog when absent or broken", () => {
    expect(catalogOf(emptyStore()).exercises.pushup.name).toBe("プッシュアップ");
    const broken = { ...emptyStore(), catalog: { exercises: {} } } as unknown as Store;
    expect(catalogOf(broken).exercises.pushup.name).toBe("プッシュアップ");
  });

  test("generation follows the store's catalog: renamed exercise and edited rotation", () => {
    const cat = clone(defaultCatalog());
    cat.exercises.pushup.name = "腕立て伏せ";
    cat.rotations[0].exerciseIds = ["pushup", "squat"];
    const store: Store = { ...emptyStore(), catalog: cat };
    const s = generateSession(store, "2026-01-05", noPain);
    expect(s.exercises.map((e) => e.baseId)).toEqual(["pushup", "squat"]);
    expect(s.exercises[0].name).toBe("腕立て伏せ");
  });

  test("a custom joint mapping drives exclusion through the map", () => {
    const cat = clone(defaultCatalog());
    // Map 肩 to 胸 as well: shoulder joint pain at level 3 then excludes
    // the chest exercise (pushup) through the mapping.
    cat.jointToMuscleParts["肩"] = ["肩", "胸"];
    const store: Store = { ...emptyStore(), catalog: cat };
    const a = assessPain({ date: "2026-01-05", soreness: {}, jointPain: { "肩": 3 }, redFlags: [] });
    const s = generateSession(store, "2026-01-05", a);
    expect(s.exercises.map((e) => e.baseId)).not.toContain("pushup");
  });

  test("store import carries a validated catalog, and rejects a broken one", () => {
    const base = {
      profile: null, pain: [], sessions: [], nextSessionId: 1, nextExerciseId: 1, profileHistory: [],
    };
    const ok = parseStoreImport({ ...base, catalog: clone(defaultCatalog()) });
    expect(ok.catalog?.exercises.pushup.name).toBe("プッシュアップ");
    const badCat = clone(defaultCatalog());
    badCat.exercises.pushup.painPart = "存在しない部位";
    expect(() => parseStoreImport({ ...base, catalog: badCat })).toThrow(InvalidInput);
    const none = parseStoreImport(base);
    expect(none.catalog).toBeUndefined();
  });
});

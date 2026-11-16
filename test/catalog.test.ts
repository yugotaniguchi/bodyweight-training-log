import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { defaultCatalog, patternOf, type Catalog } from "../src/exercises";
import { GROUP_EN } from "../src/i18n";
import { catalogOf, emptyStore, generateSession, type Store } from "../src/logic";
import { InvalidInput, parseCatalogImport, parseStoreImport } from "../src/validate";

const clone = (c: Catalog): Catalog => JSON.parse(JSON.stringify(c)) as Catalog;

describe("parseCatalogImport", () => {
  test("the built-in catalog round-trips", () => {
    const c = parseCatalogImport(clone(defaultCatalog()));
    expect(Object.keys(c.exercises).length).toBe(54);
    expect(c.exercises.pushup.steps.length).toBe(3);
    expect(c.exercises.pushup.focus).toBe("胸下部と上腕三頭");
    expect(c.joints).toContain("背骨");
  });

  test("loads and pattern round-trip; bad loads are rejected", () => {
    const c = parseCatalogImport(clone(defaultCatalog()));
    expect(c.exercises.pushup.loads).toEqual([30, 45, 55, 60, 70, 80, 95, 120]);
    expect(c.exercises.pushup.pattern).toBe("push");
    const raw = clone(defaultCatalog()) as unknown as { exercises: Record<string, Record<string, unknown>> };
    raw.exercises.pushup.loads = [30, 45];
    expect(() => parseCatalogImport(raw)).toThrow(InvalidInput);
    raw.exercises.pushup.loads = [30, 45, 55, 60, 70, 80, 95, -1];
    expect(() => parseCatalogImport(raw)).toThrow(InvalidInput);
    raw.exercises.pushup.loads = [30, 45, 55, 60, 70, 80, 95, 120];
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

  test("a legacy catalog carrying rotations still parses, and drops them", () => {
    const raw = clone(defaultCatalog()) as unknown as Record<string, unknown>;
    raw.rotations = [{ id: "A", title: "A", exerciseIds: ["pushup", "nope"] }];
    const c = parseCatalogImport(raw);
    expect("rotations" in c).toBe(false);
    expect(Object.keys(c.exercises).length).toBe(54);
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
    a.jointToMuscleParts = { "存在しない関節": ["胸下部"] };
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

  test("unilateralFrom round-trips and is validated", () => {
    const c = parseCatalogImport(clone(defaultCatalog()));
    expect(c.exercises.pushup.unilateralFrom).toBe(6);
    expect(c.exercises.tableRow.unilateralFrom).toBe(3);
    // Out of range: 0 would mean the whole family (use unilateral),
    // and the ladder length itself is past the last step.
    const a = clone(defaultCatalog());
    a.exercises.pushup.unilateralFrom = 0;
    expect(() => parseCatalogImport(a)).toThrow(InvalidInput);
    const b = clone(defaultCatalog());
    b.exercises.pushup.unilateralFrom = b.exercises.pushup.ladder.length;
    expect(() => parseCatalogImport(b)).toThrow(InvalidInput);
    // Timed exercises cannot carry it either.
    const d = clone(defaultCatalog());
    d.exercises.wallSit.unilateralFrom = 1;
    expect(() => parseCatalogImport(d)).toThrow(InvalidInput);
  });
});

describe("custom catalog in the store", () => {
  test("catalogOf falls back to the built-in catalog when absent or broken", () => {
    expect(catalogOf(emptyStore()).exercises.pushup.name).toBe("プッシュアップ");
    const broken = { ...emptyStore(), catalog: { exercises: {} } } as unknown as Store;
    expect(catalogOf(broken).exercises.pushup.name).toBe("プッシュアップ");
  });

  test("generation follows the store's catalog: a renamed exercise is used", () => {
    const cat = clone(defaultCatalog());
    cat.exercises.pushup.name = "腕立て伏せ";
    const store: Store = { ...emptyStore(), catalog: cat };
    const s = generateSession(store, "2026-01-05", null);
    const pushup = s.exercises.find((e) => e.baseId === "pushup")!;
    expect(pushup).toBeDefined();
    expect(pushup.name).toBe("腕立て伏せ");
  });

  test("a custom joint mapping drives exclusion through the map", () => {
    const cat = clone(defaultCatalog());
    // Map 肩 to the chest parts as well: shoulder joint pain at
    // level 5 then makes the chest exercise's (pushup) pain
    // coefficient 0 through the mapping, so it cannot be selected.
    cat.jointToMuscleParts["肩"] = ["肩前部", "胸下部"];
    const store: Store = { ...emptyStore(), catalog: cat };
    const s = generateSession(store, "2026-01-05", { date: "2026-01-05", soreness: {}, jointPain: { "肩": 5 }, redFlags: [] });
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

describe("catalog / client / i18n parity", () => {
  test("every family's muscle group has an English label", () => {
    // A group missing from GROUP_EN falls back to raw Japanese in
    // the English report chart.
    for (const def of Object.values(defaultCatalog().exercises)) {
      expect(GROUP_EN[def.muscleGroup]).toBeDefined();
    }
  });

  test("the client's pain-grid groups cover exactly the catalog's parts", () => {
    // PART_GROUPS in public/app.js is a hand-maintained copy of the
    // part taxonomy; if it drifts from MUSCLE_PARTS a part silently
    // lands in the client's "other" bucket.
    const appJs = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
    const block = appJs.match(/const PART_GROUPS = \[([\s\S]*?)\];/);
    expect(block).not.toBeNull();
    const parts = defaultCatalog().muscleParts;
    const grouped = [...block![1].matchAll(/"([^"]+)"/g)]
      .map((m) => m[1])
      .filter((s) => parts.includes(s));
    expect(new Set(grouped)).toEqual(new Set(parts));
    expect(grouped.length).toBe(parts.length);
  });

  test("every part has a fallback pattern (patternOf never returns a raw part name)", () => {
    const c = defaultCatalog();
    for (const part of c.muscleParts) {
      const probe = { ...c.exercises.pushup, painPart: part, pattern: undefined };
      expect(["push", "pull", "legs", "core"]).toContain(patternOf(probe));
    }
  });
});

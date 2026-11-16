import {
  INTRO_SESSIONS, defaultCatalog, loadOf, patternOf,
  type Catalog, type ExerciseDef,
} from "./exercises";
import {
  SRV, jointName, partName, redFlagLabel, subjectName, type Lang, type Theme,
} from "./i18n";

export interface Profile {
  age: number | null; sex: string; heightCm: number | null; weightKg: number | null;
  /** One merged free-text note (previously two fields, bodyFatNote /
   *  habitNote — see migrateProfile for how saved data is carried over). */
  note: string;
}
/** Carry a saved profile forward to the current shape, without losing
 *  anything: the two legacy free-text fields (bodyFatNote / habitNote)
 *  are merged into the single `note` field, joined with a newline when
 *  both are non-empty, and a legacy free-text sex value that is not one
 *  of the select options （男性 / 女性 / "" = prefer not to say) is folded
 *  to "". Idempotent: a profile already in the new shape passes through
 *  unchanged. Applied to every store load (src/store.ts), so on-disk
 *  data upgrades itself the next time it is saved. */
export function migrateProfile(p: Profile | null | undefined): Profile | null {
  if (!p) return null;
  const raw = p as Profile & { bodyFatNote?: unknown; habitNote?: unknown };
  const parts = [raw.bodyFatNote, raw.habitNote].filter((v): v is string => typeof v === "string" && v !== "");
  const legacy = parts.join("\n");
  const note = typeof p.note === "string" && p.note !== "" ? p.note : legacy;
  const sex = p.sex === "男性" || p.sex === "女性" ? p.sex : "";
  return { age: p.age ?? null, sex, heightCm: p.heightCm ?? null, weightKg: p.weightKg ?? null, note };
}
export interface PainEntry {
  date: string;
  soreness: Record<string, number>;
  jointPain: Record<string, number>;
  redFlags: string[]; // ids answered YES
}
/** One logged set: a plain count, or — for unilateral exercises, which
 *  are performed one side at a time — a left/right pair. Plain numbers
 *  stay valid everywhere (older data never has pairs). */
export type SetLog = number | { l: number; r: number };
/** A set's contribution to a total: a pair counts as left + right. */
export const setSum = (v: SetLog): number => (typeof v === "number" ? v : v.l + v.r);
/** A set's value for achievement: a pair counts by its weaker side. */
export const setWeak = (v: SetLog): number => (typeof v === "number" ? v : Math.min(v.l, v.r));

export interface SessionExercise {
  id: number; baseId: string; name: string; muscleGroup: string; painPart: string;
  variation: string; ladderIndex: number;
  targetSets: number; targetReps: number; targetUnit: "回" | "秒";
  cue: string;
  loggedSets: SetLog[]; rpe: number | null; completed: boolean;
  /** Per-exercise memo only. There is intentionally no session-wide memo. */
  note: string;
}
/** An exercise counts as recorded once anything was actually logged for
 *  it: a set above zero, an RPE, a note, or the completed flag. Recorded
 *  exercises are fixed premises when a session plan is rebuilt. */
export function isRecordedExercise(ex: SessionExercise): boolean {
  return ex.completed || ex.rpe != null || (ex.note ?? "").trim() !== ""
    || ex.loggedSets.some((v) => setSum(v) > 0);
}
export interface Session {
  id: number; date: string; rotation: string; title: string;
  status: "planned" | "completed"; intro: boolean;
  focusNote: string; progressionNotes: string[];
  exercises: SessionExercise[]; totalVolume: number;
}
/** One recorded profile change: the fields that differed on one save. */
export interface ProfileChange {
  field: string; label: string;
  from: string | number | null; to: string | number | null;
}
export interface ProfileHistoryEntry { at: string; changes: ProfileChange[] }
export interface Store {
  profile: Profile | null;
  pain: PainEntry[];
  sessions: Session[];
  nextSessionId: number; nextExerciseId: number;
  /** Append-only log of profile edits (empty for data saved before it existed). */
  profileHistory: ProfileHistoryEntry[];
  /** UI language ("ja" | "en"); absent means Japanese (data saved before it existed). */
  lang?: Lang;
  /** Colour theme ("dark" | "light" | "system"); absent means "system"
   *  (follow the OS prefers-color-scheme), the default. */
  theme?: Theme;
  /** The user's own menu definition (settings screen editor / import);
   *  absent means the built-in catalog. Writes are fully validated
   *  (parseCatalogImport); catalogOf() also sanity-checks on read, so a
   *  hand-corrupted store file falls back to the built-in catalog
   *  instead of breaking session generation. */
  catalog?: Catalog;
  /** Stored-data format version; absent means 1 (pre catalog
   *  expansion). migrateStoreData brings older stores forward. */
  dataVersion?: number;
}

/** The catalog a store runs on: its own when present and structurally
 *  sane, otherwise the built-in default. The sanity check is cheap and
 *  shallow on purpose — full validation happens on every write path. */
export function catalogOf(store: Store): Catalog {
  const c = store.catalog;
  if (c && typeof c === "object"
    && c.exercises && typeof c.exercises === "object" && Object.keys(c.exercises).length > 0
    && Array.isArray(c.muscleParts) && Array.isArray(c.joints)) {
    return c;
  }
  return defaultCatalog();
}
export const emptyStore = (): Store => ({ profile: null, pain: [], sessions: [], nextSessionId: 1, nextExerciseId: 1, profileHistory: [] });

/** Current stored-data format version. Version 2 is the 2026-11-16
 *  catalog expansion: the pain parts split from 10 into 19 finer
 *  parts, and several ladders gained inserted steps, which shifts
 *  the meaning of a recorded ladderIndex. Version 3 is the same
 *  day's second round: the pushup ladder gained an incline step
 *  (and its wide step was repriced), shifting pushup indexes again.
 *  Adding families or parts (round 2 also added both) does not by
 *  itself need a version: stored data simply has no records for
 *  them yet. Only a change that reinterprets stored values does. */
export const STORE_DATA_VERSION = 3;

/** Where a pre-expansion pain part's history lands after the split:
 *  each old part's primary successor (an old part that split several
 *  ways keeps one home; parts that did not split are absent here). */
export const LEGACY_PART_PRIMARY: Record<string, string> = {
  "胸": "胸下部", "肩": "肩前部", "上腕": "上腕三頭", "背中": "背中上部",
  "脚（前）": "大腿四頭筋", "脚（後ろ）・お尻": "ハムストリング",
  "腹筋": "腹筋上部", "体幹": "体幹深部",
};

/** Old ladder index -> new ladder index, per family whose ladder
 *  gained inserted steps in the expansion (append-only families are
 *  the identity and need no entry). deadBug and superman are legacy
 *  baseIds the expansion re-admits as families: their recorded
 *  step 0 was the standard form, which sits at index 1 in the new
 *  ladders. calf, the third re-admitted legacy id, needs no entry:
 *  its recorded step 0 （両脚カーフレイズ） is still step 0. */
export const LADDER_INDEX_REMAP: Record<string, Record<number, number>> = {
  pushup: { 0: 0, 1: 1, 2: 3, 3: 5 },
  squat: { 0: 0, 1: 1, 2: 3 },
  plank: { 0: 0, 1: 2, 2: 3 },
  legRaise: { 0: 0, 1: 1, 2: 3 },
  gluteBridge: { 0: 0, 1: 1, 2: 3 },
  deadBug: { 0: 1 },
  superman: { 0: 1 },
};

/** Version 2 -> 3 ladder remap: the pushup ladder gained an
 *  incline step at index 1, so every step from 膝つき on shifts
 *  by one. Only pushup changed; the wide step's repricing
 *  (55 -> 50) does not move any index. */
export const LADDER_INDEX_REMAP_V3: Record<string, Record<number, number>> = {
  pushup: { 0: 0, 1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 7, 7: 8 },
};

/** Bring a store written before the catalog expansion forward, in
 *  place: rename pain-entry soreness keys to the finer parts (the
 *  larger level wins when an old and a new key collide) and remap
 *  recorded ladder indexes whose ladders gained inserted steps.
 *  Version-gated and idempotent; applied on store load and on
 *  import, so the rest of the code only ever sees current data.
 *  Assumes the built-in taxonomy — a store carrying its own custom
 *  catalog from before the expansion would need its pain keys
 *  renamed by hand to match its own parts, and its recorded ladder
 *  indexes checked against its own ladders (the remap below shifts
 *  indexes for the built-in ladders' inserted steps). Lookups into
 *  the two maps go through Object.hasOwn so a crafted key like
 *  "constructor" in imported data cannot resolve through the
 *  prototype chain. */
export function migrateStoreData(store: Store): Store {
  let version = store.dataVersion ?? 1;
  if (version >= STORE_DATA_VERSION) return store;
  if (version < 2) {
    for (const entry of store.pain) {
      const renamed: Record<string, number> = {};
      for (const [part, level] of Object.entries(entry.soreness ?? {})) {
        const next = Object.hasOwn(LEGACY_PART_PRIMARY, part) ? LEGACY_PART_PRIMARY[part] : part;
        renamed[next] = Math.max(renamed[next] ?? 0, level);
      }
      entry.soreness = renamed;
    }
    for (const session of store.sessions) {
      for (const ex of session.exercises) {
        const map = Object.hasOwn(LADDER_INDEX_REMAP, ex.baseId) ? LADDER_INDEX_REMAP[ex.baseId] : undefined;
        if (map && Object.hasOwn(map, ex.ladderIndex)) ex.ladderIndex = map[ex.ladderIndex];
      }
    }
    version = 2;
  }
  if (version < 3) {
    for (const session of store.sessions) {
      for (const ex of session.exercises) {
        const map = Object.hasOwn(LADDER_INDEX_REMAP_V3, ex.baseId) ? LADDER_INDEX_REMAP_V3[ex.baseId] : undefined;
        if (map && Object.hasOwn(map, ex.ladderIndex)) ex.ladderIndex = map[ex.ladderIndex];
      }
    }
    version = 3;
  }
  store.dataVersion = STORE_DATA_VERSION;
  return store;
}

// ---------- profile change history ----------
// Every profile save is diffed against the stored one; the differences
// (field, before, after) are kept in store.profileHistory so the user
// can see how their profile evolved. A first save records every field
// against null.
const PROFILE_FIELDS: { key: keyof Profile; label: string }[] = [
  { key: "age", label: "年齢" },
  { key: "sex", label: "性別" },
  { key: "heightCm", label: "身長" },
  { key: "weightKg", label: "体重" },
  { key: "note", label: "補足" },
];
export function diffProfile(prev: Profile | null, next: Profile): ProfileChange[] {
  const out: ProfileChange[] = [];
  for (const f of PROFILE_FIELDS) {
    const from = prev ? prev[f.key] : null;
    const to = next[f.key];
    if (from !== to) out.push({ field: f.key, label: f.label, from, to });
  }
  return out;
}

// ---------- pain assessment ----------
// Criteria (see README): red flags first; muscle soreness 2 = reduce, 3+ = exclude;
// joint pain stricter (2 = reduce, 3+ = exclude) and also applies through the
// explicit JOINT_TO_MUSCLE_PARTS mapping; full rest only when level 4+ soreness
// is present in 2+ parts. This assessment drives the start gates (only red
// flags block) and the condition screen's per-part display; the menu planner
// itself prices pain through the finer 5-step coefficients (painFactorOf),
// and next-day pain reaches it through the next day's own pain entry —
// there is no separate 24-hour-rule adjustment anymore.
export interface PartAssessment { subject: string; kind: "muscle" | "joint"; level: number; action: "train" | "reduce" | "exclude"; reasons: string[] }
export interface Assessment {
  care: boolean; careReasons: string[]; rest: boolean; restReason: string;
  parts: PartAssessment[]; excludedParts: string[]; reducedParts: string[];
}
export function assessPain(entry: PainEntry | null, lang: Lang = "ja"): Assessment {
  const T = SRV[lang];
  const parts: PartAssessment[] = [];
  if (entry) {
    for (const [subject, level] of Object.entries(entry.soreness)) {
      const reasons: string[] = [];
      let action: PartAssessment["action"] = "train";
      if (level >= 3) { action = "exclude"; reasons.push(T.assessMuscleExclude(level)); }
      else if (level === 2) { action = "reduce"; reasons.push(T.assessMuscleReduce); }
      parts.push({ subject, kind: "muscle", level, action, reasons });
    }
    for (const [subject, level] of Object.entries(entry.jointPain)) {
      const reasons: string[] = [];
      let action: PartAssessment["action"] = "train";
      if (level >= 3) { action = "exclude"; reasons.push(T.assessJointExclude(level)); }
      else if (level === 2) { action = "reduce"; reasons.push(T.assessJointReduce); }
      parts.push({ subject, kind: "joint", level, action, reasons });
    }
  }
  const careReasons = (entry?.redFlags ?? []).map((id) => T.careReason(redFlagLabel(id, lang)));
  const strongParts = parts.filter((p) => p.kind === "muscle" && p.level >= 4);
  const rest = careReasons.length === 0 && strongParts.length >= 2;
  return {
    care: careReasons.length > 0, careReasons,
    rest, restReason: rest ? T.restReason(strongParts.length) : "",
    parts,
    excludedParts: parts.filter((p) => p.action === "exclude").map((p) => p.subject),
    reducedParts: parts.filter((p) => p.action === "reduce").map((p) => p.subject),
  };
}

// ---------- date helpers (all dates are YYYY-MM-DD, Asia/Tokyo) ----------
const DAY_MS = 86_400_000;
const parseDay = (d: string) => Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)));
const fmtDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);
export const addDays = (d: string, n: number) => fmtDay(parseDay(d) + n * DAY_MS);
export const diffDays = (from: string, to: string) => Math.round((parseDay(to) - parseDay(from)) / DAY_MS);

// ---------- pain duration guidance (caution only, never a block) ----------
// Counts, per part, the run of consecutive days (ending at the latest record)
// with pain level >= 1, i.e. days it has not resolved. Muscle soreness that
// lasts 5+ days and joint pain that lasts 14+ days are "see a doctor"
// guidance; joint pain at 7+ days is a caution. Red flags remain the only
// start block.
export interface PainGuidance {
  subject: string; kind: "muscle" | "joint"; days: number;
  severity: "caution" | "care"; message: string;
}
export function painDurationGuidance(store: Store, lang: Lang = "ja"): PainGuidance[] {
  const entries = [...store.pain].sort((a, b) => a.date.localeCompare(b.date));
  if (!entries.length) return [];
  const streak = (get: (e: PainEntry) => number): number => {
    let days = 0; let expected: string | null = null;
    for (let i = entries.length - 1; i >= 0; i--) {
      const e = entries[i];
      if (expected !== null && e.date !== expected) break; // gap in the record breaks the run
      if (get(e) < 1) break; // resolved
      days++; expected = addDays(e.date, -1);
    }
    return days;
  };
  const out: PainGuidance[] = [];
  const T = SRV[lang];
  const muscleParts = new Set(entries.flatMap((e) => Object.keys(e.soreness)));
  for (const part of muscleParts) {
    const days = streak((e) => e.soreness[part] ?? 0);
    if (days >= 5) out.push({ subject: part, kind: "muscle", days, severity: "care", message: T.guidanceMuscleCare(partName(part, lang), days) });
  }
  const joints = new Set(entries.flatMap((e) => Object.keys(e.jointPain)));
  for (const joint of joints) {
    const days = streak((e) => e.jointPain[joint] ?? 0);
    if (days >= 14) out.push({ subject: joint, kind: "joint", days, severity: "care", message: T.guidanceJointCare(jointName(joint, lang), days) });
    else if (days >= 7) out.push({ subject: joint, kind: "joint", days, severity: "caution", message: T.guidanceJointCaution(jointName(joint, lang), days) });
  }
  return out;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const round5 = (v: number) => Math.max(10, Math.round(v / 5) * 5);

/** A record counts as "cannot do" when every logged set is 0, or the
 *  per-exercise memo says so. */
export function isCannotDo(prev: SessionExercise): boolean {
  const allZero = prev.loggedSets.length > 0 && prev.loggedSets.every((v) => setSum(v) === 0);
  const memoCannot = /できない|1回もでき|一回もでき/.test(prev.note ?? "");
  return allZero || memoCannot;
}

// ---------- load-based menu planning ----------
// The menu is planned in load points, not rotations. Every ladder
// step carries a load value (points per rep, per second for timed
// exercises — see loadOf). A session has a load budget; exercises
// are selected for movement-pattern coverage and part recency, the
// budget is distributed across them in proportion to their usual
// load, each exercise's share is scaled by its pain coefficient,
// and reps are solved back from the share: reps = share / (step
// load x personal factor x sets). The personal factor prices one
// rep for this user today (the design's "second value"): after an
// easy session a rep is estimated cheaper, so more reps fit the
// same load; after a hard one, costlier. A pain coefficient only
// ever shrinks its own exercise's share — the freed load is not
// redistributed, so the session total drops on painful days, and
// two exercises on the same part split that part's portion of the
// budget instead of each receiving a full independent target.

export const PAIN_FACTOR_MUSCLE: readonly number[] = [1, 0.9, 0.7, 0.45, 0.2, 0];
export const PAIN_FACTOR_JOINT: readonly number[] = [1, 0.8, 0.55, 0.25, 0.1, 0];
const factorAt = (table: readonly number[], level: number): number =>
  table[clamp(Math.round(Number.isFinite(level) ? level : 0), 0, 5)];

/** Pain coefficient for one exercise under today's entry: the
 *  muscle part's soreness factor times the worst joint factor among
 *  the joints the exercise loads, directly or through the
 *  joint-to-part map. 1 = unaffected, 0 = cannot be selected. */
export function painFactorOf(def: ExerciseDef, entry: PainEntry | null, catalog: Catalog): number {
  if (!entry) return 1;
  const muscle = factorAt(PAIN_FACTOR_MUSCLE, entry.soreness?.[def.painPart] ?? 0);
  if (muscle === 0) return 0;
  let joint = 1;
  for (const j of catalog.joints) {
    const loads = def.jointParts.includes(j)
      || (catalog.jointToMuscleParts[j] ?? []).includes(def.painPart);
    if (loads) joint = Math.min(joint, factorAt(PAIN_FACTOR_JOINT, entry.jointPain?.[j] ?? 0));
    if (joint === 0) break;
  }
  return muscle * joint;
}

const weakTotal = (ex: SessionExercise): number =>
  ex.loggedSets.reduce((a: number, v) => a + setWeak(v), 0);

/** The load one recorded exercise delivered, in points: step load
 *  x performed amount (the weaker side for unilateral exercises, as
 *  in the achievement measure). Exercises whose baseId is no longer
 *  in the catalog (legacy records from older catalogs) are priced at
 *  the generic anchor — 60 points per rep, 4 per second — so old
 *  sessions still contribute a plausible score instead of zero. */
export function exerciseLoad(ex: SessionExercise, catalog: Catalog): number {
  const def = catalog.exercises[ex.baseId];
  const price = def ? loadOf(def, ex.ladderIndex) : (ex.targetUnit === "秒" ? 4 : 60);
  return price * weakTotal(ex);
}

/** The load a completed session actually delivered, in points:
 *  the sum of its exercises' loads. This is the score totals and
 *  graphs are based on — never a mixed reps-plus-seconds sum. */
export function achievedLoad(s: Session, catalog: Catalog): number {
  return s.exercises.reduce((sum, ex) => sum + exerciseLoad(ex, catalog), 0);
}

/** The load an exercise was planned to deliver (its target load). */
export function targetLoadOf(ex: SessionExercise, catalog: Catalog): number {
  const def = catalog.exercises[ex.baseId];
  return def ? loadOf(def, ex.ladderIndex) * ex.targetReps * ex.targetSets : 0;
}

export interface PersonalAdj {
  /** Scales the exercise's share of the budget (memo feedback). */
  shareScale: number;
  /** Prices one rep for this user (the second value's coefficient). */
  repFactor: number;
  cannotDo: boolean;
  notes: string[];
}

/** What the exercise's last completed record says about today.
 *  Priority mirrors the old per-exercise decision: cannot-do first,
 *  then the per-exercise memo (share of the budget), then RPE +
 *  achievement (the price of one rep). */
export function personalAdjustment(def: ExerciseDef, prev: SessionExercise | null, intro: boolean, lang: Lang = "ja"): PersonalAdj {
  const T = SRV[lang];
  if (!prev) {
    return { shareScale: 1, repFactor: 1, cannotDo: false, notes: [intro ? T.noteFirstIntro : T.noteFirst] };
  }
  if (isCannotDo(prev)) return { shareScale: 1, repFactor: 1, cannotDo: true, notes: [] };
  const memo = (prev.note ?? "").trim();
  if (memo) {
    if (/痛|違和感/.test(memo)) return { shareScale: 0.7, repFactor: 1, cannotDo: false, notes: [T.noteMemoPain(memo)] };
    if (/きつ|しんど|つら|限界/.test(memo)) return { shareScale: 0.85, repFactor: 1, cannotDo: false, notes: [T.noteMemoHard(memo)] };
    if (/楽だった|楽に|余裕/.test(memo)) return { shareScale: 1.15, repFactor: 1, cannotDo: false, notes: [T.noteMemoEasy(memo)] };
    if (/ちょうど/.test(memo)) return { shareScale: 1, repFactor: 1, cannotDo: false, notes: [T.noteMemoJust(memo)] };
  }
  const rpe = prev.rpe;
  if (rpe === null || rpe === undefined) {
    return { shareScale: 1, repFactor: 1, cannotDo: false, notes: [T.noteNoRpe] };
  }
  const goalTotal = prev.targetReps * prev.targetSets;
  const achievement = goalTotal > 0 ? weakTotal(prev) / goalTotal : 0;
  const achPct = Math.round(achievement * 100);
  let repFactor = 1;
  if (achievement >= 1 && rpe <= 7) repFactor = 0.9;
  else if (rpe <= 6.5 && achievement >= 0.8) repFactor = 0.95;
  else if (rpe >= 9.5) repFactor = achievement < 0.6 ? 1.15 : 1.1;
  else if (rpe > 8.5) repFactor = achievement >= 0.8 ? 1 : 1.05;
  const notes: string[] = [];
  if (repFactor < 1) notes.push(T.planRepEasy(rpe, achPct));
  else if (repFactor > 1) notes.push(T.planRepHard(rpe, achPct));
  return { shareScale: 1, repFactor, cannotDo: false, notes };
}

// ---------- exercise selection (no rotations) ----------
export interface MenuCandidate {
  def: ExerciseDef; factor: number; partDays: number; exDays: number;
}
const NEVER_DAYS = 100000; // days-since sentinel for "never trained"
export const MENU_SIZE = 6;
const MAX_PER_PART = 2;
const PATTERN_ORDER = ["push", "pull", "legs", "core"];

function recencyOf(store: Store, date: string): { partDays: (part: string) => number; exDays: (baseId: string) => number } {
  const partLast = new Map<string, string>();
  const exLast = new Map<string, string>();
  for (const s of store.sessions) {
    if (s.status !== "completed") continue;
    for (const ex of s.exercises) {
      if ((exLast.get(ex.baseId) ?? "") < s.date) exLast.set(ex.baseId, s.date);
      if ((partLast.get(ex.painPart) ?? "") < s.date) partLast.set(ex.painPart, s.date);
    }
  }
  const days = (m: Map<string, string>, k: string) => {
    const d = m.get(k);
    return d ? Math.max(0, diffDays(d, date)) : NEVER_DAYS;
  };
  return { partDays: (p) => days(partLast, p), exDays: (id) => days(exLast, id) };
}

/** Pick the menu's exercises: movement-pattern coverage first, then
 *  the stalest parts and exercises, at most MAX_PER_PART exercises
 *  per muscle part. Exercises whose pain coefficient is 0 under the
 *  given entry are not candidates (pass entry = null to ignore pain,
 *  e.g. for the next-menu preview). */
export function selectExercises(
  store: Store, catalog: Catalog, entry: PainEntry | null, date: string,
  opts: { exclude?: Set<string>; partCounts?: Map<string, number>; count?: number } = {},
): MenuCandidate[] {
  const recency = recencyOf(store, date);
  const exclude = opts.exclude ?? new Set<string>();
  const counts = new Map<string, number>(opts.partCounts ?? []);
  const count = opts.count ?? MENU_SIZE;
  const cands: MenuCandidate[] = [];
  for (const def of Object.values(catalog.exercises)) {
    if (exclude.has(def.baseId)) continue;
    const factor = painFactorOf(def, entry, catalog);
    if (factor <= 0) continue;
    cands.push({ def, factor, partDays: recency.partDays(def.painPart), exDays: recency.exDays(def.baseId) });
  }
  // Stable sort: full ties keep the catalog's definition order, so a
  // fresh start prefers the exercises defined first (pushup before
  // pike, squat before calf jump).
  cands.sort((a, b) => b.partDays - a.partDays || b.exDays - a.exDays);
  const picked: MenuCandidate[] = [];
  const pickedIds = new Set<string>();
  const tryPick = (c: MenuCandidate): boolean => {
    if (pickedIds.has(c.def.baseId)) return false;
    const n = counts.get(c.def.painPart) ?? 0;
    if (n >= MAX_PER_PART) return false;
    counts.set(c.def.painPart, n + 1);
    picked.push(c); pickedIds.add(c.def.baseId);
    return true;
  };
  const patterns = [...PATTERN_ORDER, ...cands.map((c) => patternOf(c.def))];
  for (const p of new Set(patterns)) {
    if (picked.length >= count) break;
    for (const c of cands) {
      if (patternOf(c.def) === p && tryPick(c)) break;
    }
  }
  for (const c of cands) {
    if (picked.length >= count) break;
    tryPick(c);
  }
  return picked;
}

const PATTERN_LABEL: Record<string, Record<Lang, string>> = {
  push: { ja: "押す", en: "Push" }, pull: { ja: "引く", en: "Pull" },
  legs: { ja: "脚", en: "Legs" }, core: { ja: "体幹", en: "Core" },
};
/** A session title from its movement patterns, in order: the
 *  patterns joined with " + ", or the full-body label when all four
 *  main patterns are present. Stored titles use the Japanese form;
 *  the preview passes the display language. */
export function menuTitleOf(patterns: string[], lang: Lang = "ja"): string {
  const uniq = [...new Set(patterns)];
  if (PATTERN_ORDER.every((p) => uniq.includes(p))) return lang === "en" ? "Full body" : "全身";
  return uniq.map((p) => PATTERN_LABEL[p]?.[lang] ?? p).join(" + ");
}

/** Title of the next menu, ignoring pain (a preview for displays
 *  that cannot know tomorrow's pain check yet). */
export function previewNextTitle(store: Store, date: string, lang: Lang = "ja"): string {
  const picked = selectExercises(store, catalogOf(store), null, date, {});
  return menuTitleOf(picked.map((c) => patternOf(c.def)), lang);
}

// ---------- planning ----------
const REP_RANGE: Record<string, [number, number]> = { "回": [3, 40], "秒": [10, 120] };

function lastCompletedOf(store: Store, baseId: string): SessionExercise | null {
  const found = [...store.sessions].reverse()
    .flatMap((s) => s.exercises.map((e) => ({ s, e })))
    .find(({ s, e }) => s.status === "completed" && e.baseId === baseId);
  return found?.e ?? null;
}

interface PlanResult { exercises: SessionExercise[]; notes: string[]; title: string; alt: boolean }

/** Plan the unrecorded part of a menu. `fixed` exercises (already
 *  recorded in a session being rebuilt) stay out of the selection,
 *  count toward the per-part cap, and consume their planned load
 *  from the budget. */
function planMenu(store: Store, date: string, entry: PainEntry | null, lang: Lang, opts: { intro: boolean; fixed?: SessionExercise[] }): PlanResult {
  const T = SRV[lang];
  const catalog = catalogOf(store);
  const fixed = opts.fixed ?? [];
  const fixedIds = new Set(fixed.map((e) => e.baseId));
  const fixedParts = new Map<string, number>();
  for (const e of fixed) fixedParts.set(e.painPart, (fixedParts.get(e.painPart) ?? 0) + 1);
  const fixedLoad = fixed.reduce((a, e) => a + targetLoadOf(e, catalog), 0);
  const slotsLeft = Math.max(0, MENU_SIZE - fixed.length);

  const picked = selectExercises(store, catalog, entry, date, { exclude: fixedIds, partCounts: fixedParts, count: slotsLeft });
  const noPain = selectExercises(store, catalog, null, date, { exclude: fixedIds, partCounts: fixedParts, count: slotsLeft });
  const pickedIds = new Set(picked.map((c) => c.def.baseId));
  const dropped = noPain.filter((c) => !pickedIds.has(c.def.baseId));

  interface Slot {
    cand: MenuCandidate; def: ExerciseDef; adj: PersonalAdj;
    step: number; sets: number; weight: number; notes: string[];
  }
  const slots: Slot[] = [];
  for (const cand of picked) {
    let def = cand.def;
    const prev = lastCompletedOf(store, def.baseId);
    const adj = personalAdjustment(def, prev, opts.intro && !prev, lang);
    const notes = [...adj.notes];
    let step = prev ? prev.ladderIndex : (opts.intro ? Math.max(0, def.defaultLadder - 1) : def.defaultLadder);
    let sets = prev ? prev.targetSets : (opts.intro ? Math.max(1, def.baseSets - 1) : def.baseSets);
    let baseReps = prev ? prev.targetReps : def.baseTarget;
    if (adj.cannotDo) {
      const memo = (prev?.note ?? "").trim();
      const subId = catalog.substitutes[def.baseId];
      if (step > 0) {
        step -= 1; baseReps = def.baseTarget;
        notes.push(T.noteCannotLadder(def.ladder[step], memo || T.noteCannotNoReps));
      } else if (subId && catalog.exercises[subId] && !fixedIds.has(subId)
        && !picked.some((c) => c.def.baseId === subId)) {
        def = catalog.exercises[subId];
        step = 0; sets = opts.intro ? Math.max(1, def.baseSets - 1) : def.baseSets; baseReps = def.baseTarget;
        notes.push(T.noteCannotSubstitute(def.name, def.ladder[0]));
      } else {
        adj.shareScale *= 0.5;
        notes.push(T.noteCannotHalve);
      }
    }
    const weight = loadOf(def, step) * baseReps * sets * adj.shareScale;
    slots.push({ cand, def, adj, step, sets, weight, notes });
  }

  const sumW = slots.reduce((a, s) => a + s.weight, 0);
  const completed = store.sessions.filter((s) => s.status === "completed")
    .sort((a, b) => a.date.localeCompare(b.date));
  const recent = completed.slice(-3);
  let budget: number;
  const notes: string[] = [];
  if (recent.length) {
    const ref = recent.reduce((a, s) => a + achievedLoad(s, catalog), 0) / recent.length;
    budget = ref * 1.02;
    notes.push(T.planBudget(Math.round(budget)));
  } else {
    budget = sumW + fixedLoad;
    notes.push(T.planBudgetFirst);
  }
  const remaining = Math.max(0, budget - fixedLoad);
  for (const d of dropped) notes.push(T.planDropped(d.def.name));

  interface Solved { slot: Slot; step: number; reps: number; load: number }
  const solved: Solved[] = [];
  for (const slot of slots) {
    const share = sumW > 0 ? remaining * (slot.weight / sumW) : 0;
    const target = share * slot.cand.factor;
    const [min, max] = REP_RANGE[slot.def.unit];
    let step = slot.step;
    let reps = min;
    for (let i = 0; i < 10; i++) {
      const d = loadOf(slot.def, step) * slot.adj.repFactor;
      const raw = target / (d * slot.sets);
      if (raw > max && step < slot.def.ladder.length - 1) { step++; continue; }
      if (raw < min && step > 0) { step--; continue; }
      reps = slot.def.unit === "秒" ? round5(clamp(raw, min, max)) : clamp(Math.round(raw), min, max);
      break;
    }
    if (step !== slot.step) slot.notes.push(T.planStepChange(slot.def.ladder[step]));
    if (slot.cand.factor < 0.999) slot.notes.push(T.planPainFactor(Math.round(slot.cand.factor * 100)));
    solved.push({ slot, step, reps, load: loadOf(slot.def, step) * reps * slot.sets });
  }
  solved.sort((a, b) => b.load - a.load);
  const exercises: SessionExercise[] = [];
  for (const { slot, step, reps } of solved) {
    notes.push(...slot.notes.map((n) => `${slot.def.name}: ${n}`));
    exercises.push({
      id: store.nextExerciseId++, baseId: slot.def.baseId, name: slot.def.name,
      muscleGroup: slot.def.muscleGroup, painPart: slot.def.painPart,
      variation: slot.def.ladder[step], ladderIndex: step,
      targetSets: slot.sets, targetReps: reps, targetUnit: slot.def.unit, cue: slot.def.cue,
      loggedSets: Array(slot.sets).fill(0), rpe: null, completed: false, note: "",
    });
  }
  const titlePatterns = [...fixed, ...exercises].map((e) => {
    const def = catalog.exercises[e.baseId];
    return def ? patternOf(def) : "";
  }).filter((p) => p !== "");
  return { exercises, notes, title: menuTitleOf(titlePatterns, "ja"), alt: dropped.length > 0 };
}

export function generateSession(store: Store, date: string, entry: PainEntry | null, lang: Lang = "ja"): Session {
  const completedCount = store.sessions.filter((s) => s.status === "completed").length;
  const intro = completedCount < INTRO_SESSIONS;
  const plan = planMenu(store, date, entry, lang, { intro });
  return {
    id: store.nextSessionId++, date, rotation: "",
    title: plan.title + (plan.alt ? SRV[lang].titleAltSuffix : ""),
    status: "planned", intro,
    // focusNote stays a data field for compatibility; no text is
    // generated for it (the title's （代替）suffix marks menus that
    // pain changed, as before).
    focusNote: "",
    progressionNotes: plan.notes, exercises: plan.exercises, totalVolume: 0,
  };
}

// ---------- rebuild of a planned session on a condition change ----------
// Re-saving the condition check rebuilds the session around what is
// already recorded:
// - a completed session is never touched;
// - recorded exercises (isRecordedExercise) are fixed as they are —
//   exercise, target, and log all stay, and no remaining slot may
//   duplicate one of them;
// - every remaining slot is re-planned by the load planner, treating
//   the recorded exercises as the slots they already fill (they count
//   toward the per-part cap and consume their planned load from the
//   budget), and the newest pain entry applies to all of them — so an
//   exercise whose pain coefficient is now 0 drops out, and one that
//   was dropped before comes back when it clears;
// - if the new assessment is a warning-sign (care) or full-rest day,
//   every unrecorded exercise is removed and only the recorded part
//   stays, with the blocking reason left in the progression notes.
// The session's id, date, and intro flag never change.
export function refreshPlannedSession(store: Store, session: Session, entry: PainEntry | null, lang: Lang = "ja"): Session {
  if (session.status !== "planned") return session;
  const T = SRV[lang];
  const assessment = assessPain(entry, lang);
  const recorded = session.exercises.filter(isRecordedExercise);
  if (assessment.care || assessment.rest) {
    const kept: Session = { ...session, exercises: recorded };
    return {
      ...kept,
      progressionNotes: [assessment.care ? T.errBlockedRedFlag : T.errRestDay],
      totalVolume: sessionTotal(kept),
    };
  }
  const plan = planMenu(store, session.date, entry, lang, { intro: session.intro, fixed: recorded });
  const rebuilt: Session = {
    ...session,
    title: plan.title + (plan.alt ? T.titleAltSuffix : ""),
    focusNote: "",
    progressionNotes: plan.notes, exercises: [...recorded, ...plan.exercises], totalVolume: 0,
  };
  rebuilt.totalVolume = sessionTotal(rebuilt);
  return rebuilt;
}


export function sessionTotal(s: Session): number {
  return s.exercises.reduce((sum: number, e) => sum + e.loggedSets.reduce((a: number, v) => a + setSum(v), 0), 0);
}

// Input validation for the API. Every rule is enforced on the server, so a
// hand-sent request cannot store a broken value; the client (public/app.js)
// checks the same rules before sending and shows the same reason text.
// A rejected write answers HTTP 400 with the reason and stores nothing.
import { RED_FLAGS } from "./exercises";
import { sessionTotal, type PainEntry, type Profile, type ProfileHistoryEntry, type Session, type SessionExercise, type Store } from "./logic";

export class InvalidInput extends Error {}

const fail = (msg: string): never => { throw new InvalidInput(msg); };

export const REPS_MESSAGE = "回数は0〜999の整数で入力してください";
export const RPE_MESSAGE = "RPEは6〜10（0.5刻み）で入力してください";
export const PAIN_MESSAGE = "痛みレベルは0〜5の整数で入力してください";
export const NOTE_MESSAGE = "メモは200文字以内で入力してください";
export const DATE_MESSAGE = "日付はYYYY-MM-DD形式で入力してください";
export const NOTE_MAX = 200;

/** Set reps / seconds: an integer 0–999. Numbers only (no string coercion). */
export function validReps(v: unknown): number {
  if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > 999) fail(REPS_MESSAGE);
  return v as number;
}

/** RPE: null / "" / undefined means "not entered"; otherwise 6–10 in 0.5 steps. */
export function validRpe(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v !== "number" || !Number.isFinite(v) || v < 6 || v > 10 || !Number.isInteger(v * 2)) fail(RPE_MESSAGE);
  return v as number;
}

/** Pain level: an integer 0–5. */
export function validPainLevel(v: unknown): number {
  if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > 5) fail(PAIN_MESSAGE);
  return v as number;
}

/** Free-text note: a string of at most NOTE_MAX characters. */
export function validNote(v: unknown): string {
  if (typeof v !== "string" || v.length > NOTE_MAX) fail(NOTE_MESSAGE);
  return v as string;
}

/** Strict YYYY-MM-DD naming a real calendar day. */
export function isValidDateString(v: unknown): boolean {
  if (typeof v !== "string") return false;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return false;
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}
export function validDateString(v: unknown): string {
  if (!isValidDateString(v)) fail(DATE_MESSAGE);
  return v as string;
}

// ---------- profile ----------
// The client sends the raw input strings, so numeric fields accept numbers
// or numeric strings; an empty / missing required field is an error, never
// a silent null. Age and height are integers; weight may be decimal.
function numField(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    const t = v.trim();
    if (t === "") return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  return null;
}

export function parseProfile(b: Record<string, unknown>): Profile {
  const age = numField(b.age);
  if (age === null) fail("年齢を入力してください");
  if (!Number.isInteger(age) || age < 10 || age > 100) fail("年齢は10〜100の整数で入力してください");
  const heightCm = numField(b.heightCm);
  if (heightCm === null) fail("身長を入力してください");
  if (!Number.isInteger(heightCm) || heightCm < 100 || heightCm > 250) fail("身長は100〜250cmの整数で入力してください");
  const weightKg = numField(b.weightKg);
  if (weightKg === null) fail("体重を入力してください");
  if (weightKg < 20 || weightKg > 300) fail("体重は20〜300kgで入力してください");
  const text = (v: unknown): string => {
    if (v === null || v === undefined) return "";
    if (typeof v !== "string") fail("テキストの形式が正しくありません");
    if (v.length > NOTE_MAX) fail("補足は200文字以内で入力してください");
    return v;
  };
  return {
    age, sex: text(b.sex), heightCm, weightKg,
    bodyFatNote: text(b.bodyFatNote), habitNote: text(b.habitNote),
  };
}

// ---------- whole-store import (settings: data import) ----------
// An imported file replaces the whole store, so it is checked record by
// record before anything is written: the top-level keys must all be
// present, every record must have the right types, and the per-field
// validators above are reused wherever they apply (reps, RPE, notes,
// pain levels, profile, dates). Any problem throws InvalidInput and the
// caller answers 400 having stored nothing. Records are rebuilt field
// by field (unknown keys are dropped), each session's totalVolume is
// recomputed, and the id counters are raised past the largest imported
// id when needed so later sessions can never collide with imported ones.
export const IMPORT_MESSAGE = "インポートファイルの形式が正しくありません";

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const impStr = (v: unknown, max = 1000): string => {
  if (typeof v !== "string" || v.length > max) fail(IMPORT_MESSAGE);
  return v as string;
};
const impInt = (v: unknown, lo: number, hi: number): number => {
  if (typeof v !== "number" || !Number.isInteger(v) || v < lo || v > hi) fail(IMPORT_MESSAGE);
  return v as number;
};

function parseImportedExercise(v: unknown): SessionExercise {
  if (!isObj(v)) fail(IMPORT_MESSAGE);
  if (!Array.isArray(v.loggedSets) || v.loggedSets.length > 10) fail(IMPORT_MESSAGE);
  const unit = v.targetUnit;
  if (unit !== "回" && unit !== "秒") fail(IMPORT_MESSAGE);
  if (typeof v.completed !== "boolean") fail(IMPORT_MESSAGE);
  return {
    id: impInt(v.id, 1, Number.MAX_SAFE_INTEGER),
    baseId: impStr(v.baseId, 100), name: impStr(v.name), muscleGroup: impStr(v.muscleGroup, 100),
    painPart: impStr(v.painPart, 100), variation: impStr(v.variation), ladderIndex: impInt(v.ladderIndex, 0, 1000),
    targetSets: impInt(v.targetSets, 1, 10), targetReps: validReps(v.targetReps), targetUnit: unit,
    cue: impStr(v.cue), loggedSets: (v.loggedSets as unknown[]).map(validReps),
    rpe: validRpe(v.rpe), completed: v.completed, note: validNote(v.note),
  };
}

function parseImportedSession(v: unknown): Session {
  if (!isObj(v)) fail(IMPORT_MESSAGE);
  if (v.status !== "planned" && v.status !== "completed") fail(IMPORT_MESSAGE);
  if (typeof v.intro !== "boolean") fail(IMPORT_MESSAGE);
  if (!Array.isArray(v.exercises)) fail(IMPORT_MESSAGE);
  if (!Array.isArray(v.progressionNotes)) fail(IMPORT_MESSAGE);
  const s: Session = {
    id: impInt(v.id, 1, Number.MAX_SAFE_INTEGER),
    date: validDateString(v.date),
    rotation: impStr(v.rotation, 100), title: impStr(v.title),
    status: v.status, intro: v.intro,
    focusNote: impStr(v.focusNote), progressionNotes: (v.progressionNotes as unknown[]).map((n) => impStr(n)),
    exercises: (v.exercises as unknown[]).map(parseImportedExercise),
    totalVolume: 0,
  };
  s.totalVolume = sessionTotal(s);
  return s;
}

function parseImportedPain(v: unknown): PainEntry {
  if (!isObj(v)) fail(IMPORT_MESSAGE);
  const levels = (o: unknown): Record<string, number> => {
    if (!isObj(o)) fail(IMPORT_MESSAGE);
    const out: Record<string, number> = {};
    for (const [k, val] of Object.entries(o as Record<string, unknown>)) out[k] = validPainLevel(val);
    return out;
  };
  if (!Array.isArray(v.redFlags)) fail(IMPORT_MESSAGE);
  return {
    date: validDateString(v.date),
    soreness: levels(v.soreness), jointPain: levels(v.jointPain),
    // Unknown red-flag ids are dropped, as on the pain endpoint.
    redFlags: (v.redFlags as unknown[]).filter(
      (x): x is string => typeof x === "string" && RED_FLAGS.some((f) => f.id === x),
    ),
  };
}

// Profile history is optional in an import (exports written before it
// existed do not carry it); when present it is type-checked entry by
// entry and defaults to empty when absent.
function parseImportedProfileHistory(v: unknown): ProfileHistoryEntry[] {
  if (v === undefined) return [];
  if (!Array.isArray(v)) fail(IMPORT_MESSAGE);
  const scalar = (x: unknown): string | number | null => {
    if (x === null) return null;
    if (typeof x === "number" && Number.isFinite(x)) return x;
    return impStr(x);
  };
  return (v as unknown[]).map((e) => {
    if (!isObj(e) || !Array.isArray(e.changes)) fail(IMPORT_MESSAGE);
    return {
      at: impStr(e.at, 64),
      changes: (e.changes as unknown[]).map((c) => {
        if (!isObj(c)) fail(IMPORT_MESSAGE);
        return { field: impStr(c.field, 64), label: impStr(c.label, 64), from: scalar(c.from), to: scalar(c.to) };
      }),
    };
  });
}

export function parseStoreImport(v: unknown): Store {
  if (!isObj(v)) fail(IMPORT_MESSAGE);
  for (const k of ["profile", "pain", "sessions", "nextSessionId", "nextExerciseId"]) {
    if (!(k in v)) fail(IMPORT_MESSAGE);
  }
  if (!Array.isArray(v.pain) || !Array.isArray(v.sessions)) fail(IMPORT_MESSAGE);
  const profile = v.profile === null ? null : isObj(v.profile) ? parseProfile(v.profile) : fail(IMPORT_MESSAGE);
  const sessions = (v.sessions as unknown[]).map(parseImportedSession);
  const maxSessionId = sessions.reduce((a, s) => Math.max(a, s.id), 0);
  const maxExerciseId = sessions.reduce((a, s) => s.exercises.reduce((b, e) => Math.max(b, e.id), a), 0);
  return {
    profile,
    pain: (v.pain as unknown[]).map(parseImportedPain),
    sessions,
    nextSessionId: Math.max(impInt(v.nextSessionId, 1, Number.MAX_SAFE_INTEGER), maxSessionId + 1),
    nextExerciseId: Math.max(impInt(v.nextExerciseId, 1, Number.MAX_SAFE_INTEGER), maxExerciseId + 1),
    profileHistory: parseImportedProfileHistory(v.profileHistory),
  };
}

// Input validation for the API. Every rule is enforced on the server, so a
// hand-sent request cannot store a broken value; the client (public/app.js)
// checks the same rules before sending and shows the same reason text.
// A rejected write answers HTTP 400 with the reason and stores nothing.
// Reason texts come from the i18n tables (src/i18n.ts) in the store's
// language; every function takes an optional language, default Japanese.
import { RED_FLAGS } from "./exercises";
import { isLang, isTheme, VMSG, type Lang, type Theme } from "./i18n";
import { sessionTotal, type PainEntry, type Profile, type ProfileHistoryEntry, type Session, type SessionExercise, type SetLog, type Store } from "./logic";

export class InvalidInput extends Error {}

const fail = (msg: string): never => { throw new InvalidInput(msg); };

export const REPS_MESSAGE = VMSG.ja.reps;
export const RPE_MESSAGE = VMSG.ja.rpe;
export const PAIN_MESSAGE = VMSG.ja.pain;
export const NOTE_MESSAGE = VMSG.ja.note;
export const DATE_MESSAGE = VMSG.ja.date;
export const NOTE_MAX = 200;
/** The merged profile note's cap: two 200-char fields became one, so
 *  the cap grew to 500 (see DESIGN.md validation rules). */
export const NOTE_FIELD_MAX = 500;
/** Profile sex is a select: these are the only stored values. */
export const SEX_VALUES = ["男性", "女性", ""] as const;

/** Set reps / seconds: an integer 0–999. Numbers only (no string coercion). */
export function validReps(v: unknown, lang: Lang = "ja"): number {
  if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > 999) fail(VMSG[lang].reps);
  return v as number;
}

/** One logged set as stored: a plain count, or a left/right pair {l, r}
 *  for unilateral exercises. Each side goes through the same 0–999
 *  integer check; a malformed pair fails with the reps message. */
export function validSetLog(v: unknown, lang: Lang = "ja"): SetLog {
  if (isObj(v)) return { l: validReps(v.l, lang), r: validReps(v.r, lang) };
  return validReps(v, lang);
}

/** RPE: null / "" / undefined means "not entered"; otherwise 6–10 in 0.5 steps. */
export function validRpe(v: unknown, lang: Lang = "ja"): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v !== "number" || !Number.isFinite(v) || v < 6 || v > 10 || !Number.isInteger(v * 2)) fail(VMSG[lang].rpe);
  return v as number;
}

/** Pain level: an integer 0–5. */
export function validPainLevel(v: unknown, lang: Lang = "ja"): number {
  if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > 5) fail(VMSG[lang].pain);
  return v as number;
}

/** Free-text note: a string of at most NOTE_MAX characters. */
export function validNote(v: unknown, lang: Lang = "ja"): string {
  if (typeof v !== "string" || v.length > NOTE_MAX) fail(VMSG[lang].note);
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
export function validDateString(v: unknown, lang: Lang = "ja"): string {
  if (!isValidDateString(v)) fail(VMSG[lang].date);
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

export function parseProfile(b: Record<string, unknown>, lang: Lang = "ja", opts: { foldLegacySex?: boolean } = {}): Profile {
  const m = VMSG[lang];
  const age = numField(b.age);
  if (age === null) fail(m.ageRequired);
  if (!Number.isInteger(age) || age < 10 || age > 100) fail(m.ageRange);
  const heightCm = numField(b.heightCm);
  if (heightCm === null) fail(m.heightRequired);
  if (!Number.isInteger(heightCm) || heightCm < 100 || heightCm > 250) fail(m.heightRange);
  const weightKg = numField(b.weightKg);
  if (weightKg === null) fail(m.weightRequired);
  if (weightKg < 20 || weightKg > 300) fail(m.weightRange);
  // Sex is a select now: only the three option values are accepted
  // ("" = prefer not to say); anything else is refused. The one
  // exception is imported data written before the select existed
  // (foldLegacySex, used by parseStoreImport): a legacy free-text
  // value there folds to "" instead of refusing the whole file.
  const sexRaw = b.sex === null || b.sex === undefined ? "" : b.sex;
  if (typeof sexRaw !== "string") fail(m.textFormat);
  let sex = sexRaw;
  if (!(SEX_VALUES as readonly string[]).includes(sexRaw)) {
    if (!opts.foldLegacySex) fail(m.sexInvalid);
    sex = "";
  }
  // The note is one merged field. Imported / hand-sent data in the old
  // two-field shape is accepted and merged the same way saved data
  // migrates (newline join), so nothing is lost in either direction.
  const noteText = (v: unknown): string => {
    if (v === null || v === undefined) return "";
    if (typeof v !== "string") fail(m.textFormat);
    return v;
  };
  const note = [noteText(b.note), noteText(b.bodyFatNote), noteText(b.habitNote)]
    .filter((s) => s !== "").join("\n");
  if (note.length > NOTE_FIELD_MAX) fail(m.noteField);
  return { age, sex, heightCm, weightKg, note };
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
export const IMPORT_MESSAGE = VMSG.ja.importInvalid;

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
// The imp* helpers fail with the import message in the caller's language.
const impStr = (v: unknown, lang: Lang, max = 1000): string => {
  if (typeof v !== "string" || v.length > max) fail(VMSG[lang].importInvalid);
  return v as string;
};
const impInt = (v: unknown, lang: Lang, lo: number, hi: number): number => {
  if (typeof v !== "number" || !Number.isInteger(v) || v < lo || v > hi) fail(VMSG[lang].importInvalid);
  return v as number;
};
const impFail = (lang: Lang): never => fail(VMSG[lang].importInvalid);

function parseImportedExercise(v: unknown, lang: Lang): SessionExercise {
  if (!isObj(v)) impFail(lang);
  if (!Array.isArray(v.loggedSets) || v.loggedSets.length > 10) impFail(lang);
  const unit = v.targetUnit;
  if (unit !== "回" && unit !== "秒") impFail(lang);
  if (typeof v.completed !== "boolean") impFail(lang);
  return {
    id: impInt(v.id, lang, 1, Number.MAX_SAFE_INTEGER),
    baseId: impStr(v.baseId, lang, 100), name: impStr(v.name, lang), muscleGroup: impStr(v.muscleGroup, lang, 100),
    painPart: impStr(v.painPart, lang, 100), variation: impStr(v.variation, lang), ladderIndex: impInt(v.ladderIndex, lang, 0, 1000),
    targetSets: impInt(v.targetSets, lang, 1, 10), targetReps: validReps(v.targetReps, lang), targetUnit: unit as "回" | "秒",
    cue: impStr(v.cue, lang), loggedSets: (v.loggedSets as unknown[]).map((x) => validSetLog(x, lang)),
    rpe: validRpe(v.rpe, lang), completed: v.completed as boolean, note: validNote(v.note, lang),
  };
}

function parseImportedSession(v: unknown, lang: Lang): Session {
  if (!isObj(v)) impFail(lang);
  if (v.status !== "planned" && v.status !== "completed") impFail(lang);
  if (typeof v.intro !== "boolean") impFail(lang);
  if (!Array.isArray(v.exercises)) impFail(lang);
  if (!Array.isArray(v.progressionNotes)) impFail(lang);
  const s: Session = {
    id: impInt(v.id, lang, 1, Number.MAX_SAFE_INTEGER),
    date: validDateString(v.date, lang),
    rotation: impStr(v.rotation, lang, 100), title: impStr(v.title, lang),
    status: v.status as Session["status"], intro: v.intro as boolean,
    focusNote: impStr(v.focusNote, lang), progressionNotes: (v.progressionNotes as unknown[]).map((n) => impStr(n, lang)),
    exercises: (v.exercises as unknown[]).map((e) => parseImportedExercise(e, lang)),
    totalVolume: 0,
  };
  s.totalVolume = sessionTotal(s);
  return s;
}

function parseImportedPain(v: unknown, lang: Lang): PainEntry {
  if (!isObj(v)) impFail(lang);
  const levels = (o: unknown): Record<string, number> => {
    if (!isObj(o)) impFail(lang);
    const out: Record<string, number> = {};
    for (const [k, val] of Object.entries(o as Record<string, unknown>)) out[k] = validPainLevel(val, lang);
    return out;
  };
  if (!Array.isArray(v.redFlags)) impFail(lang);
  return {
    date: validDateString(v.date, lang),
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
function parseImportedProfileHistory(v: unknown, lang: Lang): ProfileHistoryEntry[] {
  if (v === undefined) return [];
  if (!Array.isArray(v)) impFail(lang);
  const scalar = (x: unknown): string | number | null => {
    if (x === null) return null;
    if (typeof x === "number" && Number.isFinite(x)) return x;
    return impStr(x, lang);
  };
  return (v as unknown[]).map((e) => {
    if (!isObj(e) || !Array.isArray(e.changes)) impFail(lang);
    return {
      at: impStr((e as Record<string, unknown>).at, lang, 64),
      changes: ((e as Record<string, unknown>).changes as unknown[]).map((c) => {
        if (!isObj(c)) impFail(lang);
        const cc = c as Record<string, unknown>;
        return { field: impStr(cc.field, lang, 64), label: impStr(cc.label, lang, 64), from: scalar(cc.from), to: scalar(cc.to) };
      }),
    };
  });
}

export function parseStoreImport(v: unknown, lang: Lang = "ja"): Store {
  if (!isObj(v)) impFail(lang);
  for (const k of ["profile", "pain", "sessions", "nextSessionId", "nextExerciseId"]) {
    if (!(k in v)) impFail(lang);
  }
  if (!Array.isArray(v.pain) || !Array.isArray(v.sessions)) impFail(lang);
  // The UI language is optional in an import (files written before it
  // existed do not carry it); when present it must be a known language.
  let importedLang: Lang | undefined;
  if (v.lang !== undefined) {
    if (!isLang(v.lang)) impFail(lang);
    importedLang = v.lang;
  }
  // Same for the colour theme: optional, validated when present.
  let importedTheme: Theme | undefined;
  if (v.theme !== undefined) {
    if (!isTheme(v.theme)) impFail(lang);
    importedTheme = v.theme;
  }
  const profile = v.profile === null ? null : isObj(v.profile) ? parseProfile(v.profile, lang, { foldLegacySex: true }) : impFail(lang);
  const sessions = (v.sessions as unknown[]).map((s) => parseImportedSession(s, lang));
  const maxSessionId = sessions.reduce((a, s) => Math.max(a, s.id), 0);
  const maxExerciseId = sessions.reduce((a, s) => s.exercises.reduce((b, e) => Math.max(b, e.id), a), 0);
  return {
    profile,
    pain: (v.pain as unknown[]).map((p) => parseImportedPain(p, lang)),
    sessions,
    nextSessionId: Math.max(impInt(v.nextSessionId, lang, 1, Number.MAX_SAFE_INTEGER), maxSessionId + 1),
    nextExerciseId: Math.max(impInt(v.nextExerciseId, lang, 1, Number.MAX_SAFE_INTEGER), maxExerciseId + 1),
    profileHistory: parseImportedProfileHistory(v.profileHistory, lang),
    ...(importedLang ? { lang: importedLang } : {}),
    ...(importedTheme ? { theme: importedTheme } : {}),
  };
}

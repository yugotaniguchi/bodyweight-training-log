// Input validation for the API. Every rule is enforced on the server, so a
// hand-sent request cannot store a broken value; the client (public/app.js)
// checks the same rules before sending and shows the same reason text.
// A rejected write answers HTTP 400 with the reason and stores nothing.
import type { Profile } from "./logic";

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

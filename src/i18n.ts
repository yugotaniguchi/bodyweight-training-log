// UI language support (Japanese / English).
//
// The store carries one language setting (`Store.lang`, absent =
// Japanese). Everything the server generates for the user — assessment
// reasons, guidance, progression notes, validation and error messages,
// the login page — is produced from the tables in this module, in the
// store's language. Decision logic never branches on language; only
// the wording changes.
//
// Display names for body parts, joints, muscle groups, rotations and
// red flags live here too: the stored data keeps the canonical
// Japanese names as keys, and only the display label is translated.
import { RED_FLAGS } from "./exercises";

export type Lang = "ja" | "en";
export const isLang = (v: unknown): v is Lang => v === "ja" || v === "en";
/** The effective language of a store-shaped value (absent = Japanese). */
export const langOf = (s: { lang?: Lang } | null | undefined): Lang => (s && isLang(s.lang) ? s.lang : "ja");

// ---------- display names (stored data keys stay Japanese) ----------
export const PART_EN: Record<string, string> = {
  "胸": "Chest", "肩": "Shoulders", "上腕": "Upper arms", "前腕": "Forearms", "背中": "Back",
  "脚（前）": "Legs (front)", "脚（後ろ）・お尻": "Legs (back) / Glutes", "ふくらはぎ": "Calves",
  "腹筋": "Abs", "体幹": "Core",
};
export const JOINT_EN: Record<string, string> = {
  "腰": "Lower back", "肩": "Shoulders", "肘": "Elbows", "手首": "Wrists",
  "股関節": "Hips", "膝": "Knees", "足首": "Ankles",
};
export const GROUP_EN: Record<string, string> = {
  "胸・三頭": "Chest & Triceps", "肩": "Shoulders", "脚（前）": "Legs (front)", "ふくらはぎ": "Calves",
  "背中": "Back", "脚（後ろ）・お尻": "Legs (back) / Glutes", "腹筋": "Abs",
  "体幹": "Core", "体幹（側面）": "Core (sides)",
};
export const ROTATION_EN: Record<string, string> = {
  A: "Push + Legs", B: "Back + Posterior Legs + Core", C: "Full Body",
};
export const RED_FLAG_EN: Record<string, string> = {
  numbness: "Numbness or weakness",
  bladder: "Changes in bladder or bowel function (around the lower back)",
  saddle: "Numbness around the groin or saddle area",
  swollenHot: "A hot, swollen joint, or a fever",
  cannotBear: "Cannot bear weight, or a visible deformity",
  darkUrine: "Severe muscle pain and weakness, with tea/cola-coloured urine or reduced urine output",
  chestPain: "Chest pain",
  trauma: "Right after a major accident or fall",
};

export const partName = (name: string, lang: Lang): string => (lang === "en" ? PART_EN[name] ?? name : name);
export const jointName = (name: string, lang: Lang): string => (lang === "en" ? JOINT_EN[name] ?? name : name);
/** A pain subject is a muscle part or a joint; translate whichever it is. */
export const subjectName = (name: string, lang: Lang): string =>
  lang === "en" ? PART_EN[name] ?? JOINT_EN[name] ?? name : name;
export const rotationTitle = (id: string, jaTitle: string, lang: Lang): string =>
  lang === "en" ? ROTATION_EN[id] ?? jaTitle : jaTitle;
export const redFlagLabel = (id: string, lang: Lang): string =>
  lang === "en" ? RED_FLAG_EN[id] ?? id : RED_FLAGS.find((f) => f.id === id)?.label ?? id;

// ---------- validation / API error messages ----------
export interface ValidationTexts {
  reps: string; rpe: string; pain: string; note: string; date: string;
  repsFormat: string; tooManySets: string; completedFlagFormat: string; painFormat: string;
  textFormat: string; noteField: string;
  ageRequired: string; ageRange: string; heightRequired: string; heightRange: string;
  weightRequired: string; weightRange: string;
  importInvalid: string; langInvalid: string;
}
export const VMSG: Record<Lang, ValidationTexts> = {
  ja: {
    reps: "回数は0〜999の整数で入力してください",
    rpe: "RPEは6〜10（0.5刻み）で入力してください",
    pain: "痛みレベルは0〜5の整数で入力してください",
    note: "メモは200文字以内で入力してください",
    date: "日付はYYYY-MM-DD形式で入力してください",
    repsFormat: "回数の形式が正しくありません",
    tooManySets: "セット数が多すぎます",
    completedFlagFormat: "完了フラグの形式が正しくありません",
    painFormat: "痛みレベルの形式が正しくありません",
    textFormat: "テキストの形式が正しくありません",
    noteField: "補足は200文字以内で入力してください",
    ageRequired: "年齢を入力してください",
    ageRange: "年齢は10〜100の整数で入力してください",
    heightRequired: "身長を入力してください",
    heightRange: "身長は100〜250cmの整数で入力してください",
    weightRequired: "体重を入力してください",
    weightRange: "体重は20〜300kgで入力してください",
    importInvalid: "インポートファイルの形式が正しくありません",
    langInvalid: "言語の指定が正しくありません",
  },
  en: {
    reps: "Enter reps as an integer between 0 and 999",
    rpe: "Enter RPE as 6–10 in 0.5 steps",
    pain: "Enter pain levels as integers between 0 and 5",
    note: "Keep the note within 200 characters",
    date: "Enter dates in YYYY-MM-DD format",
    repsFormat: "The reps format is not valid",
    tooManySets: "Too many sets",
    completedFlagFormat: "The completion flag format is not valid",
    painFormat: "The pain level format is not valid",
    textFormat: "The text format is not valid",
    noteField: "Keep the note within 200 characters",
    ageRequired: "Enter your age",
    ageRange: "Enter age as an integer between 10 and 100",
    heightRequired: "Enter your height",
    heightRange: "Enter height as an integer between 100 and 250 cm",
    weightRequired: "Enter your weight",
    weightRange: "Enter weight between 20 and 300 kg",
    importInvalid: "The import file format is not valid",
    langInvalid: "The language value is not valid",
  },
};

// ---------- server-generated texts ----------
// One entry per user-visible string the server produces. Templates are
// functions of the values they embed; embedded data (exercise names,
// variations, the user's own notes) is never translated.
export interface ServerTexts {
  assessMuscleExclude: (level: number) => string;
  assessMuscleReduce: string;
  assessJointExclude: (level: number) => string;
  assessJointReduce: string;
  careReason: (label: string) => string;
  restReason: (count: number) => string;
  overloadReason: (subject: string, baseline: number, next: number) => string;
  guidanceMuscleCare: (part: string, days: number) => string;
  guidanceJointCare: (joint: string, days: number) => string;
  guidanceJointCaution: (joint: string, days: number) => string;
  noteFirstIntro: string;
  noteFirst: string;
  noteCannotLadder: (variation: string, memo: string) => string;
  noteCannotNoReps: string;
  noteCannotSubstitute: (name: string, variation: string) => string;
  noteCannotHalve: string;
  noteMemoPain: (memo: string) => string;
  noteMemoHard: (memo: string) => string;
  noteMemoEasy: (memo: string) => string;
  noteMemoJust: (memo: string) => string;
  noteNoRpe: string;
  noteRpeLadderUp: (rpe: number, pct: number, variation: string) => string;
  noteRpeSecondsUp: (rpe: number, pct: number) => string;
  noteRpeRepsPlus3: (rpe: number, pct: number) => string;
  noteRpeMidSeconds: (rpe: number, pct: number) => string;
  noteRpeMidPlus1: (rpe: number, pct: number) => string;
  noteRpeLadderDown: (rpe: number, pct: number, variation: string) => string;
  noteRpeLoadDown: (rpe: number, pct: number) => string;
  noteRpeKeep: (rpe: number, pct: number) => string;
  noteRpeMinus1: (rpe: number, pct: number) => string;
  genExcluded: (name: string, why: string) => string;
  genReduced: (name: string, why: string) => string;
  whyJoint: (joint: string) => string;
  whyJointMap: (joint: string, part: string) => string;
  genOverloadNote: (name: string, reason: string) => string;
  genOverloadReduce: (name: string, reason: string) => string;
  titleAltSuffix: string;
  focusNoteAlt: string;
  errSessionExists: string;
  errBlockedRedFlag: string;
  errRestDay: string;
  errAllExcluded: string;
  errAuthRequired: string;
  errMalformed: string;
  loginSub: string;
  loginLabel: string;
  loginButton: string;
  loginError: string;
}

export const SRV: Record<Lang, ServerTexts> = {
  ja: {
    assessMuscleExclude: (level) => `筋肉痛レベル${level}: その部位は除外`,
    assessMuscleReduce: "筋肉痛レベル2: 負荷を下げて実施（進行はしない）",
    assessJointExclude: (level) => `関節痛レベル${level}: その関節を使う種目は除外`,
    assessJointReduce: "関節痛レベル2: 関節は筋肉より厳しめに、負荷を下げて進行しません",
    careReason: (label) => `警告サイン「${label}」: 受診目安のため開始不可`,
    restReason: (count) => `レベル4以上の筋肉痛が${count}部位あります`,
    overloadReason: (subject, baseline, next) =>
      `24時間ルール: ${subject}の痛みが前回セッションの翌日に${baseline}→${next}へ戻っていないため過負荷と判定し、次回は軽減・進行なし`,
    guidanceMuscleCare: (part, days) => `筋肉痛（${part}）が${days}日続いています。5日以上改善しない場合は受診が目安です`,
    guidanceJointCare: (joint, days) => `関節痛（${joint}）が${days}日続いています。2週間改善しない場合は受診が目安です`,
    guidanceJointCaution: (joint, days) => `関節痛（${joint}）が${days}日続いています。1週間を超えたので注意してください（2週間改善しなければ受診目安）`,
    noteFirstIntro: "初回（導入期：易しい形・セット減）",
    noteFirst: "初回",
    noteCannotLadder: (variation, memo) => `できない種目の切り替え: 1段階易しい「${variation}」へ（メモ: ${memo}）`,
    noteCannotNoReps: "記録0回",
    noteCannotSubstitute: (name, variation) => `できない種目の切り替え: 最易段階のため同部位の別種目「${name}（${variation}）」へ`,
    noteCannotHalve: "できない種目の切り替え: 回数を半分に軽減",
    noteMemoPain: (memo) => `種目メモの反映: 「${memo}」→ 負荷を下げました`,
    noteMemoHard: (memo) => `種目メモの反映: 「${memo}」→ 進行せず軽減`,
    noteMemoEasy: (memo) => `種目メモの反映: 「${memo}」→ 多めに増加`,
    noteMemoJust: (memo) => `種目メモの反映: 「${memo}」→ 維持`,
    noteNoRpe: "RPE未記録のため前回と同じ負荷",
    noteRpeLadderUp: (rpe, pct, variation) => `RPE ${rpe}・達成率 ${pct}%: 難易度を1段階上げて「${variation}」へ`,
    noteRpeSecondsUp: (rpe, pct) => `RPE ${rpe}・達成率 ${pct}%: 秒数を+25%`,
    noteRpeRepsPlus3: (rpe, pct) => `RPE ${rpe}・達成率 ${pct}%: 回数を+3`,
    noteRpeMidSeconds: (rpe, pct) => `RPE ${rpe}・達成率 ${pct}%: 秒数を+10%`,
    noteRpeMidPlus1: (rpe, pct) => `RPE ${rpe}・達成率 ${pct}%: 適正域のため+1`,
    noteRpeLadderDown: (rpe, pct, variation) => `RPE ${rpe}・達成率 ${pct}%: 難易度を1段階下げて「${variation}」へ`,
    noteRpeLoadDown: (rpe, pct) => `RPE ${rpe}・達成率 ${pct}%: 負荷を下げました`,
    noteRpeKeep: (rpe, pct) => `RPE ${rpe}・達成率 ${pct}%: 維持`,
    noteRpeMinus1: (rpe, pct) => `RPE ${rpe}・達成率 ${pct}%: -1回`,
    genExcluded: (name, why) => `痛み基準で除外: ${name}（${why}）`,
    genReduced: (name, why) => `痛み基準で軽減: ${name}（${why}）`,
    whyJoint: (joint) => `関節痛: ${joint}`,
    whyJointMap: (joint, part) => `関節→部位マッピング: ${joint}→${part}`,
    genOverloadNote: (name, reason) => `24時間ルール: ${name}（${reason}）`,
    genOverloadReduce: (name, reason) => `24時間ルールで軽減: ${name}（${reason}）`,
    titleAltSuffix: "（代替）",
    focusNoteAlt: "痛みの基準で一部の部位を外した代替ワークアウト",
    errSessionExists: "今日のセッションは作成済みです",
    errBlockedRedFlag: "警告サインがあるため開始できません",
    errRestDay: "完全休養日です",
    errAllExcluded: "除外により実施できる種目がありません",
    errAuthRequired: "認証が必要です",
    errMalformed: "リクエストの形式が正しくありません",
    loginSub: "続けるにはトークンを入力してください。",
    loginLabel: "トークン",
    loginButton: "ログイン",
    loginError: "トークンが違います",
  },
  en: {
    assessMuscleExclude: (level) => `Soreness level ${level}: this part is excluded`,
    assessMuscleReduce: "Soreness level 2: train with a reduced load (no progression)",
    assessJointExclude: (level) => `Joint pain level ${level}: exercises that load this joint are excluded`,
    assessJointReduce: "Joint pain level 2: joints are judged more strictly — reduced load, no progression",
    careReason: (label) => `Warning sign "${label}": see a doctor — cannot start`,
    restReason: (count) => `Soreness at level 4 or higher is present in ${count} parts`,
    overloadReason: (subject, baseline, next) =>
      `24-hour rule: ${subject} pain was ${baseline} → ${next} the day after the last session instead of returning to its baseline, so it counts as overloaded — reduced next time, no progression`,
    guidanceMuscleCare: (part, days) => `Soreness in the ${part} has lasted ${days} days. If it has not improved within 5 days, consider seeing a doctor.`,
    guidanceJointCare: (joint, days) => `Joint pain in the ${joint} has lasted ${days} days. If it has not improved within 2 weeks, consider seeing a doctor.`,
    guidanceJointCaution: (joint, days) => `Joint pain in the ${joint} has lasted ${days} days — over a week now, so take care (see a doctor if it has not improved within 2 weeks).`,
    noteFirstIntro: "First time (intro period: easier variation, fewer sets)",
    noteFirst: "First time",
    noteCannotLadder: (variation, memo) => `Could-not-do swap: one step easier, to "${variation}" (note: ${memo})`,
    noteCannotNoReps: "no reps logged",
    noteCannotSubstitute: (name, variation) => `Could-not-do swap: already at the easiest step, so swapped to another exercise for the same part, "${name} (${variation})"`,
    noteCannotHalve: "Could-not-do swap: target reps halved",
    noteMemoPain: (memo) => `From the exercise note: "${memo}" → load reduced`,
    noteMemoHard: (memo) => `From the exercise note: "${memo}" → no progression, load reduced`,
    noteMemoEasy: (memo) => `From the exercise note: "${memo}" → increased by more`,
    noteMemoJust: (memo) => `From the exercise note: "${memo}" → kept the same`,
    noteNoRpe: "No RPE recorded, so the same load as last time",
    noteRpeLadderUp: (rpe, pct, variation) => `RPE ${rpe}, completion ${pct}%: difficulty up one step, to "${variation}"`,
    noteRpeSecondsUp: (rpe, pct) => `RPE ${rpe}, completion ${pct}%: seconds +25%`,
    noteRpeRepsPlus3: (rpe, pct) => `RPE ${rpe}, completion ${pct}%: reps +3`,
    noteRpeMidSeconds: (rpe, pct) => `RPE ${rpe}, completion ${pct}%: seconds +10%`,
    noteRpeMidPlus1: (rpe, pct) => `RPE ${rpe}, completion ${pct}%: in the right zone, so +1`,
    noteRpeLadderDown: (rpe, pct, variation) => `RPE ${rpe}, completion ${pct}%: difficulty down one step, to "${variation}"`,
    noteRpeLoadDown: (rpe, pct) => `RPE ${rpe}, completion ${pct}%: load reduced`,
    noteRpeKeep: (rpe, pct) => `RPE ${rpe}, completion ${pct}%: kept the same`,
    noteRpeMinus1: (rpe, pct) => `RPE ${rpe}, completion ${pct}%: −1 rep`,
    genExcluded: (name, why) => `Excluded by the pain rules: ${name} (${why})`,
    genReduced: (name, why) => `Reduced by the pain rules: ${name} (${why})`,
    whyJoint: (joint) => `Joint pain: ${joint}`,
    whyJointMap: (joint, part) => `Joint→part mapping: ${joint}→${part}`,
    genOverloadNote: (name, reason) => `24-hour rule: ${name} (${reason})`,
    genOverloadReduce: (name, reason) => `Reduced by the 24-hour rule: ${name} (${reason})`,
    titleAltSuffix: " (alternative)",
    focusNoteAlt: "Alternative workout: some parts were left out by the pain rules",
    errSessionExists: "Today's session has already been created",
    errBlockedRedFlag: "Cannot start: a warning sign is present",
    errRestDay: "Today is a full rest day",
    errAllExcluded: "No exercises remain after the exclusions",
    errAuthRequired: "Authentication is required",
    errMalformed: "The request format is not valid",
    loginSub: "Enter your token to continue.",
    loginLabel: "Token",
    loginButton: "Log in",
    loginError: "That token is not correct",
  },
};

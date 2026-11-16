// Exercise definitions: no equipment, ladder = variations from easiest to hardest.
export interface ExerciseDef {
  baseId: string;
  name: string;
  muscleGroup: string;
  /** key used to match muscle-soreness / joint-pain parts */
  painPart: string;
  /** joints this exercise loads; joint-pain assessment applies to these */
  jointParts: string[];
  unit: "回" | "秒";
  /** Performed one side at a time: reps are recorded per side (left /
   *  right pairs). Rep-count exercises only — never set on timed ones. */
  unilateral?: boolean;
  baseTarget: number; // reps or seconds at the default variation
  baseSets: number;
  defaultLadder: number;
  ladder: string[];
  /** Load points per rep (per second for timed exercises), one per
   *  ladder step, easiest first. The session planner budgets and
   *  distributes these; see loadOf for the fallback when absent. */
  loads?: number[];
  /** Movement pattern used for menu coverage: "push" | "pull" |
   *  "legs" | "core" (any string groups with itself). See patternOf
   *  for the fallback when absent. */
  pattern?: string;
  cue: string;
  /** How-to for the workout tab's info window: the steps, in order. */
  steps: string[];
  /** The body part to focus on, for the same info window. */
  focus: string;
}

export const MUSCLE_PARTS = [
  "胸", "肩", "上腕", "前腕", "背中", "脚（前）", "脚（後ろ）・お尻", "ふくらはぎ", "腹筋", "体幹",
] as const;

export const JOINTS = ["腰", "背骨", "肩", "肘", "手首", "股関節", "膝", "足首"] as const;

/**
 * Explicit joint -> muscle-part mapping. When a joint hurts, the muscle parts
 * listed here are the ones trained by the exercises that load that joint:
 * - 腰 (lower back): leg and core work (squats, hinges, leg raises, planks)
 * - 背骨 (spine): back, abs and core work (prone raises, crunches, leg raises, planks)
 * - 肩 (shoulder): all pushing work, plus planks
 * - 肘 (elbow): pushing and pulling work
 * - 手首 (wrist): pushing and plank work
 * - 股関節 (hip): leg work and leg raises
 * - 膝 (knee): leg work, including calf jumps
 * - 足首 (ankle): leg work, including calf jumps
 * Joint pain level 2 reduces these parts, level 3+ excludes them — the same
 * thresholds as the per-exercise `jointParts` lists, applied by muscle part.
 */
export const JOINT_TO_MUSCLE_PARTS: Record<string, string[]> = {
  "腰": ["脚（前）", "脚（後ろ）・お尻", "腹筋", "体幹"],
  "背骨": ["背中", "腹筋", "体幹"],
  "肩": ["胸", "肩", "体幹"],
  "肘": ["胸", "肩", "背中"],
  "手首": ["胸", "肩", "体幹"],
  "股関節": ["脚（前）", "脚（後ろ）・お尻", "腹筋"],
  "膝": ["脚（前）", "脚（後ろ）・お尻", "ふくらはぎ"],
  "足首": ["脚（前）", "脚（後ろ）・お尻", "ふくらはぎ"],
};

export interface RedFlag { id: string; label: string }
export const RED_FLAGS: RedFlag[] = [
  { id: "numbness", label: "しびれ・脱力がある" },
  { id: "bladder", label: "排尿・排便の変化がある（腰まわり）" },
  { id: "saddle", label: "股間・肛門まわりの感覚異常がある" },
  { id: "swollenHot", label: "関節が熱く腫れている／発熱がある" },
  { id: "cannotBear", label: "体重をかけられない／変形がある" },
  { id: "darkUrine", label: "強い筋肉痛・脱力に加え、尿が紅茶色・コーラ色／尿量が減った" },
  { id: "chestPain", label: "胸の痛みがある" },
  { id: "trauma", label: "大きな事故・転倒の直後である" },
];

export const EXERCISES: Record<string, ExerciseDef> = {
  pushup: {
    baseId: "pushup", name: "プッシュアップ", muscleGroup: "胸・三頭", painPart: "胸",
    jointParts: ["手首","肘","肩"],
    unit: "回", baseTarget: 8, baseSets: 3, defaultLadder: 1,
    ladder: ["壁プッシュアップ", "膝つきプッシュアップ", "プッシュアップ", "ダイヤモンドプッシュアップ"],
    loads: [30, 45, 60, 80], pattern: "push",
    cue: "体を一直線に保ち、胸が床に近づくまで下ろす。反動は使わない。",
    steps: ["手を肩幅に置き、足を伸ばして体を一直線にする", "肘を曲げて、胸が床に近づくまで下ろす", "手のひらで床を押して体を持ち上げる"],
    focus: "胸と腕の裏側",
  },
  pike: {
    baseId: "pike", name: "パイクプッシュアップ", muscleGroup: "肩", painPart: "肩",
    jointParts: ["手首","肘","肩"],
    unit: "回", baseTarget: 6, baseSets: 2, defaultLadder: 1,
    ladder: ["壁際パイクプッシュアップ（浅め）", "パイクプッシュアップ（浅め）", "パイクプッシュアップ"],
    loads: [40, 55, 75], pattern: "push",
    cue: "お尻を高く上げ、頭頂が床に向かうように肘を曲げる。",
    steps: ["四つ這いから腰を高く上げ、逆V字の姿勢を作る", "肘を曲げて、頭頂が床に近づくまで下ろす", "床を押して元の姿勢に戻る"],
    focus: "肩（特に前側）",
  },
  squat: {
    baseId: "squat", name: "スクワット", muscleGroup: "脚（前）", painPart: "脚（前）",
    jointParts: ["膝","股関節","足首","腰"],
    unit: "回", baseTarget: 10, baseSets: 3, defaultLadder: 1,
    ladder: ["椅子スクワット", "スクワット", "ジャンプスクワット"],
    loads: [35, 50, 70], pattern: "legs",
    cue: "膝とつま先の向きをそろえ、椅子に座るように下ろす。",
    steps: ["足を肩幅に開き、つま先を少し外に向ける", "椅子に座るように腰を下ろす（膝とつま先の向きをそろえる）", "かかとで床を押して立ち上がる"],
    focus: "太ももの前側とお尻",
  },
  calfJump: {
    baseId: "calfJump", name: "カーフジャンプ", muscleGroup: "ふくらはぎ", painPart: "ふくらはぎ",
    jointParts: ["足首","膝"],
    unit: "回", baseTarget: 12, baseSets: 2, defaultLadder: 1,
    ladder: ["両脚カーフジャンプ（低く）", "カーフジャンプ", "片脚カーフジャンプ"],
    loads: [20, 30, 50], pattern: "legs",
    cue: "かかとを上げた勢いで軽く跳ぶ。着地は静かに。",
    steps: ["足を腰幅に開いて立つ", "かかとを上げた勢いで軽く真上に跳ぶ", "つま先で静かに着地し、そのまま繰り返す"],
    focus: "ふくらはぎ",
  },
  proneW: {
    baseId: "proneW", name: "プローンWレイズ", muscleGroup: "背中", painPart: "背中",
    jointParts: ["肩","腰","背骨"],
    unit: "回", baseTarget: 12, baseSets: 2, defaultLadder: 0,
    ladder: ["プローンWレイズ", "プローンWレイズ（トップで止める）"],
    loads: [35, 45], pattern: "pull",
    cue: "うつ伏せで腕をWの形にし、肩甲骨を寄せながら胸を少し浮かせる。",
    steps: ["うつ伏せで腕をWの形に曲げる", "肩甲骨を寄せながら、胸と腕を少し浮かせる", "ゆっくり元の位置に戻す"],
    focus: "背中の中央（肩甲骨まわり）",
  },
  proneY: {
    baseId: "proneY", name: "プローンYレイズ", muscleGroup: "背中", painPart: "背中",
    jointParts: ["肩","腰","背骨"],
    unit: "回", baseTarget: 10, baseSets: 2, defaultLadder: 0,
    ladder: ["プローンYレイズ", "プローンYレイズ（トップで止める）"],
    loads: [35, 45], pattern: "pull",
    cue: "うつ伏せで腕をYの形に伸ばし、親指を上にして少し浮かせる。",
    steps: ["うつ伏せで腕をYの形に伸ばす（親指は上）", "腕と胸を少し浮かせる", "ゆっくり元の位置に戻す"],
    focus: "背中の上部と肩の後ろ側",
  },
  gluteBridge: {
    baseId: "gluteBridge", name: "グルートブリッジ", muscleGroup: "脚（後ろ）・お尻", painPart: "脚（後ろ）・お尻",
    jointParts: ["腰","膝","股関節"],
    unit: "回", baseTarget: 12, baseSets: 3, defaultLadder: 0,
    ladder: ["グルートブリッジ", "グルートブリッジ（トップで止める）", "片脚グルートブリッジ"],
    loads: [35, 45, 65], pattern: "legs",
    cue: "かかとで床を押し、お尻を締めながら腰を持ち上げる。",
    steps: ["仰向けで膝を曲げ、足裏を床につける", "かかとで床を押し、お尻を締めながら腰を持ち上げる", "トップで止めてから、ゆっくり下ろす"],
    focus: "お尻と太ももの裏側",
  },
  rdl: {
    baseId: "rdl", name: "シングルレッグRDL", muscleGroup: "脚（後ろ）・お尻", painPart: "脚（後ろ）・お尻",
    jointParts: ["腰","股関節","膝"],
    unit: "回", unilateral: true, baseTarget: 8, baseSets: 2, defaultLadder: 1,
    ladder: ["両脚ヒップヒンジ", "シングルレッグRDL（支えあり）", "シングルレッグRDL"],
    loads: [30, 45, 60], pattern: "legs",
    cue: "背中をまっすぐに保ち、股関節から折りたたむ。左右それぞれ行う。",
    steps: ["片脚で立ち、反対の脚を少し後ろに引く", "背中をまっすぐに保ち、股関節から上体を前に倒す", "太ももの裏の伸びを感じたら元に戻る（左右それぞれ行う）"],
    focus: "太ももの裏側とお尻",
  },
  legRaise: {
    baseId: "legRaise", name: "レッグレイズ", muscleGroup: "腹筋", painPart: "腹筋",
    jointParts: ["腰","股関節","背骨"],
    unit: "回", baseTarget: 10, baseSets: 2, defaultLadder: 1,
    ladder: ["膝曲げレッグレイズ", "レッグレイズ", "レッグレイズ（ゆっくり下ろす）"],
    loads: [30, 45, 60], pattern: "core",
    cue: "腰を床に押し付けたまま、脚をゆっくり上げ下ろしする。",
    steps: ["仰向けで両脚をそろえ、腰を床に押し付ける", "脚をゆっくり持ち上げる", "腰が浮く手前まで、ゆっくり下ろす"],
    focus: "腹筋（特に下部）",
  },
  crunch: {
    baseId: "crunch", name: "クランチ", muscleGroup: "腹筋", painPart: "腹筋",
    jointParts: ["腰","背骨"],
    unit: "回", baseTarget: 12, baseSets: 2, defaultLadder: 0,
    ladder: ["クランチ", "クランチ（トップで止める）"],
    loads: [30, 40], pattern: "core",
    cue: "腰を床につけたまま、肩甲骨が浮くところまで上体を丸める。首は引っ張らない。",
    steps: ["仰向けで膝を曲げ、手は胸の前か耳の横に置く", "肩甲骨が浮くところまで上体を丸める", "ゆっくり元に戻す（首は引っ張らない）"],
    focus: "腹筋（特に上部）",
  },
  plank: {
    baseId: "plank", name: "プランク", muscleGroup: "体幹", painPart: "体幹",
    jointParts: ["肩","肘","手首","腰","背骨"],
    unit: "秒", baseTarget: 40, baseSets: 2, defaultLadder: 1,
    ladder: ["膝つきプランク", "プランク", "プランク（片脚浮かせ）"],
    loads: [4, 6, 8], pattern: "core",
    cue: "肘とつま先で支え、腰を反らさず一直線を保つ。",
    steps: ["肘とつま先で体を支える", "頭からかかとまで一直線を保つ", "腰を反らさず、そのままキープする"],
    focus: "体幹全体（腹筋と背筋）",
  },
  sidePlank: {
    baseId: "sidePlank", name: "サイドプランク", muscleGroup: "体幹（側面）", painPart: "体幹",
    jointParts: ["肩","肘","腰","背骨"],
    unit: "秒", baseTarget: 30, baseSets: 2, defaultLadder: 0,
    ladder: ["サイドプランク（膝曲げ）", "サイドプランク"],
    loads: [4, 6], pattern: "core",
    cue: "横向きで肘をつき、体を一直線に保つ。左右それぞれ行う。",
    steps: ["横向きで下の肘をつく", "体を一直線に持ち上げてキープする", "反対側も同じ時間行う"],
    focus: "体幹の側面（腹斜筋）",
  },
  reverseLunge: {
    baseId: "reverseLunge", name: "リバースランジ", muscleGroup: "脚（前）", painPart: "脚（前）",
    jointParts: ["膝","股関節","足首"],
    unit: "回", unilateral: true, baseTarget: 8, baseSets: 2, defaultLadder: 1,
    ladder: ["スプリットスクワット（浅め）", "リバースランジ", "ブルガリアンスクワット"],
    loads: [35, 50, 70], pattern: "legs",
    cue: "一歩後ろに引き、上体をまっすぐに保って下ろす。左右それぞれ行う。",
    steps: ["立った姿勢から一歩後ろに引く", "上体をまっすぐに保ったまま腰を下ろす", "前脚のかかとで押して元に戻る（左右それぞれ行う）"],
    focus: "太ももの前側とお尻",
  },
};

/** Movement pattern of an exercise, for menu coverage. An explicit
 *  `pattern` on the definition wins; otherwise the pattern is derived
 *  from the pain part, and an unknown part groups with itself. */
const PATTERN_BY_PART: Record<string, string> = {
  "胸": "push", "肩": "push", "上腕": "push",
  "背中": "pull",
  "脚（前）": "legs", "脚（後ろ）・お尻": "legs", "ふくらはぎ": "legs",
  "腹筋": "core", "体幹": "core",
};
export function patternOf(def: ExerciseDef): string {
  return def.pattern ?? PATTERN_BY_PART[def.painPart] ?? def.painPart;
}

/** Load points of one rep (one second for timed exercises) at a
 *  ladder step. An explicit `loads` array wins; otherwise a ramp is
 *  derived around the default step (anchored at 60 points per rep /
 *  4 per second, ×1.25 per step up, ×0.8 per step down), so a catalog
 *  written before loads existed still plans sensibly. */
export function loadOf(def: ExerciseDef, ladderIndex: number): number {
  const explicit = def.loads?.[ladderIndex];
  if (typeof explicit === "number" && explicit > 0) return explicit;
  const anchor = def.unit === "秒" ? 4 : 60;
  const diff = ladderIndex - def.defaultLadder;
  const f = diff >= 0 ? Math.pow(1.25, diff) : Math.pow(0.8, -diff);
  return Math.max(1, Math.round(anchor * f));
}

/** When an exercise cannot be done even once and it is already at its easiest
 *  variation, swap to this other exercise for the same body part. */
export const SUBSTITUTES: Record<string, string> = {
  pike: "pushup",        // 肩が無理なら胸・三頭の易しい種目へ
  squat: "gluteBridge",
  reverseLunge: "gluteBridge",
  rdl: "gluteBridge",
  legRaise: "crunch",
  calfJump: "squat",      // ジャンプが無理なら椅子スクワット側へ
  plank: "sidePlank",
  proneY: "proneW",
};

export interface RotationDef { id: string; title: string; exerciseIds: string[] }
export const ROTATIONS: RotationDef[] = [
  { id: "A", title: "押す + 脚", exerciseIds: ["pushup", "squat", "pike", "calfJump", "plank"] },
  { id: "B", title: "背中 + 脚裏 + 体幹", exerciseIds: ["proneW", "gluteBridge", "rdl", "legRaise", "sidePlank"] },
  { id: "C", title: "全身", exerciseIds: ["pushup", "reverseLunge", "proneY", "gluteBridge", "legRaise", "plank"] },
];

export const INTRO_SESSIONS = 6;

// ---------- user-editable catalog ----------
// Everything that defines the workout menu — the exercises and their
// ladders, the rotation compositions, the cannot-do substitutes, and
// the pain vocabularies they reference — is one catalog object. The
// constants above are the built-in default; a store may carry its own
// catalog (edited / imported in the settings screen), and the logic
// reads the store's catalog when present (see catalogOf in logic.ts).
// Red flags are deliberately NOT part of the catalog: they are safety
// criteria, not menu contents.
export interface Catalog {
  exercises: Record<string, ExerciseDef>;
  rotations: RotationDef[];
  substitutes: Record<string, string>;
  jointToMuscleParts: Record<string, string[]>;
  muscleParts: string[];
  joints: string[];
}

export function defaultCatalog(): Catalog {
  return {
    exercises: EXERCISES,
    rotations: ROTATIONS,
    substitutes: SUBSTITUTES,
    jointToMuscleParts: JOINT_TO_MUSCLE_PARTS,
    muscleParts: [...MUSCLE_PARTS],
    joints: [...JOINTS],
  };
}

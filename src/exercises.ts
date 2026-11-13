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
  cue: string;
}

export const MUSCLE_PARTS = [
  "胸", "肩", "上腕", "前腕", "背中", "脚（前）", "脚（後ろ）・お尻", "ふくらはぎ", "腹筋", "体幹",
] as const;

export const JOINTS = ["腰", "肩", "肘", "手首", "股関節", "膝", "足首"] as const;

/**
 * Explicit joint -> muscle-part mapping. When a joint hurts, the muscle parts
 * listed here are the ones trained by the exercises that load that joint:
 * - 腰 (lower back): leg and core work (squats, hinges, leg raises, planks)
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
    cue: "体を一直線に保ち、胸が床に近づくまで下ろす。反動は使わない。",
  },
  pike: {
    baseId: "pike", name: "パイクプッシュアップ", muscleGroup: "肩", painPart: "肩",
    jointParts: ["手首","肘","肩"],
    unit: "回", baseTarget: 6, baseSets: 2, defaultLadder: 1,
    ladder: ["壁際パイクプッシュアップ（浅め）", "パイクプッシュアップ（浅め）", "パイクプッシュアップ"],
    cue: "お尻を高く上げ、頭頂が床に向かうように肘を曲げる。",
  },
  squat: {
    baseId: "squat", name: "スクワット", muscleGroup: "脚（前）", painPart: "脚（前）",
    jointParts: ["膝","股関節","足首","腰"],
    unit: "回", baseTarget: 10, baseSets: 3, defaultLadder: 1,
    ladder: ["椅子スクワット", "スクワット", "ジャンプスクワット"],
    cue: "膝とつま先の向きをそろえ、椅子に座るように下ろす。",
  },
  calfJump: {
    baseId: "calfJump", name: "カーフジャンプ", muscleGroup: "ふくらはぎ", painPart: "ふくらはぎ",
    jointParts: ["足首","膝"],
    unit: "回", baseTarget: 12, baseSets: 2, defaultLadder: 1,
    ladder: ["両脚カーフジャンプ（低く）", "カーフジャンプ", "片脚カーフジャンプ"],
    cue: "かかとを上げた勢いで軽く跳ぶ。着地は静かに。",
  },
  proneW: {
    baseId: "proneW", name: "プローンWレイズ", muscleGroup: "背中", painPart: "背中",
    jointParts: ["肩","腰"],
    unit: "回", baseTarget: 12, baseSets: 2, defaultLadder: 0,
    ladder: ["プローンWレイズ", "プローンWレイズ（トップで止める）"],
    cue: "うつ伏せで腕をWの形にし、肩甲骨を寄せながら胸を少し浮かせる。",
  },
  proneY: {
    baseId: "proneY", name: "プローンYレイズ", muscleGroup: "背中", painPart: "背中",
    jointParts: ["肩","腰"],
    unit: "回", baseTarget: 10, baseSets: 2, defaultLadder: 0,
    ladder: ["プローンYレイズ", "プローンYレイズ（トップで止める）"],
    cue: "うつ伏せで腕をYの形に伸ばし、親指を上にして少し浮かせる。",
  },
  gluteBridge: {
    baseId: "gluteBridge", name: "グルートブリッジ", muscleGroup: "脚（後ろ）・お尻", painPart: "脚（後ろ）・お尻",
    jointParts: ["腰","膝","股関節"],
    unit: "回", baseTarget: 12, baseSets: 3, defaultLadder: 0,
    ladder: ["グルートブリッジ", "グルートブリッジ（トップで止める）", "片脚グルートブリッジ"],
    cue: "かかとで床を押し、お尻を締めながら腰を持ち上げる。",
  },
  rdl: {
    baseId: "rdl", name: "シングルレッグRDL", muscleGroup: "脚（後ろ）・お尻", painPart: "脚（後ろ）・お尻",
    jointParts: ["腰","股関節","膝"],
    unit: "回", unilateral: true, baseTarget: 8, baseSets: 2, defaultLadder: 1,
    ladder: ["両脚ヒップヒンジ", "シングルレッグRDL（支えあり）", "シングルレッグRDL"],
    cue: "背中をまっすぐに保ち、股関節から折りたたむ。左右それぞれ行う。",
  },
  legRaise: {
    baseId: "legRaise", name: "レッグレイズ", muscleGroup: "腹筋", painPart: "腹筋",
    jointParts: ["腰","股関節"],
    unit: "回", baseTarget: 10, baseSets: 2, defaultLadder: 1,
    ladder: ["膝曲げレッグレイズ", "レッグレイズ", "レッグレイズ（ゆっくり下ろす）"],
    cue: "腰を床に押し付けたまま、脚をゆっくり上げ下ろしする。",
  },
  crunch: {
    baseId: "crunch", name: "クランチ", muscleGroup: "腹筋", painPart: "腹筋",
    jointParts: ["腰"],
    unit: "回", baseTarget: 12, baseSets: 2, defaultLadder: 0,
    ladder: ["クランチ", "クランチ（トップで止める）"],
    cue: "腰を床につけたまま、肩甲骨が浮くところまで上体を丸める。首は引っ張らない。",
  },
  plank: {
    baseId: "plank", name: "プランク", muscleGroup: "体幹", painPart: "体幹",
    jointParts: ["肩","肘","手首","腰"],
    unit: "秒", baseTarget: 40, baseSets: 2, defaultLadder: 1,
    ladder: ["膝つきプランク", "プランク", "プランク（片脚浮かせ）"],
    cue: "肘とつま先で支え、腰を反らさず一直線を保つ。",
  },
  sidePlank: {
    baseId: "sidePlank", name: "サイドプランク", muscleGroup: "体幹（側面）", painPart: "体幹",
    jointParts: ["肩","肘","腰"],
    unit: "秒", baseTarget: 30, baseSets: 2, defaultLadder: 0,
    ladder: ["サイドプランク（膝曲げ）", "サイドプランク"],
    cue: "横向きで肘をつき、体を一直線に保つ。左右それぞれ行う。",
  },
  reverseLunge: {
    baseId: "reverseLunge", name: "リバースランジ", muscleGroup: "脚（前）", painPart: "脚（前）",
    jointParts: ["膝","股関節","足首"],
    unit: "回", unilateral: true, baseTarget: 8, baseSets: 2, defaultLadder: 1,
    ladder: ["スプリットスクワット（浅め）", "リバースランジ", "ブルガリアンスクワット"],
    cue: "一歩後ろに引き、上体をまっすぐに保って下ろす。左右それぞれ行う。",
  },
};

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

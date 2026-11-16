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
  /** First ladder index (inclusive) whose steps are performed one
   *  side at a time, for families whose easier steps are bilateral
   *  and only the harder steps are single-side (e.g. a two-handed
   *  row progressing to a one-handed row). Same restriction as
   *  `unilateral`: rep-count exercises only. Steps below the index
   *  record plain counts. */
  unilateralFrom?: number;
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

// The pain / classification parts, in the condition screen's group
// order (push, pull, legs, core). Finer than the original ten parts
// since the 2026-11-16 catalog expansion: the chest, shoulders, arms,
// back, abs and core each split by the muscle actually loaded, so a
// pain report and the planner's per-part caps can tell, say, an
// upper-chest exercise from a lower-chest one. Stores written before
// the split carry the old part names; migrateStoreData (logic.ts)
// renames them to each old part's primary successor.
export const MUSCLE_PARTS = [
  "胸上部", "胸下部", "肩前部", "上腕三頭",
  "肩後部", "上腕二頭", "背中上部", "広背筋", "脊柱起立筋", "前腕",
  "大腿四頭筋", "ハムストリング", "臀部", "内転筋", "ふくらはぎ",
  "腹筋上部", "腹筋下部", "腹斜筋", "体幹深部",
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
// The lists use the finer parts: each pre-expansion part expands to
// all of its successors （脚（後ろ）・お尻 → ハムストリング + 臀部，
// 体幹 → 腹斜筋 + 体幹深部, and so on).
export const JOINT_TO_MUSCLE_PARTS: Record<string, string[]> = {
  "腰": ["大腿四頭筋", "ハムストリング", "臀部", "腹筋上部", "腹筋下部", "腹斜筋", "体幹深部"],
  "背骨": ["背中上部", "広背筋", "脊柱起立筋", "腹筋上部", "腹筋下部", "腹斜筋", "体幹深部"],
  "肩": ["胸上部", "胸下部", "肩前部", "肩後部", "腹斜筋", "体幹深部"],
  "肘": ["胸上部", "胸下部", "肩前部", "肩後部", "背中上部", "広背筋", "脊柱起立筋"],
  "手首": ["胸上部", "胸下部", "肩前部", "肩後部", "腹斜筋", "体幹深部"],
  "股関節": ["大腿四頭筋", "ハムストリング", "臀部", "腹筋上部", "腹筋下部"],
  "膝": ["大腿四頭筋", "ハムストリング", "臀部", "ふくらはぎ"],
  "足首": ["大腿四頭筋", "ハムストリング", "臀部", "ふくらはぎ"],
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
    baseId: "pushup", name: "プッシュアップ", muscleGroup: "胸・三頭", painPart: "胸下部",
    jointParts: ["手首","肘","肩"],
    unit: "回", unilateralFrom: 6, baseTarget: 8, baseSets: 3, defaultLadder: 1,
    ladder: ["壁プッシュアップ", "膝つきプッシュアップ", "ワイドプッシュアップ", "プッシュアップ", "足上げプッシュアップ", "ダイヤモンドプッシュアップ", "アーチャープッシュアップ", "片手プッシュアップ"],
    loads: [30, 45, 55, 60, 70, 80, 95, 120], pattern: "push",
    cue: "体を一直線に保ち、胸が床に近づくまで下ろす。反動は使わない。",
    steps: ["手を肩幅に置き、足を伸ばして体を一直線にする", "肘を曲げて、胸が床に近づくまで下ろす", "手のひらで床を押して体を持ち上げる"],
    focus: "胸下部と上腕三頭",
  },
  pike: {
    baseId: "pike", name: "パイクプッシュアップ", muscleGroup: "肩", painPart: "肩前部",
    jointParts: ["手首","肘","肩"],
    unit: "回", baseTarget: 6, baseSets: 2, defaultLadder: 1,
    ladder: ["壁際パイクプッシュアップ（浅め）", "パイクプッシュアップ（浅め）", "パイクプッシュアップ", "足上げパイクプッシュアップ"],
    loads: [40, 55, 75, 85], pattern: "push",
    cue: "お尻を高く上げ、頭頂が床に向かうように肘を曲げる。",
    steps: ["四つ這いから腰を高く上げ、逆V字の姿勢を作る", "肘を曲げて、頭頂が床に近づくまで下ろす", "床を押して元の姿勢に戻る"],
    focus: "肩前部",
  },
  squat: {
    baseId: "squat", name: "スクワット", muscleGroup: "脚（前）", painPart: "大腿四頭筋",
    jointParts: ["膝","股関節","足首","腰"],
    unit: "回", baseTarget: 10, baseSets: 3, defaultLadder: 1,
    ladder: ["椅子スクワット", "スクワット", "スクワット（下で止める）", "ジャンプスクワット"],
    loads: [35, 50, 55, 70], pattern: "legs",
    cue: "膝とつま先の向きをそろえ、椅子に座るように下ろす。",
    steps: ["足を肩幅に開き、つま先を少し外に向ける", "椅子に座るように腰を下ろす（膝とつま先の向きをそろえる）", "かかとで床を押して立ち上がる"],
    focus: "大腿四頭筋と臀部",
  },
  calfJump: {
    baseId: "calfJump", name: "カーフジャンプ", muscleGroup: "ふくらはぎ", painPart: "ふくらはぎ",
    jointParts: ["足首","膝"],
    unit: "回", baseTarget: 12, baseSets: 2, defaultLadder: 1,
    ladder: ["両脚カーフジャンプ（低く）", "カーフジャンプ", "片脚カーフジャンプ", "片脚カーフジャンプ（高く・連続）"],
    loads: [20, 30, 50, 60], pattern: "legs",
    cue: "かかとを上げた勢いで軽く跳ぶ。着地は静かに。",
    steps: ["足を腰幅に開いて立つ", "かかとを上げた勢いで軽く真上に跳ぶ", "つま先で静かに着地し、そのまま繰り返す"],
    focus: "ふくらはぎ",
  },
  proneW: {
    baseId: "proneW", name: "プローンWレイズ", muscleGroup: "背中", painPart: "背中上部",
    jointParts: ["肩","腰","背骨"],
    unit: "回", baseTarget: 12, baseSets: 2, defaultLadder: 0,
    ladder: ["プローンWレイズ", "プローンWレイズ（トップで止める）", "W→Yコンビネーションレイズ"],
    loads: [35, 45, 50], pattern: "pull",
    cue: "うつ伏せで腕をWの形にし、肩甲骨を寄せながら胸を少し浮かせる。",
    steps: ["うつ伏せで腕をWの形に曲げる", "肩甲骨を寄せながら、胸と腕を少し浮かせる", "ゆっくり元の位置に戻す"],
    focus: "背中上部（肩甲骨まわり）",
  },
  proneY: {
    baseId: "proneY", name: "プローンYレイズ", muscleGroup: "背中", painPart: "背中上部",
    jointParts: ["肩","腰","背骨"],
    unit: "回", baseTarget: 10, baseSets: 2, defaultLadder: 0,
    ladder: ["プローンYレイズ", "プローンYレイズ（トップで止める）", "Y→Wコンビネーションレイズ"],
    loads: [35, 45, 50], pattern: "pull",
    cue: "うつ伏せで腕をYの形に伸ばし、親指を上にして少し浮かせる。",
    steps: ["うつ伏せで腕をYの形に伸ばす（親指は上）", "腕と胸を少し浮かせる", "ゆっくり元の位置に戻す"],
    focus: "背中上部と肩後部",
  },
  gluteBridge: {
    baseId: "gluteBridge", name: "グルートブリッジ", muscleGroup: "脚（後ろ）・お尻", painPart: "臀部",
    jointParts: ["腰","膝","股関節"],
    unit: "回", baseTarget: 12, baseSets: 3, defaultLadder: 0,
    ladder: ["グルートブリッジ", "グルートブリッジ（トップで止める）", "マーチングブリッジ", "片脚グルートブリッジ"],
    loads: [35, 45, 50, 65], pattern: "legs",
    cue: "かかとで床を押し、お尻を締めながら腰を持ち上げる。",
    steps: ["仰向けで膝を曲げ、足裏を床につける", "かかとで床を押し、お尻を締めながら腰を持ち上げる", "トップで止めてから、ゆっくり下ろす"],
    focus: "臀部とハムストリング",
  },
  rdl: {
    baseId: "rdl", name: "シングルレッグRDL", muscleGroup: "脚（後ろ）・お尻", painPart: "ハムストリング",
    jointParts: ["腰","股関節","膝"],
    unit: "回", unilateral: true, baseTarget: 8, baseSets: 2, defaultLadder: 1,
    ladder: ["両脚ヒップヒンジ", "シングルレッグRDL（支えあり）", "シングルレッグRDL", "シングルレッグRDL（体をひねる動き付き）"],
    loads: [30, 45, 60, 70], pattern: "legs",
    cue: "背中をまっすぐに保ち、股関節から折りたたむ。左右それぞれ行う。",
    steps: ["片脚で立ち、反対の脚を少し後ろに引く", "背中をまっすぐに保ち、股関節から上体を前に倒す", "太ももの裏の伸びを感じたら元に戻る（左右それぞれ行う）"],
    focus: "ハムストリングと臀部",
  },
  legRaise: {
    baseId: "legRaise", name: "レッグレイズ", muscleGroup: "腹筋", painPart: "腹筋下部",
    jointParts: ["腰","股関節","背骨"],
    unit: "回", baseTarget: 10, baseSets: 2, defaultLadder: 1,
    ladder: ["膝曲げレッグレイズ", "レッグレイズ", "フラッターキック", "レッグレイズ（ゆっくり下ろす）"],
    loads: [30, 45, 50, 60], pattern: "core",
    cue: "腰を床に押し付けたまま、脚をゆっくり上げ下ろしする。",
    steps: ["仰向けで両脚をそろえ、腰を床に押し付ける", "脚をゆっくり持ち上げる", "腰が浮く手前まで、ゆっくり下ろす"],
    focus: "腹筋下部",
  },
  crunch: {
    baseId: "crunch", name: "クランチ", muscleGroup: "腹筋", painPart: "腹筋上部",
    jointParts: ["腰","背骨"],
    unit: "回", baseTarget: 12, baseSets: 2, defaultLadder: 0,
    ladder: ["クランチ", "クランチ（トップで止める）", "クロスクランチ", "ロングレバークランチ"],
    loads: [30, 40, 45, 50], pattern: "core",
    cue: "腰を床につけたまま、肩甲骨が浮くところまで上体を丸める。首は引っ張らない。",
    steps: ["仰向けで膝を曲げ、手は胸の前か耳の横に置く", "肩甲骨が浮くところまで上体を丸める", "ゆっくり元に戻す（首は引っ張らない）"],
    focus: "腹筋上部",
  },
  plank: {
    baseId: "plank", name: "プランク", muscleGroup: "体幹", painPart: "体幹深部",
    jointParts: ["肩","肘","手首","腰","背骨"],
    unit: "秒", baseTarget: 40, baseSets: 2, defaultLadder: 2,
    ladder: ["膝つきプランク", "ハイプランク", "プランク", "プランク（片脚浮かせ）", "ロングレバープランク", "片手プランク"],
    loads: [4, 5, 6, 8, 8, 10], pattern: "core",
    cue: "肘とつま先で支え、腰を反らさず一直線を保つ。",
    steps: ["肘とつま先で体を支える", "頭からかかとまで一直線を保つ", "腰を反らさず、そのままキープする"],
    focus: "体幹深部（腹筋と背筋）",
  },
  sidePlank: {
    baseId: "sidePlank", name: "サイドプランク", muscleGroup: "体幹（側面）", painPart: "腹斜筋",
    jointParts: ["肩","肘","腰","背骨"],
    unit: "秒", baseTarget: 30, baseSets: 2, defaultLadder: 0,
    ladder: ["サイドプランク（膝曲げ）", "サイドプランク", "サイドプランク（上の脚を上げる）"],
    loads: [4, 6, 7], pattern: "core",
    cue: "横向きで肘をつき、体を一直線に保つ。左右それぞれ行う。",
    steps: ["横向きで下の肘をつく", "体を一直線に持ち上げてキープする", "反対側も同じ時間行う"],
    focus: "腹斜筋",
  },
  reverseLunge: {
    baseId: "reverseLunge", name: "リバースランジ", muscleGroup: "脚（前）", painPart: "大腿四頭筋",
    jointParts: ["膝","股関節","足首"],
    unit: "回", unilateral: true, baseTarget: 8, baseSets: 2, defaultLadder: 1,
    ladder: ["スプリットスクワット（浅め）", "リバースランジ", "ブルガリアンスクワット", "ランジジャンプ"],
    loads: [35, 50, 70, 85], pattern: "legs",
    cue: "一歩後ろに引き、上体をまっすぐに保って下ろす。左右それぞれ行う。",
    steps: ["立った姿勢から一歩後ろに引く", "上体をまっすぐに保ったまま腰を下ろす", "前脚のかかとで押して元に戻る（左右それぞれ行う）"],
    focus: "大腿四頭筋と臀部",
  },
  // ----- catalog expansion (2026-11-16): 41 new families -----
  // Load points follow the existing scale (standard push-up rep =
  // 60, plank = 6/sec); they are relative values ordered by the
  // difficulty progressions in the cited guides, not measurements,
  // and are expected to be corrected by the user's own records.
  chairDip: {
    baseId: "chairDip", name: "椅子ディップス", muscleGroup: "胸・三頭", painPart: "上腕三頭",
    jointParts: ["肩","肘","手首"],
    unit: "回", baseTarget: 8, baseSets: 2, defaultLadder: 0,
    ladder: ["膝曲げ椅子ディップス", "椅子ディップス（脚伸ばし）", "足上げ椅子ディップス", "片脚支持椅子ディップス"],
    loads: [40, 55, 70, 80], pattern: "push",
    cue: "安定した椅子の縁につかまり、肘を曲げて体を下ろす。肩が肘より下がりすぎない範囲で止める。",
    steps: ["安定した椅子の縁に背を向けて両手をつく", "肘を曲げて体をゆっくり下ろす（肩が肘より下がりすぎない範囲で）", "肘を伸ばして元の位置に戻る"],
    focus: "上腕三頭と胸下部",
  },
  tricepsExtension: {
    baseId: "tricepsExtension", name: "三頭エクステンション", muscleGroup: "上腕", painPart: "上腕三頭",
    jointParts: ["肘","手首","肩"],
    unit: "回", baseTarget: 8, baseSets: 2, defaultLadder: 1,
    ladder: ["壁三頭エクステンション", "膝つきフロアエクステンション", "フロア三頭エクステンション", "プランク姿勢三頭エクステンション"],
    loads: [25, 40, 55, 70], pattern: "push",
    cue: "肘の位置を固定し、前腕だけを動かして体を押し戻す。",
    steps: ["床に手をつき、肘を肩の真下に置く", "肘を曲げて額が床に近づくまで下ろす（肘は開かない）", "前腕で床を押して元の姿勢に戻る"],
    focus: "上腕三頭",
  },
  handstandPushup: {
    baseId: "handstandPushup", name: "倒立プッシュアップ", muscleGroup: "肩", painPart: "肩前部",
    jointParts: ["手首","肩","肘"],
    unit: "回", baseTarget: 3, baseSets: 2, defaultLadder: 0,
    ladder: ["足上げパイクプッシュアップ", "壁倒立プッシュアップ（ネガティブのみ）", "壁倒立プッシュアップ（浅め）", "壁倒立プッシュアップ"],
    loads: [85, 100, 115, 130], pattern: "push",
    cue: "壁を使って行う。足上げパイクで十分な回数がこなせることが前提。下ろす動作（ネガティブ）から段階を踏む。",
    steps: ["壁に向かって倒立し、壁に足を預ける", "肘を曲げて頭頂が床に近づくまでゆっくり下ろす", "床を押して元の姿勢に戻る（できない段では下ろすだけでよい）"],
    focus: "肩前部と上腕三頭",
  },
  plankUpDown: {
    baseId: "plankUpDown", name: "プランクアップダウン", muscleGroup: "体幹", painPart: "上腕三頭",
    jointParts: ["肘","肩","手首","腰","背骨"],
    unit: "回", baseTarget: 6, baseSets: 2, defaultLadder: 1,
    ladder: ["膝つきプランクアップダウン", "プランクアップダウン", "片脚プランクアップダウン"],
    loads: [30, 45, 60], pattern: "push",
    cue: "肘プランクと手のひらプランクを交互に行き来する。腰を左右に揺らさない。",
    steps: ["肘プランクの姿勢を取る", "片手ずつ手のひらに置き換えてハイプランクへ上がる", "片肘ずつ戻して肘プランクへ下りる"],
    focus: "上腕三頭と体幹深部",
  },
  scapularPushup: {
    baseId: "scapularPushup", name: "肩甲骨プッシュアップ", muscleGroup: "肩", painPart: "肩前部",
    jointParts: ["肩","手首","肘"],
    unit: "回", baseTarget: 10, baseSets: 2, defaultLadder: 1,
    ladder: ["壁肩甲骨プッシュアップ", "膝つき肩甲骨プッシュアップ", "肩甲骨プッシュアップ", "片脚肩甲骨プッシュアップ"],
    loads: [20, 30, 40, 50], pattern: "push",
    cue: "肘は伸ばしたまま、肩甲骨の寄せと開きだけで体を上下させる。",
    steps: ["プランクの姿勢で肘を伸ばしたまま構える", "肩甲骨を開いて体を少し沈める", "肩甲骨を寄せて体を持ち上げる"],
    focus: "前鋸筋（肩甲骨まわり）",
  },
  superman: {
    baseId: "superman", name: "スーパーマン", muscleGroup: "背中", painPart: "脊柱起立筋",
    jointParts: ["腰","背骨","肩"],
    unit: "回", baseTarget: 10, baseSets: 2, defaultLadder: 1,
    ladder: ["スーパーマン（腕のみ）", "スーパーマン", "スーパーマン（トップで2秒止める）", "スーパーマンスイム（対角を交互に引く）"],
    loads: [25, 35, 45, 55], pattern: "pull",
    cue: "うつ伏せで腕と脚を少し浮かせる。反動は使わず、腰を反らしすぎない。",
    steps: ["うつ伏せで腕を前に伸ばす", "腕と脚を床から少し浮かせる", "ゆっくり元の位置に戻す"],
    focus: "脊柱起立筋と臀部",
  },
  backExtension: {
    baseId: "backExtension", name: "バックエクステンション", muscleGroup: "背中", painPart: "脊柱起立筋",
    jointParts: ["腰","背骨","股関節"],
    unit: "回", baseTarget: 10, baseSets: 2, defaultLadder: 1,
    ladder: ["コブラ", "バックエクステンション（手は体の横）", "バックエクステンション（手を頭の後ろ）", "バックエクステンション（手を前方へ伸ばす）"],
    loads: [20, 30, 40, 50], pattern: "pull",
    cue: "うつ伏せで上体を少し浮かせる。首は背中の延長に保ち、反らしすぎない。",
    steps: ["うつ伏せで手を指定の位置に置く", "胸と上体を床から少し浮かせる", "ゆっくり元の位置に戻す"],
    focus: "脊柱起立筋",
  },
  reverseSnowAngel: {
    baseId: "reverseSnowAngel", name: "リバーススノーエンジェル", muscleGroup: "背中", painPart: "背中上部",
    jointParts: ["肩","背骨"],
    unit: "回", baseTarget: 10, baseSets: 2, defaultLadder: 0,
    ladder: ["スノーエンジェル（腕を床につけたまま滑らせる）", "リバーススノーエンジェル", "リバーススノーエンジェル（浮かせて止める）"],
    loads: [20, 30, 40], pattern: "pull",
    cue: "うつ伏せで腕を弧を描くように頭上から体の横へ動かす。肩甲骨を寄せながら行う。",
    steps: ["うつ伏せで腕を頭上に伸ばす", "肩甲骨を寄せながら、腕を弧を描いて体の横まで動かす", "ゆっくり頭上へ戻す"],
    focus: "背中上部と肩後部",
  },
  proneT: {
    baseId: "proneT", name: "プローンTレイズ", muscleGroup: "背中", painPart: "肩後部",
    jointParts: ["肩","背骨"],
    unit: "回", baseTarget: 10, baseSets: 2, defaultLadder: 0,
    ladder: ["Tスライド（腕を床につけたまま）", "プローンTレイズ", "プローンTレイズ（トップで止める）"],
    loads: [25, 35, 45], pattern: "pull",
    cue: "うつ伏せで腕をTの形に広げ、親指を上にして少し浮かせる。",
    steps: ["うつ伏せで腕を横に伸ばしてTの形を作る（親指は上）", "腕と胸を少し浮かせる", "ゆっくり元の位置に戻す"],
    focus: "肩後部と背中上部",
  },
  backWidow: {
    baseId: "backWidow", name: "バックウィドウ", muscleGroup: "背中", painPart: "背中上部",
    jointParts: ["肘","肩","背骨"],
    unit: "回", baseTarget: 8, baseSets: 2, defaultLadder: 0,
    ladder: ["バックウィドウ（部分的な可動域）", "バックウィドウ", "バックウィドウ（トップで止める）"],
    loads: [30, 45, 55], pattern: "pull",
    cue: "仰向けで肘を床に押し込み、肩甲骨を寄せて上体を少し浮かせる。",
    steps: ["仰向けで膝を曲げ、肘を体の横で床につける", "肘で床を強く押し、肩甲骨を寄せて上体を少し浮かせる", "ゆっくり元の位置に戻す"],
    focus: "背中上部と上腕二頭",
  },
  pronePull: {
    baseId: "pronePull", name: "プローンプル", muscleGroup: "背中", painPart: "広背筋",
    jointParts: ["肩","肘","背骨"],
    unit: "回", unilateralFrom: 2, baseTarget: 8, baseSets: 2, defaultLadder: 0,
    ladder: ["プローンプル（短い可動域）", "プローンプル", "片腕プローンプル"],
    loads: [35, 50, 70], pattern: "pull",
    cue: "うつ伏せで頭上に伸ばした腕を、床に置いたタオルなどの滑りを使って体側へ引く。滑る床でないと行えない。",
    steps: ["うつ伏せで腕を頭上に伸ばし、手の下にタオルを置く", "タオルを滑らせながら、肘を体側へ引く", "ゆっくり頭上へ戻す"],
    focus: "広背筋",
  },
  tableRow: {
    baseId: "tableRow", name: "テーブルロウ", muscleGroup: "背中", painPart: "背中上部",
    jointParts: ["肘","肩","手首"],
    unit: "回", unilateralFrom: 3, baseTarget: 8, baseSets: 2, defaultLadder: 0,
    ladder: ["膝曲げテーブルロウ", "テーブルロウ", "足上げテーブルロウ", "片手テーブルロウ"],
    loads: [45, 60, 75, 95], pattern: "pull",
    cue: "テーブルの下に入り、天板の端をつかんで体を引き寄せる。使用前に強く引いてぐらつきがないか必ず確認し、ぐらつく場合は行わない。",
    steps: ["安定したテーブルの下に入り、天板の端を両手でつかむ", "体を一直線に保ち、胸をテーブルへ引き寄せる", "ゆっくり元の位置に戻る"],
    focus: "背中上部と広背筋",
  },
  doorRow: {
    baseId: "doorRow", name: "ドアフレームロウ", muscleGroup: "背中", painPart: "広背筋",
    jointParts: ["肘","肩","手首"],
    unit: "回", unilateralFrom: 2, baseTarget: 8, baseSets: 2, defaultLadder: 0,
    ladder: ["ドアフレームロウ（浅い角度）", "ドアフレームロウ（深い角度）", "片手ドアフレームロウ"],
    loads: [40, 55, 75], pattern: "pull",
    cue: "ドア枠をつかみ、体を傾けて引き寄せる。枠の強度を事前に確認する。",
    steps: ["ドア枠を両手でつかみ、足を枠の近くに置く", "体を後ろへ傾け、一直線を保つ", "肘を引いて体を枠へ近づけ、ゆっくり戻る"],
    focus: "広背筋と上腕二頭",
  },
  pistolSquat: {
    baseId: "pistolSquat", name: "ピストルスクワット", muscleGroup: "脚（前）", painPart: "大腿四頭筋",
    jointParts: ["膝","股関節","足首"],
    unit: "回", unilateral: true, baseTarget: 5, baseSets: 2, defaultLadder: 0,
    ladder: ["椅子タッチ片脚スクワット", "片脚スクワット（浅め・支えあり）", "ピストルスクワット（支えあり）", "ピストルスクワット"],
    loads: [55, 70, 85, 100], pattern: "legs",
    cue: "片脚でゆっくり下ろし、かかとで押して立つ。左右それぞれ行う。",
    steps: ["片脚で立ち、反対の脚を前に伸ばす", "椅子に触れる深さまで、ゆっくり腰を下ろす", "支持脚のかかとで押して立ち上がる（左右それぞれ行う）"],
    focus: "大腿四頭筋と臀部",
  },
  legExtension: {
    baseId: "legExtension", name: "自重レッグエクステンション", muscleGroup: "脚（前）", painPart: "大腿四頭筋",
    jointParts: ["膝","股関節"],
    unit: "回", baseTarget: 6, baseSets: 2, defaultLadder: 0,
    ladder: ["膝立ちレッグエクステンション（浅め・支えあり）", "膝立ちレッグエクステンション", "シシースクワット（支えあり）", "シシースクワット"],
    loads: [40, 60, 70, 85], pattern: "legs",
    cue: "必ず何かにつかまって行う。膝への負担が大きい種目なので、膝に痛みがある場合は避ける。",
    steps: ["膝立ちで体を一直線に保ち、何かにつかまる", "膝を支点に、体をゆっくり後ろへ倒す", "太ももの前側の力で元の姿勢に戻る"],
    focus: "大腿四頭筋",
  },
  wallSit: {
    baseId: "wallSit", name: "ウォールシット", muscleGroup: "脚（前）", painPart: "大腿四頭筋",
    jointParts: ["膝","股関節","足首"],
    unit: "秒", baseTarget: 30, baseSets: 2, defaultLadder: 1,
    ladder: ["ウォールシット（浅め）", "ウォールシット", "ウォールシット（かかとを浮かせる）", "片脚ウォールシット"],
    loads: [3, 4, 5, 7], pattern: "legs",
    cue: "背中を壁につけ、椅子に座る姿勢で保持する。最終段は片脚ずつ行う。",
    steps: ["背中を壁につけ、足を前に出して腰を下ろす", "太ももが床と平行になる位置で止める", "そのまま保持する（片脚の段は左右それぞれ行う）"],
    focus: "大腿四頭筋",
  },
  stepUp: {
    baseId: "stepUp", name: "ステップアップ", muscleGroup: "脚（前）", painPart: "大腿四頭筋",
    jointParts: ["膝","股関節","足首"],
    unit: "回", unilateral: true, baseTarget: 8, baseSets: 2, defaultLadder: 0,
    ladder: ["低い段へのステップアップ", "ステップアップ", "高い段へのステップアップ", "ステップアップ（膝上げドライブ付き）"],
    loads: [40, 55, 70, 80], pattern: "legs",
    cue: "安定した段や椅子に片脚で乗り、上の脚の力だけで立ち上がる。左右それぞれ行う。",
    steps: ["安定した段の前に立ち、片足を段に乗せる", "段の上の脚のかかとで押して立ち上がる", "ゆっくり下りて繰り返す（左右それぞれ行う）"],
    focus: "大腿四頭筋と臀部",
  },
  forwardLunge: {
    baseId: "forwardLunge", name: "フォワードランジ", muscleGroup: "脚（前）", painPart: "大腿四頭筋",
    jointParts: ["膝","股関節","足首"],
    unit: "回", baseTarget: 8, baseSets: 2, defaultLadder: 1,
    ladder: ["フォワードランジ（浅め）", "フォワードランジ", "ウォーキングランジ", "フォワードランジ（膝ドライブ付き）"],
    loads: [40, 55, 60, 70], pattern: "legs",
    cue: "一歩前に踏み出し、上体をまっすぐに保って腰を下ろす。左右交互に行う。",
    steps: ["立った姿勢から一歩前に踏み出す", "上体をまっすぐに保ったまま腰を下ろす", "前脚のかかとで押して元に戻る（左右交互に行う）"],
    focus: "大腿四頭筋と臀部",
  },
  cossackSquat: {
    baseId: "cossackSquat", name: "コサックスクワット", muscleGroup: "脚（前）", painPart: "内転筋",
    jointParts: ["膝","股関節","足首"],
    unit: "回", baseTarget: 6, baseSets: 2, defaultLadder: 0,
    ladder: ["ラテラルランジ（浅め・支えあり）", "コサックスクワット", "コサックスクワット（深く沈む）", "コサックスクワット（左右を連続で移動）"],
    loads: [40, 55, 65, 70], pattern: "legs",
    cue: "横へ大きく開き、片脚に体重を移して深く沈む。伸ばした脚の内側の伸びを感じる。",
    steps: ["足を大きく横に開いて立つ", "片側へ体重を移し、その脚の膝を曲げて深く沈む（反対の脚は伸ばす）", "押して元に戻り、反対側も行う"],
    focus: "内転筋と大腿四頭筋",
  },
  sumoSquat: {
    baseId: "sumoSquat", name: "スモウスクワット", muscleGroup: "脚（前）", painPart: "内転筋",
    jointParts: ["膝","股関節","足首"],
    unit: "回", baseTarget: 10, baseSets: 2, defaultLadder: 1,
    ladder: ["ワイドスクワット（浅め）", "スモウスクワット", "スモウスクワット（かかとを浮かせて止める）"],
    loads: [35, 45, 55], pattern: "legs",
    cue: "足を大きく開き、つま先を外へ向けて腰を下ろす。膝はつま先と同じ向きに保つ。",
    steps: ["足を肩幅より大きく開き、つま先を外に向ける", "膝とつま先の向きをそろえて腰を下ろす", "かかとで床を押して立ち上がる"],
    focus: "内転筋と臀部",
  },
  nordicCurl: {
    baseId: "nordicCurl", name: "ノルディックカール", muscleGroup: "脚（後ろ）・お尻", painPart: "ハムストリング",
    jointParts: ["膝","股関節","腰"],
    unit: "回", baseTarget: 4, baseSets: 2, defaultLadder: 0,
    ladder: ["ノルディックカール（部分的な可動域）", "ノルディックカール（ネガティブのみ、手で戻る）", "ノルディックカール（腰を少し曲げて補助）", "ノルディックカール"],
    loads: [60, 80, 95, 120], pattern: "legs",
    cue: "足をソファの下などに固定して行う（ソファが滑らないことを確認）。負荷が非常に強く筋肉痛が出やすいので、部分的な可動域やネガティブのみの段から始める。",
    steps: ["膝立ちで足を固定し、体を一直線に保つ", "膝を支点に、体をゆっくり前に倒す（耐えられる範囲まで）", "手をついて元の姿勢に戻る"],
    focus: "ハムストリング",
  },
  slidingLegCurl: {
    baseId: "slidingLegCurl", name: "スライディングレッグカール", muscleGroup: "脚（後ろ）・お尻", painPart: "ハムストリング",
    jointParts: ["膝","股関節","腰"],
    unit: "回", unilateralFrom: 2, baseTarget: 8, baseSets: 2, defaultLadder: 0,
    ladder: ["両脚スライドアウト（腰を低く保つ）", "ブリッジスライディングカール", "片脚スライディングカール", "片脚スライディングカール（ネガティブをゆっくり）"],
    loads: [35, 50, 75, 85], pattern: "legs",
    cue: "かかとの下にタオルや靴下を置き、滑る床で脚を伸ばしたり引き寄せたりする。",
    steps: ["仰向けでかかとの下にタオルを置き、腰を浮かせる", "かかとを滑らせて脚をまっすぐ伸ばす", "太ももの裏側の力でかかとを引き寄せる"],
    focus: "ハムストリングと臀部",
  },
  hipThrust: {
    baseId: "hipThrust", name: "ヒップスラスト", muscleGroup: "脚（後ろ）・お尻", painPart: "臀部",
    jointParts: ["股関節","膝","腰"],
    unit: "回", unilateralFrom: 2, baseTarget: 10, baseSets: 2, defaultLadder: 0,
    ladder: ["ヒップスラスト（両脚）", "ヒップスラスト（トップで止める）", "片脚ヒップスラスト"],
    loads: [45, 55, 75], pattern: "legs",
    cue: "肩を安定した椅子やソファの縁に乗せ、お尻を締めながら腰を持ち上げる。",
    steps: ["椅子やソファの縁に肩を乗せ、膝を曲げて足裏を床につける", "かかとで床を押し、お尻を締めながら腰を持ち上げる", "トップで止めてから、ゆっくり下ろす"],
    focus: "臀部",
  },
  sideLyingAbduction: {
    baseId: "sideLyingAbduction", name: "サイドライングアブダクション", muscleGroup: "脚（後ろ）・お尻", painPart: "臀部",
    jointParts: ["股関節"],
    unit: "回", unilateral: true, baseTarget: 10, baseSets: 2, defaultLadder: 1,
    ladder: ["クラムシェル", "サイドライングレッグレイズ", "サイドライングレッグレイズ（トップで止めて小さく動かす）"],
    loads: [20, 30, 40], pattern: "legs",
    cue: "横向きに寝て、上の脚をまっすぐ持ち上げる。体が前後に倒れないように保つ。左右それぞれ行う。",
    steps: ["横向きに寝て、下の腕で頭を支える", "上の脚をまっすぐ上に持ち上げる", "ゆっくり下ろす（左右それぞれ行う）"],
    focus: "臀部（中臀筋）",
  },
  calf: {
    baseId: "calf", name: "カーフレイズ", muscleGroup: "ふくらはぎ", painPart: "ふくらはぎ",
    jointParts: ["足首","膝"],
    unit: "回", unilateralFrom: 2, baseTarget: 12, baseSets: 2, defaultLadder: 0,
    ladder: ["両脚カーフレイズ", "段差カーフレイズ", "片脚カーフレイズ", "片脚段差カーフレイズ", "片脚エキセントリックヒールドロップ"],
    loads: [20, 30, 50, 60, 65], pattern: "legs",
    cue: "かかとを目いっぱい上げ、トップで止めてからゆっくり下ろす。",
    steps: ["足を腰幅に開いて立つ（段差の段ではつま先だけを段に乗せる）", "かかとをできるだけ高く上げる", "トップで止めてから、ゆっくり下ろす"],
    focus: "ふくらはぎ（腓腹筋）",
  },
  soleusRaise: {
    baseId: "soleusRaise", name: "ヒラメ筋レイズ", muscleGroup: "ふくらはぎ", painPart: "ふくらはぎ",
    jointParts: ["足首","膝"],
    unit: "回", unilateralFrom: 2, baseTarget: 12, baseSets: 2, defaultLadder: 1,
    ladder: ["座位カーフレイズ", "膝曲げカーフレイズ（立位）", "片脚膝曲げカーフレイズ"],
    loads: [15, 25, 40], pattern: "legs",
    cue: "膝を曲げたまま行うカーフレイズ。膝を曲げることでヒラメ筋に効く。",
    steps: ["膝を軽く曲げた姿勢を取る（座位の段は椅子に座る）", "膝の角度を保ったまま、かかとを上げる", "ゆっくり下ろす"],
    focus: "ヒラメ筋",
  },
  deadBug: {
    baseId: "deadBug", name: "デッドバグ", muscleGroup: "体幹", painPart: "体幹深部",
    jointParts: ["腰","背骨","股関節"],
    unit: "回", baseTarget: 8, baseSets: 2, defaultLadder: 1,
    ladder: ["デッドバグ（脚のみ・膝曲げ）", "デッドバグ（対角の手足）", "デッドバグ（脚をまっすぐ伸ばす）", "デッドバグ（腕も頭上へ伸ばす）"],
    loads: [25, 35, 45, 55], pattern: "core",
    cue: "腰を床に押し付けたまま、対角の手足をゆっくり伸ばす。腰が浮いたら戻す範囲を狭める。",
    steps: ["仰向けで腕を上に伸ばし、膝を90度に曲げて浮かせる", "腰を床に押し付けたまま、対角の手足をゆっくり伸ばす", "元の姿勢に戻り、反対の対角も行う"],
    focus: "体幹深部と腹筋下部",
  },
  birdDog: {
    baseId: "birdDog", name: "バードドッグ", muscleGroup: "体幹", painPart: "脊柱起立筋",
    jointParts: ["腰","背骨","股関節","肩"],
    unit: "回", baseTarget: 8, baseSets: 2, defaultLadder: 1,
    ladder: ["バードドッグ（脚のみ）", "バードドッグ（対角の手足）", "バードドッグ（肘と膝をタッチ）", "バードドッグ（伸ばして長く止める）"],
    loads: [20, 30, 40, 45], pattern: "core",
    cue: "四つ這いから対角の手足をまっすぐ伸ばす。骨盤を水平に保ち、腰を反らさない。",
    steps: ["四つ這いになる", "対角の手と脚を、体と一直線になるまで伸ばす", "元の姿勢に戻り、反対の対角も行う"],
    focus: "脊柱起立筋と臀部",
  },
  hollowHold: {
    baseId: "hollowHold", name: "ホローホールド", muscleGroup: "腹筋", painPart: "腹筋下部",
    jointParts: ["腰","背骨"],
    unit: "秒", baseTarget: 20, baseSets: 2, defaultLadder: 0,
    ladder: ["タックホローホールド", "ホローホールド（片脚を伸ばす）", "ストラドルホローホールド", "ホローボディホールド"],
    loads: [4, 5, 6, 7], pattern: "core",
    cue: "腰を床に押し付けたまま、体を浅いバナナの形に保つ。腰が浮く形では行わない。",
    steps: ["仰向けで腰を床に押し付ける", "肩と脚を少し浮かせ、体を浅く丸めた形を作る", "腰を床につけたまま保持する"],
    focus: "腹筋下部と体幹深部",
  },
  reverseCrunch: {
    baseId: "reverseCrunch", name: "リバースクランチ", muscleGroup: "腹筋", painPart: "腹筋下部",
    jointParts: ["腰","背骨","股関節"],
    unit: "回", baseTarget: 10, baseSets: 2, defaultLadder: 0,
    ladder: ["膝曲げリバースクランチ", "リバースクランチ", "リバースクランチ（脚をまっすぐ伸ばす）", "ドラゴンフラッグ（ネガティブのみ）"],
    loads: [30, 40, 55, 80], pattern: "core",
    cue: "仰向けで膝をお尻側へ引き寄せ、骨盤を少し浮かせる。反動は使わない。",
    steps: ["仰向けで膝を曲げて浮かせる", "骨盤を丸めるように、お尻を床から少し浮かせる", "ゆっくり元の位置に戻す"],
    focus: "腹筋下部",
  },
  bicycleCrunch: {
    baseId: "bicycleCrunch", name: "バイシクルクランチ", muscleGroup: "腹筋", painPart: "腹斜筋",
    jointParts: ["腰","背骨"],
    unit: "回", baseTarget: 10, baseSets: 2, defaultLadder: 1,
    ladder: ["バイシクルクランチ（脚を高く保つ）", "バイシクルクランチ", "バイシクルクランチ（ゆっくり・トップで止める）"],
    loads: [30, 40, 50], pattern: "core",
    cue: "肘と反対の膝を近づけるように上体をひねる。首は引っ張らない。左右交互に行う。",
    steps: ["仰向けで手を耳の横に置き、膝を浮かせる", "上体をひねり、肘を反対の膝へ近づける", "反対側も同じように行う"],
    focus: "腹斜筋",
  },
  russianTwist: {
    baseId: "russianTwist", name: "ロシアンツイスト", muscleGroup: "腹筋", painPart: "腹斜筋",
    jointParts: ["腰","背骨"],
    unit: "回", baseTarget: 10, baseSets: 2, defaultLadder: 0,
    ladder: ["ロシアンツイスト（足を床につける）", "ロシアンツイスト（足を浮かせる）", "ロシアンツイスト（脚を伸ばす）"],
    loads: [25, 35, 45], pattern: "core",
    cue: "ゆっくり小さい範囲でひねる。腰に不安がある場合は避け、デッドバグなどの抗回旋系を選ぶ。",
    steps: ["膝を曲げて座り、上体を少し後ろへ倒す", "両手を胸の前で組み、上体をゆっくり左右へひねる", "反対側も同じ範囲で行う"],
    focus: "腹斜筋",
  },
  vUp: {
    baseId: "vUp", name: "Vアップ", muscleGroup: "腹筋", painPart: "腹筋上部",
    jointParts: ["腰","背骨","股関節"],
    unit: "回", baseTarget: 8, baseSets: 2, defaultLadder: 0,
    ladder: ["タックアップ", "ジャックナイフ（片脚ずつ交互）", "Vアップ", "Vアップ（トップで止める）"],
    loads: [35, 45, 60, 70], pattern: "core",
    cue: "手と脚を同時に持ち上げ、体をVの字に折る。腰が反る手前で止める。",
    steps: ["仰向けで腕を頭上に伸ばす", "手先とつま先を近づけるように、体をVの字に折る", "ゆっくり元の位置に戻す"],
    focus: "腹筋上部と腹筋下部",
  },
  mountainClimber: {
    baseId: "mountainClimber", name: "マウンテンクライマー", muscleGroup: "腹筋", painPart: "腹筋下部",
    jointParts: ["肩","手首","腰","股関節"],
    unit: "回", baseTarget: 12, baseSets: 2, defaultLadder: 1,
    ladder: ["マウンテンクライマー（ゆっくり）", "マウンテンクライマー", "クロスボディマウンテンクライマー", "スパイダーマウンテンクライマー"],
    loads: [30, 40, 45, 50], pattern: "core",
    cue: "プランクの姿勢で膝を交互に胸へ引き寄せる。腰の高さを保ち、反動で跳ねない。",
    steps: ["ハイプランクの姿勢を取る", "片膝を胸へ引き寄せる", "戻して反対の膝を引き寄せる"],
    focus: "腹筋下部と肩前部",
  },
  plankTap: {
    baseId: "plankTap", name: "プランクショルダータップ", muscleGroup: "体幹", painPart: "体幹深部",
    jointParts: ["肩","肘","手首","腰","背骨"],
    unit: "回", baseTarget: 10, baseSets: 2, defaultLadder: 1,
    ladder: ["膝つきプランクショルダータップ", "プランクショルダータップ", "プランクリーチ（前方へ手を伸ばす）", "プランクリーチ（片脚を浮かせる）"],
    loads: [25, 35, 45, 50], pattern: "core",
    cue: "プランクの姿勢で片手で反対の肩をタッチする。骨盤を揺らさない。左右交互に行う。",
    steps: ["ハイプランクの姿勢を取る", "片手を離して反対の肩をタッチする", "手を戻し、反対の手でも行う"],
    focus: "体幹深部と腹斜筋",
  },
  copenhagenPlank: {
    baseId: "copenhagenPlank", name: "コペンハーゲンプランク", muscleGroup: "体幹（側面）", painPart: "内転筋",
    jointParts: ["股関節","腰","肩","肘"],
    unit: "秒", baseTarget: 15, baseSets: 2, defaultLadder: 0,
    ladder: ["コペンハーゲンプランク（短いレバー・下の脚を床につける）", "コペンハーゲンプランク（短いレバー）", "コペンハーゲンプランク（長いレバー）"],
    loads: [5, 7, 9], pattern: "core",
    cue: "上の脚を椅子やソファの縁に乗せて行う。台の高さが体に合わないと腰や股関節に無理がかかるため、高さの合う安定した台を使う。レバーが長くなると負荷が大きく跳ね上がるため、短いレバー（膝を台に乗せる形）から始める。左右それぞれ行う。",
    steps: ["横向きで下の肘をつき、上の脚を椅子やソファの縁に乗せる", "体を一直線に持ち上げる", "そのまま保持し、反対側も同じ時間行う"],
    focus: "内転筋と腹斜筋",
  },
  lSit: {
    baseId: "lSit", name: "Lシット", muscleGroup: "腹筋", painPart: "腹筋下部",
    jointParts: ["手首","肩","股関節"],
    unit: "秒", baseTarget: 10, baseSets: 2, defaultLadder: 0,
    ladder: ["タックシット（足を床につけて補助）", "タックLシット", "片脚Lシット", "Lシット"],
    loads: [5, 7, 9, 12], pattern: "core",
    cue: "床に座って両手で体を支え、脚を浮かせる。肩を下げて体を持ち上げる意識で行う。",
    steps: ["脚を前に伸ばして座り、両手を腰の横の床につく", "腕で床を押して体を持ち上げる", "脚を浮かせたまま保持する"],
    focus: "腹筋下部と上腕三頭",
  },
  burpee: {
    baseId: "burpee", name: "バーピー", muscleGroup: "脚（前）", painPart: "大腿四頭筋",
    jointParts: ["膝","股関節","足首","肩","手首","腰"],
    unit: "回", baseTarget: 6, baseSets: 2, defaultLadder: 0,
    ladder: ["バーピー（歩いて戻る・ジャンプなし）", "バーピー（ジャンプなし）", "バーピー", "バーピー（プッシュアップ付き）", "バーピー（タックジャンプ付き）"],
    loads: [45, 55, 70, 85, 95], pattern: "legs",
    cue: "しゃがむ→脚を引く→戻る→立つ、を続ける。易しい段はジャンプなしで、着地の衝撃と音を避けられる。",
    steps: ["しゃがんで両手を床につく", "両脚を後ろへ引いてプランクの姿勢になる", "両脚を戻して立ち上がる（段に応じてジャンプを加える）"],
    focus: "大腿四頭筋と体幹深部",
  },
  bearCrawl: {
    baseId: "bearCrawl", name: "ベアクロール", muscleGroup: "体幹", painPart: "体幹深部",
    jointParts: ["肩","手首","腰","膝"],
    unit: "秒", baseTarget: 20, baseSets: 2, defaultLadder: 0,
    ladder: ["ベアホールド（膝を浮かせて止める）", "ベアクロール（その場で手足を動かす）", "ベアクロール（前後に移動する）"],
    loads: [4, 5, 6], pattern: "core",
    cue: "四つ這いから膝を少し浮かせ、背中を平らに保つ。対角の手足を同時に動かす。",
    steps: ["四つ這いになり、膝を床から少し浮かせる", "背中を平らに保ったまま保持、または対角の手足を動かす", "腰の高さを変えずに続ける"],
    focus: "体幹深部と肩前部",
  },
  inchworm: {
    baseId: "inchworm", name: "インチワーム", muscleGroup: "体幹", painPart: "ハムストリング",
    jointParts: ["肩","手首","腰","股関節"],
    unit: "回", baseTarget: 6, baseSets: 2, defaultLadder: 0,
    ladder: ["インチワーム（膝を曲げてよい）", "インチワーム", "インチワーム（プッシュアップ付き）"],
    loads: [35, 45, 60], pattern: "core",
    cue: "立った姿勢から手で歩いてプランクまで進み、手で歩いて戻る。太ももの裏の伸びを感じる範囲で行う。",
    steps: ["立った姿勢から前屈して両手を床につく", "手で歩いてプランクの姿勢まで進む", "手で歩いて足元へ戻り、立ち上がる"],
    focus: "ハムストリングと肩前部",
  },
  skaterJump: {
    baseId: "skaterJump", name: "スケータージャンプ", muscleGroup: "脚（前）", painPart: "臀部",
    jointParts: ["膝","股関節","足首"],
    unit: "回", baseTarget: 8, baseSets: 2, defaultLadder: 0,
    ladder: ["ラテラルステップタッチ", "スケータージャンプ（小さく）", "スケータージャンプ", "スケータージャンプ（着地で止める）"],
    loads: [30, 50, 65, 70], pattern: "legs",
    cue: "横へ跳んで片脚で着地する。着地は静かに、膝とつま先の向きをそろえる。左右交互に行う。",
    steps: ["片脚で立ち、横へ跳ぶ", "反対の脚で着地し、膝を軽く曲げて衝撃を吸収する", "そのまま反対方向へ跳ぶ"],
    focus: "臀部と大腿四頭筋",
  },
};

/** Movement pattern of an exercise, for menu coverage. An explicit
 *  `pattern` on the definition wins; otherwise the pattern is derived
 *  from the pain part, and an unknown part groups with itself. */
const PATTERN_BY_PART: Record<string, string> = {
  "胸上部": "push", "胸下部": "push", "肩前部": "push", "上腕三頭": "push",
  "肩後部": "pull", "上腕二頭": "pull", "背中上部": "pull", "広背筋": "pull", "脊柱起立筋": "pull", "前腕": "pull",
  "大腿四頭筋": "legs", "ハムストリング": "legs", "臀部": "legs", "内転筋": "legs", "ふくらはぎ": "legs",
  "腹筋上部": "core", "腹筋下部": "core", "腹斜筋": "core", "体幹深部": "core",
  // Pre-expansion part names, for catalogs written before the split.
  "胸": "push", "肩": "push", "上腕": "push",
  "背中": "pull",
  "脚（前）": "legs", "脚（後ろ）・お尻": "legs",
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
  // Expansion families: swap to a sibling for the same pattern/part.
  chairDip: "tricepsExtension",
  tricepsExtension: "chairDip",
  handstandPushup: "pike",
  plankUpDown: "plank",
  scapularPushup: "pushup",
  superman: "backExtension",
  backExtension: "superman",
  reverseSnowAngel: "proneT",
  proneT: "proneW",
  backWidow: "proneW",
  pronePull: "superman",
  tableRow: "proneW",
  doorRow: "tableRow",
  pistolSquat: "squat",
  legExtension: "squat",
  wallSit: "squat",
  stepUp: "reverseLunge",
  forwardLunge: "reverseLunge",
  cossackSquat: "sumoSquat",
  sumoSquat: "squat",
  nordicCurl: "gluteBridge",
  slidingLegCurl: "gluteBridge",
  hipThrust: "gluteBridge",
  sideLyingAbduction: "gluteBridge",
  calf: "soleusRaise",
  soleusRaise: "calf",
  deadBug: "birdDog",
  birdDog: "deadBug",
  hollowHold: "deadBug",
  reverseCrunch: "legRaise",
  bicycleCrunch: "crunch",
  russianTwist: "deadBug",
  vUp: "crunch",
  mountainClimber: "plank",
  plankTap: "plank",
  copenhagenPlank: "sidePlank",
  lSit: "legRaise",
  burpee: "squat",
  bearCrawl: "plank",
  inchworm: "rdl",
  skaterJump: "squat",
};

export interface RotationDef { id: string; title: string; exerciseIds: string[] }
/** Legacy rotation definitions. Menus are no longer built from
 *  rotations (the load planner selects exercises directly); these
 *  remain only so sessions recorded under the rotation system keep
 *  resolving their titles. */
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
  substitutes: Record<string, string>;
  jointToMuscleParts: Record<string, string[]>;
  muscleParts: string[];
  joints: string[];
}

export function defaultCatalog(): Catalog {
  return {
    exercises: EXERCISES,
    substitutes: SUBSTITUTES,
    jointToMuscleParts: JOINT_TO_MUSCLE_PARTS,
    muscleParts: [...MUSCLE_PARTS],
    joints: [...JOINTS],
  };
}

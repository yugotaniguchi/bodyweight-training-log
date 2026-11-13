import {
  EXERCISES, ROTATIONS, SUBSTITUTES, INTRO_SESSIONS, RED_FLAGS,
  type ExerciseDef,
} from "./exercises";

export interface Profile {
  age: number | null; sex: string; heightCm: number | null; weightKg: number | null;
  bodyFatNote: string; habitNote: string;
}
export interface PainEntry {
  date: string;
  soreness: Record<string, number>;
  jointPain: Record<string, number>;
  redFlags: string[]; // ids answered YES
}
export interface SessionExercise {
  id: number; baseId: string; name: string; muscleGroup: string; painPart: string;
  variation: string; ladderIndex: number;
  targetSets: number; targetReps: number; targetUnit: "回" | "秒";
  cue: string;
  loggedSets: number[]; rpe: number | null; completed: boolean;
  /** Per-exercise memo only. There is intentionally no session-wide memo. */
  note: string;
}
export interface Session {
  id: number; date: string; rotation: string; title: string;
  status: "planned" | "completed"; intro: boolean;
  focusNote: string; progressionNotes: string[];
  exercises: SessionExercise[]; totalVolume: number;
}
export interface Store {
  profile: Profile | null;
  pain: PainEntry[];
  sessions: Session[];
  nextSessionId: number; nextExerciseId: number;
}
export const emptyStore = (): Store => ({ profile: null, pain: [], sessions: [], nextSessionId: 1, nextExerciseId: 1 });

// ---------- pain assessment ----------
// Criteria (see README): red flags first; muscle soreness 2 = reduce, 3+ = exclude;
// joint pain stricter (2 = reduce, 3+ = exclude); full rest only when level 4+
// soreness is present in 2+ parts. The 24-hour rule is guidance text, not a gate.
export interface PartAssessment { subject: string; kind: "muscle" | "joint"; level: number; action: "train" | "reduce" | "exclude"; reasons: string[] }
export interface Assessment {
  care: boolean; careReasons: string[]; rest: boolean; restReason: string;
  parts: PartAssessment[]; excludedParts: string[]; reducedParts: string[];
}
export function assessPain(entry: PainEntry | null): Assessment {
  const parts: PartAssessment[] = [];
  if (entry) {
    for (const [subject, level] of Object.entries(entry.soreness)) {
      const reasons: string[] = [];
      let action: PartAssessment["action"] = "train";
      if (level >= 3) { action = "exclude"; reasons.push(`筋肉痛レベル${level}: その部位は除外`); }
      else if (level === 2) { action = "reduce"; reasons.push("筋肉痛レベル2: 負荷を下げて実施（進行はしない）"); }
      parts.push({ subject, kind: "muscle", level, action, reasons });
    }
    for (const [subject, level] of Object.entries(entry.jointPain)) {
      const reasons: string[] = [];
      let action: PartAssessment["action"] = "train";
      if (level >= 3) { action = "exclude"; reasons.push(`関節痛レベル${level}: その関節を使う種目は除外`); }
      else if (level === 2) { action = "reduce"; reasons.push("関節痛レベル2: 関節は筋肉より厳しめに、負荷を下げて進行しません"); }
      parts.push({ subject, kind: "joint", level, action, reasons });
    }
  }
  const careReasons = (entry?.redFlags ?? []).map(
    (id) => `警告サイン「${RED_FLAGS.find((f) => f.id === id)?.label ?? id}」: 受診目安のため開始不可`,
  );
  const strongParts = parts.filter((p) => p.kind === "muscle" && p.level >= 4);
  const rest = careReasons.length === 0 && strongParts.length >= 2;
  return {
    care: careReasons.length > 0, careReasons,
    rest, restReason: rest ? `レベル4以上の筋肉痛が${strongParts.length}部位あります` : "",
    parts,
    excludedParts: parts.filter((p) => p.action === "exclude").map((p) => p.subject),
    reducedParts: parts.filter((p) => p.action === "reduce").map((p) => p.subject),
  };
}

// ---------- next-load decision ----------
// Priority: pain criteria (applied by caller) > per-exercise memo > cannot-do
// (all sets 0) switch > RPE adjustment.
export interface NextDecision {
  baseId: string; ladderIndex: number; targetReps: number; targetSets: number;
  notes: string[]; substitutedFrom?: string;
}
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const round5 = (v: number) => Math.max(10, Math.round(v / 5) * 5);

export function isCannotDo(prev: SessionExercise): boolean {
  const allZero = prev.loggedSets.length > 0 && prev.loggedSets.every((v) => v === 0);
  const memoCannot = /できない|1回もでき|一回もでき/.test(prev.note ?? "");
  return allZero || memoCannot;
}

export function decideNext(def: ExerciseDef, prev: SessionExercise | null, intro: boolean): NextDecision {
  const notes: string[] = [];
  let ladder = intro ? Math.max(0, def.defaultLadder - 1) : def.defaultLadder;
  let targetSets = intro ? Math.max(1, def.baseSets - 1) : def.baseSets;
  let targetReps = def.baseTarget;
  let baseId = def.baseId;
  let substitutedFrom: string | undefined;

  if (!prev) {
    notes.push(intro ? "初回（導入期：易しい形・セット減）" : "初回");
    return { baseId, ladderIndex: ladder, targetReps, targetSets, notes };
  }

  ladder = prev.ladderIndex;
  targetSets = prev.targetSets;
  targetReps = prev.targetReps;
  const loggedTotal = prev.loggedSets.reduce((a, b) => a + b, 0);
  const goalTotal = prev.targetReps * prev.targetSets;
  const achievement = goalTotal > 0 ? loggedTotal / goalTotal : 0;
  const memo = (prev.note ?? "").trim();

  // 1) cannot-do switch (memo is per-exercise, so it can only refer to this one)
  if (isCannotDo(prev)) {
    if (ladder > 0) {
      ladder -= 1;
      targetReps = def.baseTarget;
      notes.push(`できない種目の切り替え: 1段階易しい「${def.ladder[ladder]}」へ（メモ: ${memo || "記録0回"}）`);
    } else if (SUBSTITUTES[def.baseId]) {
      const sub = EXERCISES[SUBSTITUTES[def.baseId]];
      substitutedFrom = def.baseId; baseId = sub.baseId; ladder = 0;
      targetReps = sub.baseTarget; targetSets = intro ? Math.max(1, sub.baseSets - 1) : sub.baseSets;
      notes.push(`できない種目の切り替え: 最易段階のため同部位の別種目「${sub.name}（${sub.ladder[0]}）」へ`);
    } else {
      targetReps = Math.max(1, Math.floor(targetReps / 2));
      notes.push("できない種目の切り替え: 回数を半分に軽減");
    }
    return { baseId, ladderIndex: ladder, targetReps, targetSets, notes, substitutedFrom };
  }

  // 2) per-exercise memo keywords
  if (memo) {
    if (/痛|違和感/.test(memo)) {
      if (ladder > 0) ladder -= 1; else targetReps = def.unit === "秒" ? round5(targetReps * 0.8) : Math.max(1, targetReps - 3);
      notes.push(`種目メモの反映: 「${memo}」→ 負荷を下げました`);
      return { baseId, ladderIndex: ladder, targetReps, targetSets, notes };
    }
    if (/きつ|しんど|つら|限界/.test(memo)) {
      targetReps = def.unit === "秒" ? round5(targetReps * 0.9) : Math.max(1, targetReps - 2);
      notes.push(`種目メモの反映: 「${memo}」→ 進行せず軽減`);
      return { baseId, ladderIndex: ladder, targetReps, targetSets, notes };
    }
    if (/楽だった|楽に|余裕/.test(memo)) {
      targetReps = def.unit === "秒" ? round5(targetReps * 1.25) : targetReps + 3;
      notes.push(`種目メモの反映: 「${memo}」→ 多めに増加`);
      return { baseId, ladderIndex: ladder, targetReps, targetSets, notes };
    }
    if (/ちょうど/.test(memo)) {
      notes.push(`種目メモの反映: 「${memo}」→ 維持`);
      return { baseId, ladderIndex: ladder, targetReps, targetSets, notes };
    }
  }

  // 3) RPE + achievement step adjustment (at most one ladder step per session)
  const rpe = prev.rpe;
  if (rpe === null || rpe === undefined) {
    notes.push("RPE未記録のため前回と同じ負荷");
    return { baseId, ladderIndex: ladder, targetReps, targetSets, notes };
  }
  const achPct = Math.round(achievement * 100);
  if (rpe <= 6.5 && achievement >= 0.8) {
    if (achievement >= 1 && rpe <= 7 && ladder < def.ladder.length - 1) {
      ladder += 1; targetReps = def.baseTarget;
      notes.push(`RPE ${rpe}・達成率 ${achPct}%: 難易度を1段階上げて「${def.ladder[ladder]}」へ`);
    } else if (def.unit === "秒") {
      targetReps = round5(targetReps * 1.25);
      notes.push(`RPE ${rpe}・達成率 ${achPct}%: 秒数を+25%`);
    } else {
      targetReps = clamp(targetReps + 3, 1, 40);
      notes.push(`RPE ${rpe}・達成率 ${achPct}%: 回数を+3`);
    }
  } else if (rpe <= 8.5) {
    if (def.unit === "秒") { targetReps = round5(targetReps * 1.1); notes.push(`RPE ${rpe}・達成率 ${achPct}%: 秒数を+10%`); }
    else { targetReps = clamp(targetReps + 1, 1, 40); notes.push(`RPE ${rpe}・達成率 ${achPct}%: 適正域のため+1`); }
  } else if (rpe >= 9.5) {
    if (achievement < 0.6 && ladder > 0) {
      ladder -= 1; targetReps = def.baseTarget;
      notes.push(`RPE ${rpe}・達成率 ${achPct}%: 難易度を1段階下げて「${def.ladder[ladder]}」へ`);
    } else {
      targetReps = def.unit === "秒" ? round5(targetReps * 0.85) : Math.max(1, targetReps - 2);
      notes.push(`RPE ${rpe}・達成率 ${achPct}%: 負荷を下げました`);
    }
  } else { // rpe 9前後
    if (achievement >= 0.8) notes.push(`RPE ${rpe}・達成率 ${achPct}%: 維持`);
    else { targetReps = Math.max(1, targetReps - 1); notes.push(`RPE ${rpe}・達成率 ${achPct}%: -1回`); }
  }
  return { baseId, ladderIndex: ladder, targetReps, targetSets, notes };
}

// ---------- session generation ----------
export function generateSession(store: Store, date: string, assessment: Assessment): Session {
  const completedCount = store.sessions.filter((s) => s.status === "completed").length;
  const intro = completedCount < INTRO_SESSIONS;
  const rotation = ROTATIONS[store.sessions.length % ROTATIONS.length];
  const notes: string[] = [];
  const exercises: SessionExercise[] = [];

  for (const baseId of rotation.exerciseIds) {
    const def = EXERCISES[baseId];
    // last completed record of this exercise (or of a substitute source)
    const prev = [...store.sessions].reverse()
      .flatMap((s) => s.exercises.map((e) => ({ s, e })))
      .find(({ s, e }) => s.status === "completed" && e.baseId === baseId)?.e ?? null;

    const decision = decideNext(def, prev, intro && !prev);
    const finalDef = EXERCISES[decision.baseId];
    const hits = (list: string[]) =>
      list.includes(finalDef.painPart) || finalDef.jointParts.some((j) => list.includes(j));
    if (hits(assessment.excludedParts)) {
      notes.push(`痛み基準で除外: ${finalDef.name}（${finalDef.painPart}）`);
      continue;
    }
    let { targetReps, targetSets } = decision;
    if (hits(assessment.reducedParts)) {
      targetReps = finalDef.unit === "秒" ? round5(targetReps * 0.8) : Math.max(1, Math.floor(targetReps * 0.8));
      notes.push(`痛み基準で軽減: ${finalDef.name}（${finalDef.painPart}）`);
    }
    notes.push(...decision.notes.map((n) => `${finalDef.name}: ${n}`));
    exercises.push({
      id: store.nextExerciseId++, baseId: finalDef.baseId, name: finalDef.name,
      muscleGroup: finalDef.muscleGroup, painPart: finalDef.painPart,
      variation: finalDef.ladder[decision.ladderIndex], ladderIndex: decision.ladderIndex,
      targetSets, targetReps, targetUnit: finalDef.unit, cue: finalDef.cue,
      loggedSets: Array(targetSets).fill(0), rpe: null, completed: false, note: "",
    });
  }
  const excludedAny = notes.some((n) => n.startsWith("痛み基準で除外"));
  return {
    id: store.nextSessionId++, date, rotation: rotation.id,
    title: rotation.title + (excludedAny ? "（代替）" : ""),
    status: "planned", intro,
    focusNote: excludedAny ? "痛みの基準で一部の部位を外した代替メニュー" : "",
    progressionNotes: notes, exercises, totalVolume: 0,
  };
}

export function sessionTotal(s: Session): number {
  return s.exercises.reduce((sum, e) => sum + e.loggedSets.reduce((a, b) => a + b, 0), 0);
}

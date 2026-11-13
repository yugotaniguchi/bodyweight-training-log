import {
  EXERCISES, ROTATIONS, SUBSTITUTES, INTRO_SESSIONS, RED_FLAGS, JOINT_TO_MUSCLE_PARTS,
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
// joint pain stricter (2 = reduce, 3+ = exclude) and also applies through the
// explicit JOINT_TO_MUSCLE_PARTS mapping; full rest only when level 4+ soreness
// is present in 2+ parts. The 24-hour rule (below) is auto-judged from the pain
// history: it reduces the next session, it never blocks a start. Only red
// flags block.
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

// ---------- date helpers (all dates are YYYY-MM-DD, Asia/Tokyo) ----------
const DAY_MS = 86_400_000;
const parseDay = (d: string) => Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)));
const fmtDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);
export const addDays = (d: string, n: number) => fmtDay(parseDay(d) + n * DAY_MS);
export const diffDays = (from: string, to: string) => Math.round((parseDay(to) - parseDay(from)) / DAY_MS);

// ---------- 24-hour rule (auto-judged from pain history) ----------
// If, on the day after the last completed session, the pain level of a part
// that session used is still above its pre-session level (the most recent
// record before the session day), that part was overloaded: the next session
// reduces it and does not progress it.
export interface OverloadInfo {
  subject: string; kind: "muscle" | "joint";
  sessionDate: string; baseline: number; nextLevel: number; reason: string;
}
export function detectOverload(store: Store): OverloadInfo[] {
  const completed = store.sessions.filter((s) => s.status === "completed").sort((a, b) => a.date.localeCompare(b.date));
  const last = completed[completed.length - 1];
  if (!last) return [];
  const used = last.exercises.filter((e) => e.completed || e.loggedSets.some((v) => v > 0));
  const usedExercises = used.length ? used : last.exercises;
  if (!usedExercises.length) return [];
  const entries = [...store.pain].sort((a, b) => a.date.localeCompare(b.date));
  const pre = [...entries].reverse().find((p) => p.date < last.date) ?? null;
  const next = entries.find((p) => p.date === addDays(last.date, 1)) ?? entries.find((p) => p.date > last.date) ?? null;
  if (!next) return [];
  const out: OverloadInfo[] = [];
  const check = (subject: string, kind: "muscle" | "joint", get: (e: PainEntry) => number) => {
    const baseline = pre ? get(pre) : 0;
    const nextLevel = get(next);
    if (nextLevel > baseline) {
      out.push({
        subject, kind, sessionDate: last.date, baseline, nextLevel,
        reason: `24時間ルール: ${subject}の痛みが前回セッションの翌日に${baseline}→${nextLevel}へ戻っていないため過負荷と判定し、次回は軽減・進行なし`,
      });
    }
  };
  for (const part of new Set(usedExercises.map((e) => e.painPart))) {
    check(part, "muscle", (e) => e.soreness[part] ?? 0);
  }
  const defOf = (e: SessionExercise) => EXERCISES[e.baseId];
  for (const joint of new Set(usedExercises.flatMap((e) => defOf(e)?.jointParts ?? []))) {
    check(joint, "joint", (e) => e.jointPain[joint] ?? 0);
  }
  return out;
}

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
export function painDurationGuidance(store: Store): PainGuidance[] {
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
  const muscleParts = new Set(entries.flatMap((e) => Object.keys(e.soreness)));
  for (const part of muscleParts) {
    const days = streak((e) => e.soreness[part] ?? 0);
    if (days >= 5) out.push({ subject: part, kind: "muscle", days, severity: "care", message: `筋肉痛（${part}）が${days}日続いています。5日以上改善しない場合は受診が目安です` });
  }
  const joints = new Set(entries.flatMap((e) => Object.keys(e.jointPain)));
  for (const joint of joints) {
    const days = streak((e) => e.jointPain[joint] ?? 0);
    if (days >= 14) out.push({ subject: joint, kind: "joint", days, severity: "care", message: `関節痛（${joint}）が${days}日続いています。2週間改善しない場合は受診が目安です` });
    else if (days >= 7) out.push({ subject: joint, kind: "joint", days, severity: "caution", message: `関節痛（${joint}）が${days}日続いています。1週間を超えたので注意してください（2週間改善しなければ受診目安）` });
  }
  return out;
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

  // Pain application sets. A joint problem reaches an exercise two ways:
  // directly (the exercise loads that joint) and through the explicit
  // JOINT_TO_MUSCLE_PARTS mapping (the exercise trains a mapped muscle part).
  const painSet = (action: "exclude" | "reduce", kind: "muscle" | "joint") =>
    new Set(assessment.parts.filter((p) => p.action === action && p.kind === kind).map((p) => p.subject));
  const excludedMuscles = painSet("exclude", "muscle"), reducedMuscles = painSet("reduce", "muscle");
  const excludedJoints = painSet("exclude", "joint"), reducedJoints = painSet("reduce", "joint");
  const viaMap = (joints: Set<string>, part: string) =>
    [...joints].filter((j) => (JOINT_TO_MUSCLE_PARTS[j] ?? []).includes(part));
  const overload = detectOverload(store);
  const overloadMuscles = new Set(overload.filter((o) => o.kind === "muscle").map((o) => o.subject));
  const overloadJoints = new Set(overload.filter((o) => o.kind === "joint").map((o) => o.subject));

  for (const baseId of rotation.exerciseIds) {
    const def = EXERCISES[baseId];
    // last completed record of this exercise (or of a substitute source)
    const prev = [...store.sessions].reverse()
      .flatMap((s) => s.exercises.map((e) => ({ s, e })))
      .find(({ s, e }) => s.status === "completed" && e.baseId === baseId)?.e ?? null;

    const decision = decideNext(def, prev, intro && !prev);
    const finalDef = EXERCISES[decision.baseId];
    const jointDirect = (set: Set<string>) => finalDef.jointParts.filter((j) => set.has(j));
    const excludeWhy: string[] = [];
    if (excludedMuscles.has(finalDef.painPart)) excludeWhy.push(finalDef.painPart);
    for (const j of jointDirect(excludedJoints)) excludeWhy.push(`関節痛: ${j}`);
    for (const j of viaMap(excludedJoints, finalDef.painPart)) excludeWhy.push(`関節→部位マッピング: ${j}→${finalDef.painPart}`);
    if (excludeWhy.length) {
      notes.push(`痛み基準で除外: ${finalDef.name}（${[...new Set(excludeWhy)].join(" / ")}）`);
      continue;
    }
    let { targetReps, targetSets } = decision;
    const reduceWhy: string[] = [];
    if (reducedMuscles.has(finalDef.painPart)) reduceWhy.push(finalDef.painPart);
    for (const j of jointDirect(reducedJoints)) reduceWhy.push(`関節痛: ${j}`);
    for (const j of viaMap(reducedJoints, finalDef.painPart)) reduceWhy.push(`関節→部位マッピング: ${j}→${finalDef.painPart}`);
    const reduce = (why: string) => {
      targetReps = finalDef.unit === "秒" ? round5(targetReps * 0.8) : Math.max(1, Math.floor(targetReps * 0.8));
      notes.push(why);
    };
    let reducedByPain = false;
    if (reduceWhy.length) {
      reduce(`痛み基準で軽減: ${finalDef.name}（${[...new Set(reduceWhy)].join(" / ")}）`);
      reducedByPain = true;
    }
    // 24-hour rule: an overloaded part is reduced and not progressed. If the
    // pain criteria already reduced it, say so without reducing twice.
    const overloadHit = overloadMuscles.has(finalDef.painPart)
      ? overload.find((o) => o.kind === "muscle" && o.subject === finalDef.painPart)
      : overload.find((o) => o.kind === "joint" && finalDef.jointParts.includes(o.subject));
    if (overloadHit) {
      if (reducedByPain) notes.push(`24時間ルール: ${finalDef.name}（${overloadHit.reason}）`);
      else reduce(`24時間ルールで軽減: ${finalDef.name}（${overloadHit.reason}）`);
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
    focusNote: excludedAny ? "痛みの基準で一部の部位を外した代替ワークアウト" : "",
    progressionNotes: notes, exercises, totalVolume: 0,
  };
}

export function sessionTotal(s: Session): number {
  return s.exercises.reduce((sum, e) => sum + e.loggedSets.reduce((a, b) => a + b, 0), 0);
}

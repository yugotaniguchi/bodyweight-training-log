// Leading-zero safe numeric input: keep the raw digit string, strip leading
// zeros for display ("0" itself stays "0"), so typing 1 never shows "01".
function sanitizeDigits(v) {
  const d = String(v).replace(/\D/g, "");
  if (d === "") return "";
  return d.replace(/^0+(?=\d)/, "");
}
let state = null;
let view = "pain";
let resetArm = false; // settings: two-step delete confirmation state
let menuCancelArm = false; // menu: two-step "cancel this menu" confirmation state
const editingHist = new Set(); // session ids whose history entry is in edit mode
const painDraft = { soreness: {}, jointPain: {}, redFlags: [] };
// Pain save state: painGen increments on every pain edit, painSavedGen is
// the generation last saved. Equal => the CTA reads ワークアウトを開始.
let painGen = 0;
let painSavedGen = -1;
const painIsSaved = () => painSavedGen === painGen;

const $app = document.getElementById("app");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
async function api(path, body) {
  const res = await fetch(path, body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {});
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  if (data.today) state = data;
  return data;
}
async function load() { state = await (await fetch("/api/state")).json(); if (state.pain) painSavedGen = painGen; render(); }
document.getElementById("tabs").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-view]"); if (!b) return;
  view = b.dataset.view; menuCancelArm = false; render();
});
document.getElementById("gear").addEventListener("click", () => { view = "settings"; menuCancelArm = false; render(); });

const LEVEL_WORDS = ["なし", "軽い", "普通", "強い", "かなり強い", "激しい"];
function tapGrid(kind, parts, current) {
  return `<div class="tapgrid">${parts.map((p) => {
    const lv = current[p] || 0;
    const ticks = Array.from({ length: 5 }, (_, i) => `<i class="${i < lv ? "on" : ""}"></i>`).join("");
    return `<button class="tap lv${lv}" data-tap="${kind}:${esc(p)}">
      <span class="tap-row"><span class="tap-name">${esc(p)}</span><b class="num tap-num">${lv}</b></span>
      <span class="tap-row"><span class="tap-word">${LEVEL_WORDS[lv]}</span><span class="ticks">${ticks}</span></span>
    </button>`;
  }).join("")}</div>`;
}

// ---------- dates ----------
// Dates are YYYY-MM-DD (Asia/Tokyo). Weekday math is done on UTC day numbers
// so the browser's own timezone cannot shift the day.
const DAY_MS = 86400000;
const dayNum = (d) => { const [y, m, dd] = d.split("-").map(Number); return Date.UTC(y, m - 1, dd) / DAY_MS; };
// ---------- app header (date + purpose / Day + cumulative reps) ----------
function updateHeader() {
  const dateEl = document.getElementById("ah-date");
  if (!dateEl || !state) return;
  const n = dayNum(state.today);
  const dt = new Date(n * DAY_MS);
  const dowLabel = ["日", "月", "火", "水", "木", "金", "土"][(n + 4) % 7]; // 0=Sunday
  dateEl.textContent = `${dt.getUTCMonth() + 1}/${dt.getUTCDate()}（${dowLabel}）`;
  const dates = state.sessions.map((s) => s.date).sort();
  const dayCount = dates.length ? Math.round(n - dayNum(dates[0])) + 1 : 1;
  document.getElementById("ah-day").textContent = dayCount;
  // Cumulative reps = total logged volume across all recorded sessions.
  document.getElementById("ah-reps").textContent = state.stats.totalVolume;
}

// ---------- week dots (menu screen) ----------
// One row for the current week (Mon–Sun, Asia/Tokyo dates from the state):
// weekday letter over a dot. A day with a completed session gets a filled
// teal dot; today gets a teal bold letter and an outline ring. No day
// numbers — this is a dot row, not the week boxes removed earlier.
function weekDots() {
  const n = dayNum(state.today);
  const monday = n - (((n + 4) % 7 + 6) % 7); // (n+4)%7: 0=Sunday
  const completedDates = new Set(state.sessions.filter((s) => s.status === "completed").map((s) => s.date));
  const labels = ["月", "火", "水", "木", "金", "土", "日"];
  const cells = labels.map((lab, i) => {
    const dn = monday + i;
    const dt = new Date(dn * DAY_MS);
    const ds = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
    const isToday = dn === n;
    const done = completedDates.has(ds);
    return `<div class="wdot${isToday ? " today" : ""}"><div class="wdot-label">${lab}</div><div class="wdot-dot${done ? " done" : ""}"></div></div>`;
  }).join("");
  return `<div class="weekdots">${cells}</div>`;
}

// ---------- ring gauge + metrics (menu screen) ----------
// Thick ring, track in --border (#2d2d2d measured), arc in the accent.
// Centre: the completed-exercise count as a big numeral, under it
// "／ total 種目完了" in small gray.
function ringGauge(s) {
  const total = s.exercises.length;
  const done = s.exercises.filter((e) => e.completed).length;
  const R = 62, C = 2 * Math.PI * R;
  const off = total ? C * (1 - done / total) : C;
  return `<div class="gauge2">
    <svg width="150" height="150" viewBox="0 0 150 150"><circle class="g-bg" cx="75" cy="75" r="${R}" fill="none" stroke-width="13"/><circle class="g-fg" cx="75" cy="75" r="${R}" fill="none" stroke-width="13" stroke-linecap="round" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"/></svg>
    <div class="gauge2-center"><div class="num gauge2-num">${done}</div><div class="gauge2-sub">／ ${total} 種目完了</div></div></div>`;
}
// Three metrics divided by hairlines: exercise count / completed sets over
// total sets / cumulative completed sessions.
function menuMetrics(s) {
  const totalSets = s.exercises.reduce((a, e) => a + e.targetSets, 0);
  const doneSets = s.exercises.reduce((a, e) => a + (e.completed ? e.targetSets : e.loggedSets.filter((v) => v > 0).length), 0);
  return `<div class="menu-metrics">
    <div class="mmetric"><div class="m-num num">${s.exercises.length}</div><div class="m-label">種目</div></div>
    <div class="mmetric"><div class="m-num num">${doneSets}/${totalSets}</div><div class="m-label">セット</div></div>
    <div class="mmetric"><div class="m-num num">${state.stats.totalCompleted}</div><div class="m-label">累計回</div></div>
  </div>`;
}

// ---------- countdown timer for timed exercises ----------
// The timer never writes to the record; the set inputs stay manual.
const timers = {}; // exerciseId -> { total, remaining, running, intId, endAt, done }
function ensureTimer(ex) {
  if (!timers[ex.id]) timers[ex.id] = { total: ex.targetReps, remaining: ex.targetReps, running: false, intId: null, endAt: 0, done: false };
  return timers[ex.id];
}
function beep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    beep.ctx = beep.ctx || new Ctx();
    const ctx = beep.ctx, t0 = ctx.currentTime;
    [0, 0.28].forEach((off) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.12, t0 + off); g.gain.exponentialRampToValueAtTime(0.001, t0 + off + 0.22);
      o.start(t0 + off); o.stop(t0 + off + 0.24);
    });
  } catch { /* audio unavailable: the teal "done" state still shows */ }
}
function updateTimerUI(id) {
  const t = timers[id]; if (!t) return;
  const disp = document.getElementById(`tdisp-${id}`);
  const bar = document.getElementById(`tbar-${id}`);
  const box = document.getElementById(`timer-${id}`);
  if (disp) disp.textContent = t.remaining;
  if (bar) bar.style.width = `${t.total > 0 ? (t.remaining / t.total) * 100 : 0}%`;
  if (box) box.classList.toggle("done", !!t.done);
}
function stopTick(t) { if (t.intId) clearInterval(t.intId); t.intId = null; t.running = false; }
function startTimer(ex) {
  const t = ensureTimer(ex);
  if (t.done || t.remaining <= 0) { t.remaining = t.total; t.done = false; }
  t.endAt = Date.now() + t.remaining * 1000; t.running = true;
  if (t.intId) clearInterval(t.intId);
  t.intId = setInterval(() => {
    t.remaining = Math.max(0, Math.ceil((t.endAt - Date.now()) / 1000));
    if (t.remaining <= 0) { stopTick(t); t.done = true; beep(); }
    updateTimerUI(ex.id);
  }, 200);
  updateTimerUI(ex.id);
}
function pauseTimer(ex) {
  const t = ensureTimer(ex);
  if (t.running) t.remaining = Math.max(0, Math.ceil((t.endAt - Date.now()) / 1000));
  stopTick(t); updateTimerUI(ex.id);
}
function resetTimer(ex) {
  const t = ensureTimer(ex);
  stopTick(t); t.remaining = t.total; t.done = false; updateTimerUI(ex.id);
}
function timerHtml(ex) {
  const t = timers[ex.id];
  const total = t ? t.total : ex.targetReps;
  const rem = t ? t.remaining : ex.targetReps;
  const pct = total > 0 ? (rem / total) * 100 : 0;
  return `<div class="timer${t && t.done ? " done" : ""}" id="timer-${ex.id}">
    <div class="timer-display"><span class="num" id="tdisp-${ex.id}">${rem}</span><small> 秒</small></div>
    <div class="timer-bar"><div class="timer-fill" id="tbar-${ex.id}" style="width:${pct}%"></div></div>
    <div class="timer-btns"><button class="btn" data-timer-start="${ex.id}">開始</button><button class="btn" data-timer-pause="${ex.id}">一時停止</button><button class="btn" data-timer-reset="${ex.id}">リセット</button></div>
  </div>`;
}
function renderPain() {
  const pain = state.pain;
  const src = pain ?? painDraft;
  const soreness = { ...painDraft.soreness, ...(pain?.soreness ?? {}) };
  const jointPain = { ...painDraft.jointPain, ...(pain?.jointPain ?? {}) };
  const flags = pain?.redFlags ?? painDraft.redFlags;
  const a = state.assessment;
  const completedToday = state.todaySession?.status === "completed";
  const painCta = completedToday ? "今日の結果を見る" : painIsSaved() ? "ワークアウトを開始" : "痛みの記録を保存";
  return `
  ${!state.profile ? `<div class="warn">先に右上の歯車ボタンからプロフィールを入力してください（空でも記録はできます）。</div>` : ""}
  <h2>まず、警告サインの確認</h2>
  <p class="desc">当てはまるものがあれば押してください。1つでも当てはまれば、その日は中止・受診が目安です。</p>
  <div class="chips">${state.catalog.redFlags.map((f) => `<button type="button" class="chip${flags.includes(f.id) ? " on" : ""}" data-flagchip="${f.id}">${esc(f.label)}</button>`).join("")}</div>
  <h2>今日の筋肉痛は？（部位ごと）</h2>
  <p class="desc">タップで強度が上がります（5の次は0に戻ります）。</p>
  <div class="badges"><span class="badge">0–1 通常</span><span class="badge">2 軽減</span><span class="badge">3以上 除外</span><span class="badge">4以上 ×2部位 休養</span></div>
  ${tapGrid("soreness", state.catalog.muscleParts, soreness)}
  <h2>今日の関節痛は？（関節ごと）</h2>
  <p class="desc">筋肉痛とは別に記録します。タップで強度が上がります（5の次は0に戻ります）。関節は筋肉より厳しめの基準です。</p>
  <div class="badges"><span class="badge">0–1 通常</span><span class="badge">2 軽減</span><span class="badge">3以上 除外</span><span class="badge">サインあり 受診目安</span></div>
  ${tapGrid("jointPain", state.catalog.joints, jointPain)}
  <button class="cta" id="savePain">${painCta}</button>
  ${a ? (a.care ? `<div class="warn">受診目安：${a.careReasons.join(" / ")}</div>`
      : a.rest ? `<div class="warn">完全休養日：${esc(a.restReason)}</div>`
      : `<div class="ok">開始できます。${a.parts.flatMap((p) => p.reasons).join(" / ")}</div>`) : ""}
  ${(state.guidance ?? []).map((g) => `<div class="caution">${esc(g.message)}</div>`).join("")}
  ${(state.overload ?? []).length ? `<div class="caution">24時間ルールの自動判定（次回に反映）<ul>${state.overload.map((o) => `<li>${esc(o.reason)}</li>`).join("")}</ul></div>` : ""}`;
}
function exerciseCard(s, ex, editable) {
  // Menu screen: an exercise that has not been recorded yet (nothing logged,
  // no RPE, not completed) starts with the target reps/seconds pre-filled,
  // so the user can keep them or overwrite them before saving.
  const unrecorded = editable && !ex.completed && ex.rpe == null && ex.loggedSets.every((v) => v === 0);
  const sets = ex.loggedSets.map((v, i) => {
    const shown = unrecorded ? ex.targetReps : (v === 0 ? "" : v);
    return `<input class="set-input" type="text" inputmode="numeric" autocomplete="off" data-set="${ex.id}:${i}" value="${shown}" placeholder="0">`;
  }).join(" ");
  return `<div class="card"><h3>${esc(ex.name)}（${esc(ex.variation)}）</h3>
    <p class="small">${esc(ex.muscleGroup)} ／ 目標 ${ex.targetReps}${ex.targetUnit} × ${ex.targetSets}セット<br>${esc(ex.cue)}</p>
    <div>実施：${sets}</div>
    <label class="row">RPE（1〜10、あと何回できたか） <input class="rpe-input" type="text" inputmode="decimal" data-rpe="${ex.id}" value="${ex.rpe ?? ""}"></label>
    <label class="row"><input type="checkbox" data-done="${ex.id}" ${ex.completed ? "checked" : ""}> 完了</label>
    <input class="note-input" type="text" data-note="${ex.id}" placeholder="この種目のメモ（例：きつかった／できない／楽だった）" value="${esc(ex.note)}">
    ${editable && ex.targetUnit === "秒" ? timerHtml(ex) : ""}
    ${editable ? `<p><button class="btn" data-save-ex="${s.id}:${ex.id}">記録する</button></p>` : ""}
  </div>`;
}
function collectExercise(root, ex) {
  const loggedSets = ex.loggedSets.map((_, i) => {
    const el = root.querySelector(`[data-set="${ex.id}:${i}"]`);
    return el ? Number(sanitizeDigits(el.value) || 0) : ex.loggedSets[i];
  });
  const rpeEl = root.querySelector(`[data-rpe="${ex.id}"]`);
  const doneEl = root.querySelector(`[data-done="${ex.id}"]`);
  const noteEl = root.querySelector(`[data-note="${ex.id}"]`);
  return { loggedSets, rpe: rpeEl && rpeEl.value !== "" ? Number(rpeEl.value) : null, completed: doneEl ? doneEl.checked : ex.completed, note: noteEl ? noteEl.value : ex.note };
}
// Menu-screen exercise card, laid out like the original space: muscle
// group small at the top-left, the variation as the big heading, target
// line and form cue in gray, the total target at the top-right. Set inputs
// are black boxes in an even row; RPE is a black select; the per-exercise
// note sits over a full-width teal record button.
const RPE_OPTIONS = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];
function menuExerciseCard(s, ex) {
  const recorded = ex.completed || ex.rpe != null || ex.loggedSets.some((v) => v !== 0);
  const sets = ex.loggedSets.map((v, i) => {
    const shown = recorded ? (v === 0 ? "" : v) : ex.targetReps;
    return `<div class="set-cell"><div class="set-label">${i + 1}セット目</div><input class="set-input" type="text" inputmode="numeric" autocomplete="off" data-set="${ex.id}:${i}" value="${shown}" placeholder="0"></div>`;
  }).join("");
  const rpeValues = ex.rpe != null && !RPE_OPTIONS.includes(ex.rpe) ? [...RPE_OPTIONS, ex.rpe].sort((a, b) => a - b) : RPE_OPTIONS;
  const rpeOptions = [`<option value=""${ex.rpe == null ? " selected" : ""}>未入力</option>`]
    .concat(rpeValues.map((v) => `<option value="${v}"${ex.rpe === v ? " selected" : ""}>${v === 6 ? "6 以下" : v}</option>`)).join("");
  const totalTarget = ex.targetReps * ex.targetSets;
  return `<div class="card ex-card">
    <div class="ex-head"><div class="ex-head-left">
      <div class="ex-part">${esc(ex.muscleGroup)}</div>
      <h3 class="ex-title">${esc(ex.variation || ex.name)}</h3>
      <div class="ex-target-line">目標 ${ex.targetSets}セット × ${ex.targetReps}${ex.targetUnit}</div>
      <p class="ex-cue">${esc(ex.cue)}</p>
    </div>
    <div class="ex-total"><div class="num">${totalTarget}</div><div class="ex-total-label">合計${ex.targetUnit}</div></div></div>
    <div class="set-grid">${sets}</div>
    <hr class="ex-divider">
    <div class="rpe-row"><label for="rpe-${ex.id}">きつさ RPE</label><select class="rpe-select" id="rpe-${ex.id}" data-rpe="${ex.id}">${rpeOptions}</select></div>
    <label class="note-label" for="note-${ex.id}">この種目のメモ（任意）</label>
    <input class="note-input" id="note-${ex.id}" type="text" data-note="${ex.id}" placeholder="例：膝立ちが限界だった" value="${esc(ex.note)}">
    <div class="note-hint">次回、この種目にだけ反映されます。</div>
    ${ex.targetUnit === "秒" ? timerHtml(ex) : ""}
    <button class="cta ex-save" data-save-ex="${s.id}:${ex.id}">${recorded ? "記録を更新" : "記録して完了"}</button>
  </div>`;
}
function renderMenu() {
  const s = state.todaySession;
  if (!s) return `<p>今日のセッションはまだありません。</p><button class="cta" id="gen">今日のワークアウトを作る</button><p id="genErr" class="error"></p>`;
  const remaining = s.exercises.filter((e) => !e.completed).length;
  return `${weekDots()}
  ${ringGauge(s)}
  <div class="menu-title"><h2 class="menu-session-title">${esc(s.rotation)} ${esc(s.title)}</h2>
  <div class="menu-remain">${remaining > 0 ? `あと${remaining}種目` : "全種目完了"}</div>
  ${s.focusNote ? `<div class="menu-focus">${esc(s.focusNote)}</div>` : ""}</div>
  ${s.progressionNotes.length ? `<div class="adj-notes"><ul>${s.progressionNotes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul></div>` : ""}
  ${menuMetrics(s)}
  ${s.exercises.map((ex) => menuExerciseCard(s, ex)).join("")}
  ${s.status !== "completed" ? `<div class="card finish-card"><button class="cta" id="complete">今日のトレーニングを完了する</button>
    ${menuCancelArm ? `<div class="cancel-confirm"><p>このワークアウトを取り消しますか？今日のセッションと入力した内容が消えます。</p><div class="cancel-btns"><button class="btn danger-solid" id="cancelExec">取り消す</button><button class="btn" id="cancelBack">やめる</button></div></div>`
      : `<button class="cancel-link" id="cancelMenu">このワークアウトを取り消す</button>`}</div>`
    : `<div class="ok">完了済みです。これまでの記録で確認できます。</div>`}`;
}
// RPE number -> the word the original space shows next to it.
function rpeWord(rpe) {
  if (rpe == null) return "";
  if (rpe >= 10) return "限界";
  if (rpe >= 9.5) return "ほぼ限界";
  if (rpe >= 9) return "とてもきつい";
  if (rpe >= 8.5) return "かなりきつい";
  if (rpe >= 8) return "きつい";
  if (rpe >= 7.5) return "少しきつい";
  if (rpe >= 7) return "やや楽";
  if (rpe >= 6.5) return "楽";
  if (rpe >= 6) return "かなり楽";
  return "とても楽";
}
const DOW_LABELS = ["日", "月", "火", "水", "木", "金", "土"];
// The old Result view is merged into History: one list, newest first, in
// the original's layout — big day number + month/weekday on the left,
// rotation and exercise rows in the middle, session total on the right.
function renderHistory() {
  if (!state.sessions.length) return `<h2>これまでの記録</h2><p>記録はまだありません。</p>`;
  const entries = state.sessions.map((s) => {
    const n = dayNum(s.date);
    const dow = DOW_LABELS[(n + 4) % 7];
    const editing = editingHist.has(s.id);
    const body = editing
      ? `${s.exercises.map((ex) => exerciseCard(s, ex, false)).join("")}<button class="edit-btn" data-save-history="${s.id}">修正を保存</button>`
      : `${s.exercises.map((ex) => {
          const rpe = ex.rpe != null ? `（RPE ${ex.rpe} ${rpeWord(ex.rpe)}）` : "";
          return `<div class="ex-row"><div class="ex-name">${esc(ex.name)}<span class="ex-sub">（${esc(ex.variation)}）${rpe}</span></div><div class="ex-sets">${ex.loggedSets.join(" / ")} ${ex.targetUnit}</div></div>${ex.note ? `<div class="ex-memo">種目メモ： ${esc(ex.note)}</div>` : ""}`;
        }).join("")}<button class="edit-btn" data-edit-history="${s.id}">記録を編集</button>`;
    return `<div class="hist"><div class="hist-head">
      <div class="hist-date num">${s.date.slice(5, 7)}/${s.date.slice(8, 10)}(${dow})</div>
      <div class="hist-main"><div class="hist-rot">${esc(s.rotation)} ${esc(s.title)}</div>
      ${s.focusNote ? `<div class="hist-note">${esc(s.focusNote)}</div>` : ""}
      ${body}</div>
      <div class="hist-total"><span class="num">${s.totalVolume}</span>レップ</div>
    </div></div>`;
  }).join("");
  return `<h2>これまでの記録</h2>${entries}`;
}
function renderSettings() {
  const p = state.profile ?? { age: "", sex: "", heightCm: "", weightKg: "", bodyFatNote: "", habitNote: "" };
  return `<button class="back-btn" id="backHome">← ホームに戻る</button>
  <h2>プロフィール（初回設定）</h2>
  <div class="form-grid">
    <div class="field"><label for="pf-age">年齢</label><input type="text" inputmode="numeric" id="pf-age" value="${p.age ?? ""}"></div>
    <div class="field"><label for="pf-sex">性別</label><input type="text" id="pf-sex" value="${esc(p.sex)}"></div>
    <div class="field"><label for="pf-height">身長（cm）</label><input type="text" inputmode="decimal" id="pf-height" value="${p.heightCm ?? ""}"></div>
    <div class="field"><label for="pf-weight">体重（kg）</label><input type="text" inputmode="decimal" id="pf-weight" value="${p.weightKg ?? ""}"></div>
    <div class="field wide"><label for="pf-fat">体脂肪などの補足</label><textarea id="pf-fat" rows="2">${esc(p.bodyFatNote)}</textarea></div>
    <div class="field wide"><label for="pf-habit">運動習慣の補足</label><textarea id="pf-habit" rows="2">${esc(p.habitNote)}</textarea></div>
  </div>
  <p><button class="btn" id="saveProfile">保存</button></p>
  <h2>データ</h2><p class="small">保存先はサーバー側の data/store.json です。</p>
  <button class="btn danger" id="reset">データを消す</button>
  ${resetArm ? `<div class="reset-confirm"><p>本当に全データを消しますか？プロフィール・痛みの記録・セッション履歴がすべて消え、元に戻せません。</p><button class="btn danger-solid" id="resetConfirm">本当に全データを消す</button><button class="btn" id="resetCancel">キャンセル</button></div>` : ""}`;
}
function render() {
  document.querySelectorAll("#tabs button").forEach((b) => b.classList.toggle("active", b.dataset.view === view));
  // The gear is shown only on the home (pain) screen and on Settings.
  document.getElementById("gear").style.display = view === "pain" || view === "settings" ? "" : "none";
  $app.innerHTML = view === "pain" ? renderPain() : view === "menu" ? renderMenu() : view === "history" ? renderHistory() : renderSettings();
  updateHeader();
  bind();
}
function bind() {
  $app.querySelectorAll("[data-tap]").forEach((el) => el.addEventListener("click", () => {
    painGen++;
    const [kind, part] = el.dataset.tap.split(":");
    const cur = { ...(state.pain?.[kind] ?? {}), ...painDraft[kind] };
    painDraft[kind] = { ...cur, [part]: ((cur[part] || 0) + 1) % 6 };
    // draft is merged over saved values at save/render time; re-render from a merged pain view
    state = { ...state, pain: { date: state.today, soreness: { ...(state.pain?.soreness ?? {}), ...painDraft.soreness }, jointPain: { ...(state.pain?.jointPain ?? {}), ...painDraft.jointPain }, redFlags: state.pain?.redFlags ?? painDraft.redFlags } };
    render();
  }));
  $app.querySelectorAll("[data-flagchip]").forEach((el) => el.addEventListener("click", () => {
    painGen++;
    const flags = new Set(state.pain?.redFlags ?? painDraft.redFlags);
    flags.has(el.dataset.flagchip) ? flags.delete(el.dataset.flagchip) : flags.add(el.dataset.flagchip);
    painDraft.redFlags = [...flags];
    state = { ...state, pain: { ...(state.pain ?? { date: state.today, soreness: {}, jointPain: {} }), redFlags: painDraft.redFlags } };
    render();
  }));
  $app.querySelectorAll(".set-input").forEach((el) => el.addEventListener("input", () => { el.value = sanitizeDigits(el.value); }));
  const savePain = document.getElementById("savePain");
  if (savePain) savePain.addEventListener("click", async () => {
    if (state.todaySession?.status === "completed") { // 「今日の結果を見る」: save any edits first, then go
      if (!painIsSaved()) {
        await api("/api/pain", { soreness: state.pain?.soreness ?? painDraft.soreness, jointPain: state.pain?.jointPain ?? painDraft.jointPain, redFlags: state.pain?.redFlags ?? painDraft.redFlags });
        painSavedGen = painGen;
        Object.keys(painDraft.soreness).length = 0;
      }
      view = "history"; render(); return;
    }
    if (painIsSaved()) { view = "menu"; render(); return; } // 「ワークアウトを開始」
    await api("/api/pain", { soreness: state.pain?.soreness ?? painDraft.soreness, jointPain: state.pain?.jointPain ?? painDraft.jointPain, redFlags: state.pain?.redFlags ?? painDraft.redFlags });
    painSavedGen = painGen;
    Object.keys(painDraft.soreness).length = 0;
    render(); // the CTA now reads ワークアウトを開始
  });
  const backHome = document.getElementById("backHome");
  if (backHome) backHome.addEventListener("click", () => { view = "pain"; render(); });
  const gen = document.getElementById("gen");
  if (gen) gen.addEventListener("click", async () => {
    try { await api("/api/session/generate", {}); view = "menu"; render(); }
    catch (e) { document.getElementById("genErr").textContent = e.message; }
  });
  $app.querySelectorAll("[data-save-ex]").forEach((el) => el.addEventListener("click", async () => {
    const [sid, eid] = el.dataset.saveEx.split(":").map(Number);
    const s = state.sessions.find((x) => x.id === sid) ?? state.todaySession;
    const ex = s.exercises.find((x) => x.id === eid);
    // 「記録して完了」: saving from the menu card always marks the exercise completed.
    await api(`/api/session/${sid}/exercise/${eid}`, { ...collectExercise($app, ex), completed: true }); render();
  }));
  const findTodayEx = (id) => (state.todaySession?.exercises ?? []).find((e) => e.id === id);
  $app.querySelectorAll("[data-timer-start]").forEach((el) => el.addEventListener("click", () => { const ex = findTodayEx(Number(el.dataset.timerStart)); if (ex) startTimer(ex); }));
  $app.querySelectorAll("[data-timer-pause]").forEach((el) => el.addEventListener("click", () => { const ex = findTodayEx(Number(el.dataset.timerPause)); if (ex) pauseTimer(ex); }));
  $app.querySelectorAll("[data-timer-reset]").forEach((el) => el.addEventListener("click", () => { const ex = findTodayEx(Number(el.dataset.timerReset)); if (ex) resetTimer(ex); }));
  const complete = document.getElementById("complete");
  if (complete) complete.addEventListener("click", async () => { await api(`/api/session/${state.todaySession.id}/complete`, {}); menuCancelArm = false; view = "history"; render(); });
  const cancelMenu = document.getElementById("cancelMenu");
  if (cancelMenu) cancelMenu.addEventListener("click", () => { menuCancelArm = true; render(); });
  const cancelBack = document.getElementById("cancelBack");
  if (cancelBack) cancelBack.addEventListener("click", () => { menuCancelArm = false; render(); });
  const cancelExec = document.getElementById("cancelExec");
  if (cancelExec) cancelExec.addEventListener("click", async () => {
    await api(`/api/session/${state.todaySession.id}/delete`, {});
    menuCancelArm = false; view = "pain"; render();
  });
  $app.querySelectorAll("[data-edit-history]").forEach((el) => el.addEventListener("click", () => { editingHist.add(Number(el.dataset.editHistory)); render(); }));
  $app.querySelectorAll("[data-save-history]").forEach((el) => el.addEventListener("click", async () => {
    const s = state.sessions.find((x) => x.id === Number(el.dataset.saveHistory));
    const exercises = s.exercises.map((ex) => ({ exerciseId: ex.id, ...collectExercise($app, ex) }));
    await api(`/api/session/${s.id}/record`, { exercises }); editingHist.delete(s.id); render();
  }));
  const saveProfile = document.getElementById("saveProfile");
  if (saveProfile) saveProfile.addEventListener("click", async () => {
    await api("/api/profile", { age: document.getElementById("pf-age").value, sex: document.getElementById("pf-sex").value, heightCm: document.getElementById("pf-height").value, weightKg: document.getElementById("pf-weight").value, bodyFatNote: document.getElementById("pf-fat").value, habitNote: document.getElementById("pf-habit").value });
    render();
  });
  const reset = document.getElementById("reset");
  if (reset) reset.addEventListener("click", () => { resetArm = true; render(); });
  const resetCancel = document.getElementById("resetCancel");
  if (resetCancel) resetCancel.addEventListener("click", () => { resetArm = false; render(); });
  const resetConfirm = document.getElementById("resetConfirm");
  if (resetConfirm) resetConfirm.addEventListener("click", async () => { await api("/api/reset", {}); resetArm = false; painGen = 0; painSavedGen = -1; view = "pain"; render(); });
}
load().catch((e) => { $app.innerHTML = `<p class="error">${esc(e.message)}</p>`; });

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
let menuGenError = ""; // last session-generation error, shown on the menu empty state
const editingHist = new Set(); // session ids whose history entry is in edit mode
const painDraft = { soreness: {}, jointPain: {}, redFlags: [] };
// Pain save state: painGen increments on every pain edit, painSavedGen is
// the generation last saved. Equal => the CTA reads ワークアウトを開始.
let painGen = 0;
let painSavedGen = -1;
const painIsSaved = () => painSavedGen === painGen;
let importArm = false; // settings: import confirmation state
let importPending = null; // parsed JSON waiting for import confirmation
let importFileName = "";
let importError = "";
let histQuery = ""; // report screen: free-word filter over exercise names / notes

// ---------- browser history + per-view scroll positions ----------
// Tab switches are real history entries (pushState / popstate), so the
// browser Back / Forward buttons move between views. Each entry
// carries its view and a key; the scroll position is kept per key and
// restored when the entry is shown again. A fresh navigation starts
// at the top. The initial entry is written with replaceState so no
// extra history is piled up.
const VIEW_PATHS = { pain: "/", menu: "/workout", history: "/report", settings: "/settings" };
const PATH_VIEWS = { "/": "pain", "/workout": "menu", "/report": "history", "/settings": "settings" };
let navKeySeq = 0;
let navKey = 0;
const scrollByKey = {};
function go(v) {
  if (v === view) { render(); return; }
  scrollByKey[navKey] = window.scrollY;
  view = v; menuCancelArm = false; menuGenError = "";
  navKey = ++navKeySeq;
  history.pushState({ v, k: navKey }, "", VIEW_PATHS[v]);
  render();
  window.scrollTo(0, 0);
}
window.addEventListener("popstate", (e) => {
  const v = e.state?.v ?? PATH_VIEWS[location.pathname] ?? "pain";
  scrollByKey[navKey] = window.scrollY;
  navKey = e.state?.k ?? 0;
  view = v; menuCancelArm = false; menuGenError = "";
  render();
  const y = scrollByKey[navKey] ?? 0;
  requestAnimationFrame(() => window.scrollTo(0, y));
});
// The session the workout screen works on: today's session, or — when
// today has none — the newest unfinished one (see publicState). A
// session belongs to the day it was started.
const menuSession = () => state?.activeSession ?? state?.todaySession ?? null;

// ---------- workout drafts (client-side only) ----------
// While a workout card is being filled in, its raw input values are kept
// in localStorage under a key naming the date and the session, so a
// reload or a stray tab switch cannot lose them. The server-side data
// format is unchanged. A draft is restored only onto unrecorded cards
// (saved server values always win), and it is dropped when its exercise
// is saved, when the session is completed or cancelled, and whenever it
// belongs to another day or another session.
const DRAFT_PREFIX = "btl-draft:";
const draftKey = () => { const s = menuSession(); return s ? `${DRAFT_PREFIX}${s.date}:${s.id}` : null; };
function readDrafts() {
  try {
    const k = draftKey(); if (!k) return {};
    return JSON.parse(localStorage.getItem(k) || "{}") || {};
  } catch { return {}; }
}
function writeDrafts(d) {
  try {
    const k = draftKey(); if (!k) return;
    if (Object.keys(d).length) localStorage.setItem(k, JSON.stringify(d));
    else localStorage.removeItem(k);
  } catch { /* storage unavailable: drafts are best-effort */ }
}
function dropDraftExercise(exId) {
  const d = readDrafts();
  if (exId in d) { delete d[exId]; writeDrafts(d); }
}
function dropDraftSession() {
  try { const k = draftKey(); if (k) localStorage.removeItem(k); } catch { /* ignore */ }
}
function dropAllDrafts() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith(DRAFT_PREFIX)) localStorage.removeItem(k);
    }
  } catch { /* ignore */ }
}
// On load: drafts from another day / another session never survive, and
// a completed session keeps no drafts.
function pruneDrafts() {
  try {
    const keep = draftKey();
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith(DRAFT_PREFIX) && k !== keep) localStorage.removeItem(k);
    }
    if (menuSession()?.status === "completed") dropDraftSession();
  } catch { /* ignore */ }
}
// Capture edits on workout cards only (history-edit cards are not
// .ex-card, settings fields are not in cards at all).
function captureDraft(e) {
  const el = e.target;
  if (!(el instanceof Element) || !menuSession()) return;
  const card = el.closest(".ex-card"); if (!card) return;
  const field = el.closest("[data-set],[data-rpe],[data-note]"); if (!field) return;
  const tag = field.dataset.set ?? field.dataset.rpe ?? field.dataset.note;
  const exId = Number(String(tag).split(":")[0]);
  const sets = [...card.querySelectorAll("[data-set]")]
    .map((i) => ({ idx: Number(i.dataset.set.split(":")[1]), v: i.value }))
    .sort((a, b) => a.idx - b.idx).map((x) => x.v);
  const rpeEl = card.querySelector("[data-rpe]");
  const noteEl = card.querySelector("[data-note]");
  const d = readDrafts();
  d[exId] = { sets, rpe: rpeEl ? rpeEl.value : "", note: noteEl ? noteEl.value : "" };
  writeDrafts(d);
}

const $app = document.getElementById("app");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const NETWORK_ERROR = "通信に失敗しました。接続を確認してもう一度お試しください。";
async function api(path, body) {
  let res;
  try {
    res = await fetch(path, body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {});
  } catch { throw new Error(NETWORK_ERROR); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  if (data.today) state = data;
  return data;
}
async function load() {
  let res;
  try { res = await fetch("/api/state"); } catch { throw new Error(NETWORK_ERROR); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "読み込みに失敗しました");
  state = data;
  if (state.pain) painSavedGen = painGen;
  pruneDrafts();
  // Deep link / reload on a view URL: adopt that view as the initial
  // history entry (replaceState — no extra history is piled up).
  if (!load.initialised) {
    load.initialised = true;
    view = PATH_VIEWS[location.pathname] ?? "pain";
    navKey = 0; navKeySeq = 0;
    history.replaceState({ v: view, k: 0 }, "", VIEW_PATHS[view]);
  }
  render();
}
// Initial-load failure: never a blank screen — the reason, a hint that
// the server may simply not be running (with its start command), and a
// retry button.
function loadFailed(e) {
  $app.innerHTML = `<p class="error">${esc(e.message)}</p><p class="small">サーバーが起動していない可能性があります。起動コマンド： bun run server.ts</p><button class="cta" id="reloadBtn">再読み込み</button>`;
  document.getElementById("reloadBtn").addEventListener("click", () => {
    $app.innerHTML = `<p>読み込み中…</p>`;
    load().catch(loadFailed);
  });
}
// Run a button's request with the button disabled meanwhile. On failure the
// reason appears in an error line right after the button and the button is
// usable again (never a silent failure, never a stuck button).
// Returns true on success.
async function withBusy(btn, fn) {
  if (!btn || btn.disabled) return false;
  btn.disabled = true;
  try { await fn(); return true; }
  catch (e) {
    let err = btn.nextElementSibling;
    if (!err || !err.classList.contains("action-err")) {
      err = document.createElement("p");
      err.className = "error action-err";
      btn.insertAdjacentElement("afterend", err);
    }
    err.textContent = e.message || "保存に失敗しました。もう一度お試しください。";
    return false;
  } finally { if (btn.isConnected) btn.disabled = false; }
}
document.getElementById("tabs").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-view]"); if (!b) return;
  go(b.dataset.view);
});
document.getElementById("gear").addEventListener("click", () => { go("settings"); });
// Report search: a delegated listener (attached once) so re-rendering
// the entry list never loses it. Typing filters the entries only; the
// summaries hide while a query is present.
document.addEventListener("input", (e) => {
  if (e.target?.id !== "histSearch") return;
  histQuery = e.target.value;
  refreshHistoryList();
});
$app.addEventListener("input", captureDraft);
$app.addEventListener("change", captureDraft);

const LEVEL_WORDS = ["なし", "軽い", "普通", "強い", "かなり強い", "激しい"];
function tapGrid(kind, parts, current) {
  return `<div class="tapgrid">${parts.map((p) => {
    const lv = current[p] || 0;
    const ticks = Array.from({ length: 5 }, (_, i) => `<i class="${i < lv ? "on" : ""}"></i>`).join("");
    return `<button class="tap lv${lv}" data-tap="${kind}:${esc(p)}" aria-label="${esc(p)}：レベル${lv}（${LEVEL_WORDS[lv]}）">
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
const timers = {}; // exerciseId -> { id, total, remaining, running, intId, endAt, done }
function ensureTimer(ex) {
  if (!timers[ex.id]) timers[ex.id] = { id: ex.id, total: ex.targetReps, remaining: ex.targetReps, running: false, intId: null, endAt: 0, done: false };
  return timers[ex.id];
}
// The remaining time is always derived from the stored end time, never
// decremented per tick: while the screen is locked or the tab is in the
// background the interval may be throttled or suspended, but on the next
// tick — and when the page becomes visible again — syncTimer snaps the
// display to the true remainder, or to the finished state if the end
// time passed meanwhile. (The beep is attempted on finish; a browser
// may keep a backgrounded page silent, which is accepted.)
function syncTimer(t) {
  if (!t.running) return;
  t.remaining = Math.max(0, Math.ceil((t.endAt - Date.now()) / 1000));
  if (t.remaining <= 0) { stopTick(t); t.done = true; beep(); }
}
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") return;
  for (const t of Object.values(timers)) {
    if (t.running) { syncTimer(t); updateTimerUI(t.id); }
  }
});
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
  syncTimer(t);
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
  t.intId = setInterval(() => { syncTimer(t); updateTimerUI(ex.id); }, 200);
  updateTimerUI(ex.id);
}
function pauseTimer(ex) {
  const t = ensureTimer(ex);
  syncTimer(t); // freeze the true remainder before stopping the clock
  stopTick(t); updateTimerUI(ex.id);
}
function resetTimer(ex) {
  const t = ensureTimer(ex);
  stopTick(t); t.remaining = t.total; t.done = false; updateTimerUI(ex.id);
}
function timerHtml(ex) {
  const t = timers[ex.id];
  if (t) syncTimer(t); // a re-render must not show a stale remainder
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
  const painCta = completedToday ? "今日の結果を見る" : painIsSaved() ? "ワークアウトを開始" : "コンディションを保存";
  return `
  ${!state.profile ? `<div class="warn">先に右上の歯車ボタンからプロフィールを入力してください（空でも記録はできます）。</div>` : ""}
  <h2>まず、警告サインの確認</h2>
  <p class="desc">当てはまるものがあれば押してください。1つでも当てはまれば、その日は中止・受診が目安です。</p>
  <div class="chips">${state.catalog.redFlags.map((f) => `<button type="button" class="chip${flags.includes(f.id) ? " on" : ""}" data-flagchip="${f.id}" aria-pressed="${flags.includes(f.id)}">${esc(f.label)}</button>`).join("")}</div>
  <h2>今日の筋肉痛は？（部位ごと）</h2>
  <p class="desc">タップで強度が上がります（5の次は0に戻ります）。</p>
  <div class="badges"><span class="badge">0–1 通常</span><span class="badge">2 軽減</span><span class="badge">3以上 除外</span><span class="badge">4以上 ×2部位 休養</span></div>
  ${tapGrid("soreness", state.catalog.muscleParts, soreness)}
  <h2>今日の関節痛は？（関節ごと）</h2>
  <p class="desc">筋肉痛とは別に記録します。タップで強度が上がります（5の次は0に戻ります）。関節は筋肉より厳しめの基準です。</p>
  <div class="badges"><span class="badge">0–1 通常</span><span class="badge">2 軽減</span><span class="badge">3以上 除外</span><span class="badge">サインあり 受診目安</span></div>
  ${tapGrid("jointPain", state.catalog.joints, jointPain)}
  <button class="cta" id="savePain">${painCta}</button>
  ${a ? (a.care ? `<div class="warn">受診目安：${esc(a.careReasons.join(" / "))}</div>`
      : a.rest ? `<div class="warn">完全休養日：${esc(a.restReason)}</div>`
      : `<div class="ok">開始できます。${esc(a.parts.flatMap((p) => p.reasons).join(" / "))}</div>`) : ""}
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
    return `<input class="set-input" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" data-set="${ex.id}:${i}" value="${shown}" placeholder="0" aria-label="${esc(ex.name)} ${i + 1}セット目">`;
  }).join(" ");
  return `<div class="card"><h3>${esc(ex.name)}（${esc(ex.variation)}）</h3>
    <p class="small">${esc(ex.muscleGroup)} ／ 目標 ${ex.targetReps}${ex.targetUnit} × ${ex.targetSets}セット<br>${esc(ex.cue)}</p>
    <div>実施：${sets}</div>
    <label class="row">RPE（1〜10、あと何回できたか） <input class="rpe-input" type="text" inputmode="decimal" data-rpe="${ex.id}" value="${ex.rpe ?? ""}"></label>
    <label class="row"><input type="checkbox" data-done="${ex.id}" ${ex.completed ? "checked" : ""}> 完了</label>
    <input class="note-input" type="text" data-note="${ex.id}" placeholder="この種目のメモ（例：きつかった／できない／楽だった）" value="${esc(ex.note)}" aria-label="この種目のメモ">
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
// Client-side mirror of the server validation (src/validate.ts). The server
// re-checks everything and answers 400 with the reason; checking here first
// shows the same reason in the button's error line without a round trip.
// Each returns a short reason string, or null when the input is valid.
const NOTE_MAX_LEN = 200;
function validateExerciseData(d) {
  for (const v of d.loggedSets) if (!Number.isInteger(v) || v < 0 || v > 999) return "回数は0〜999の整数で入力してください";
  if (d.rpe != null && !(typeof d.rpe === "number" && d.rpe >= 6 && d.rpe <= 10 && Number.isInteger(d.rpe * 2))) return "RPEは6〜10（0.5刻み）で入力してください";
  if (typeof d.note === "string" && d.note.length > NOTE_MAX_LEN) return "メモは200文字以内で入力してください";
  return null;
}
function validateProfileData(v) {
  const num = (s) => { const t = String(s).trim(); return t === "" ? null : Number(t); };
  const age = num(v.age);
  if (age === null || Number.isNaN(age)) return "年齢を入力してください";
  if (!Number.isInteger(age) || age < 10 || age > 100) return "年齢は10〜100の整数で入力してください";
  const h = num(v.heightCm);
  if (h === null || Number.isNaN(h)) return "身長を入力してください";
  if (!Number.isInteger(h) || h < 100 || h > 250) return "身長は100〜250cmの整数で入力してください";
  const w = num(v.weightKg);
  if (w === null || Number.isNaN(w)) return "体重を入力してください";
  if (Number.isNaN(w) || w < 20 || w > 300) return "体重は20〜300kgで入力してください";
  if (v.bodyFatNote.length > NOTE_MAX_LEN || v.habitNote.length > NOTE_MAX_LEN) return "補足は200文字以内で入力してください";
  return null;
}
// Menu-screen exercise card, laid out like the original space: muscle
// group small at the top-left, the variation as the big heading, target
// line and form cue in gray, the total target at the top-right. Set inputs
// are black boxes in an even row; RPE is a black select; the per-exercise
// note sits over a full-width teal record button.
// RPE select options: exactly these ten entries, each shown as
// "value（word）" (also while selected); the saved value is the bare number.
const RPE_SELECT = [[6, "かなり楽"], [6.5, "楽"], [7, "やや楽"], [7.5, "少しきつい"], [8, "きつい"], [8.5, "かなりきつい"], [9, "とてもきつい"], [9.5, "ほぼ限界"], [10, "限界"]];
// The most recent recorded RPE for the same exercise (sessions are
// newest first; the card's own instance is skipped). Used only as the
// initial selection of an unrecorded card's RPE select — a card with
// no recorded history anywhere stays 未入力.
function lastRpeFor(ex) {
  for (const s of state.sessions) {
    for (const e of s.exercises) {
      if (e.id !== ex.id && e.baseId === ex.baseId && e.rpe != null) return e.rpe;
    }
  }
  return null;
}
function menuExerciseCard(s, ex) {
  const recorded = ex.completed || ex.rpe != null || ex.loggedSets.some((v) => v !== 0);
  // An unrecorded card restores its unsaved draft (see the draft helpers);
  // a recorded card always shows the saved server values.
  const draft = recorded ? null : readDrafts()[ex.id];
  const sets = ex.loggedSets.map((v, i) => {
    const shown = recorded ? (v === 0 ? "" : v) : (draft && i < draft.sets.length ? draft.sets[i] : ex.targetReps);
    return `<div class="set-cell"><div class="set-label">${i + 1}セット目</div><input class="set-input" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" data-set="${ex.id}:${i}" value="${esc(shown)}" placeholder="0" aria-label="${esc(ex.variation || ex.name)} ${i + 1}セット目"></div>`;
  }).join("");
  // Initial RPE selection: a draft wins, then the saved value, then —
  // for an unrecorded card — the previous recorded RPE of this exercise.
  const selRpe = draft ? (draft.rpe === "" ? null : Number(draft.rpe)) : (ex.rpe ?? lastRpeFor(ex));
  const rpeOptions = [`<option value=""${selRpe == null ? " selected" : ""}>未入力</option>`]
    .concat(RPE_SELECT.map(([v, w]) => `<option value="${v}"${selRpe === v ? " selected" : ""}>${v}（${w}）</option>`)).join("");
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
    <input class="note-input" id="note-${ex.id}" type="text" data-note="${ex.id}" placeholder="例：フォームが崩れた／左側がきつかった" value="${esc(draft ? draft.note : ex.note)}">
    <div class="note-hint">次回、この種目にだけ反映されます。</div>
    ${ex.targetUnit === "秒" ? timerHtml(ex) : ""}
    <button class="cta ex-save" data-save-ex="${s.id}:${ex.id}">${recorded ? "記録を更新" : "記録して完了"}</button>
  </div>`;
}
function renderMenu() {
  const s = menuSession();
  if (!s) {
    // No condition recorded today yet: this guidance takes priority over
    // the generate-session guidance.
    if (!state.pain) return `<p>今日のコンディションが未入力です。先に入力してください。</p><button class="cta" id="goCond">コンディションを入力</button>`;
    return `<p>今日のセッションはまだありません。</p><button class="cta" id="gen">今日のワークアウトを作る</button><p id="genErr" class="error">${esc(menuGenError)}</p>`;
  }
  const remaining = s.exercises.filter((e) => !e.completed).length;
  // An unfinished session from an earlier day keeps its own date: the
  // title block names that date (header date form) so it can never be
  // mistaken for a session of the new day.
  const pastDate = s.date !== state.today
    ? `<div class="menu-date">${Number(s.date.slice(5, 7))}/${Number(s.date.slice(8, 10))}（${DOW_LABELS[(dayNum(s.date) + 4) % 7]}）のセッション</div>` : "";
  return `${weekDots()}
  ${ringGauge(s)}
  <div class="menu-title"><h2 class="menu-session-title">${esc(s.rotation)} ${esc(s.title)}</h2>
  ${pastDate}
  <div class="menu-remain">${remaining > 0 ? `あと${remaining}種目` : "全種目完了"}</div>
  ${s.focusNote ? `<div class="menu-focus">${esc(s.focusNote)}</div>` : ""}</div>
  ${s.progressionNotes.length ? `<div class="adj-notes"><ul>${s.progressionNotes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul></div>` : ""}
  ${menuMetrics(s)}
  ${s.exercises.map((ex) => menuExerciseCard(s, ex)).join("")}
  ${s.status !== "completed" ? `<div class="card finish-card"><button class="cta" id="complete">今日のトレーニングを完了する</button>
    ${menuCancelArm ? `<div class="cancel-confirm"><p>このワークアウトを取り消しますか？今日のセッションと入力した内容が消えます。</p><div class="cancel-btns"><button class="btn danger-solid" id="cancelExec">取り消す</button><button class="btn" id="cancelBack">やめる</button></div></div>`
      : `<button class="cancel-link" id="cancelMenu">このワークアウトを取り消す</button>`}</div>`
    : `<div class="ok">完了済みです。レポートで確認できます。</div><button class="cta" id="goReport">レポートを見る</button>`}`;
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
// ---------- report summaries + search ----------
// Monthly totals (newest month first) and per-muscle-group totals,
// computed from the recorded sessions on the client. A session counts
// toward a muscle group once per exercise actually performed
// (completed, or with any set logged above zero); the group total is
// the raw sum of logged sets (seconds for timed exercises).
function historySummariesHtml() {
  const months = new Map();
  for (const s of state.sessions) {
    const k = s.date.slice(0, 7);
    const m = months.get(k) ?? { n: 0, vol: 0 };
    m.n++; m.vol += s.totalVolume; months.set(k, m);
  }
  const monthRows = [...months.entries()].sort((a, b) => b[0].localeCompare(a[0]))
    .map(([k, m]) => `<div class="sum-row"><span>${Number(k.slice(0, 4))}年${Number(k.slice(5, 7))}月</span><span class="sum-val">${m.n}回 ／ ${m.vol}レップ</span></div>`).join("");
  const groups = new Map();
  for (const s of state.sessions) for (const e of s.exercises) {
    if (!e.completed && !e.loggedSets.some((v) => v > 0)) continue;
    const g = groups.get(e.muscleGroup) ?? { n: 0, vol: 0 };
    g.n++; g.vol += e.loggedSets.reduce((a, b) => a + b, 0); groups.set(e.muscleGroup, g);
  }
  const groupRows = [...groups.entries()].sort((a, b) => b[1].vol - a[1].vol)
    .map(([g, v]) => `<div class="sum-row"><span>${esc(g)}</span><span class="sum-val">${v.n}回 ／ ${v.vol}</span></div>`).join("");
  return `<h3 class="sum-head">月別</h3>${monthRows}<h3 class="sum-head">部位別</h3>${groupRows}`;
}
// Free-word filter: a session matches when any of its exercises matches
// on name, variation, or per-exercise note.
function sessionMatchesQuery(s) {
  const q = histQuery.trim().toLowerCase();
  if (!q) return true;
  return s.exercises.some((e) => `${e.name} ${e.variation ?? ""} ${e.note ?? ""}`.toLowerCase().includes(q));
}
// Re-render only the entry list (and the summaries' visibility) while
// searching, so the search field keeps its focus and value.
function refreshHistoryList() {
  const ent = document.getElementById("histEntries");
  if (!ent) return;
  ent.innerHTML = historyEntriesHtml();
  const sum = document.getElementById("histSummaries");
  if (sum) sum.style.display = histQuery.trim() ? "none" : "";
  bindHistoryEntries();
}
// The old Result view is merged into History: one list, newest first, in
// the original's layout — big day number + month/weekday on the left,
// rotation and exercise rows in the middle, session total on the right.
function historyEntriesHtml() {
  const shown = state.sessions.filter(sessionMatchesQuery);
  if (!shown.length) return `<p>該当する記録がありません。</p>`;
  return shown.map((s) => {
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
}
function renderHistory() {
  if (!state.sessions.length) return `<h2>レポート</h2><p>記録はまだありません。</p><button class="cta" id="histGoMenu">ワークアウトへ</button>`;
  const searching = histQuery.trim() !== "";
  return `<h2>レポート</h2>
  <div class="hist-tools"><input type="search" id="histSearch" placeholder="種目名・メモで検索" aria-label="記録を検索" value="${esc(histQuery)}"></div>
  <div id="histSummaries"${searching ? ` style="display:none"` : ""}>${historySummariesHtml()}</div>
  <div id="histEntries">${historyEntriesHtml()}</div>`;
}
// Profile-history value formatting: an unset value reads 未入力.
const fmtHistVal = (v) => (v === null || v === undefined || v === "" ? "未入力" : String(v));
// A profile-history timestamp (ISO, UTC) shown in Asia/Tokyo as the
// header date form plus HH:MM, e.g. 11/13（金） 14:05.
function profileHistoryWhen(at) {
  const t = new Date(at);
  if (Number.isNaN(t.getTime())) return "";
  const d = t.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
  const time = t.toLocaleTimeString("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit", hour12: false });
  const n = dayNum(d);
  return `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}（${DOW_LABELS[(n + 4) % 7]}） ${time}`;
}
function renderSettings() {
  const p = state.profile ?? { age: "", sex: "", heightCm: "", weightKg: "", bodyFatNote: "", habitNote: "" };
  return `<button class="back-btn" id="backHome">← ホームに戻る</button>
  <h2>プロフィール（初回設定）</h2>
  <div class="form-grid">
    <div class="field"><label for="pf-age">年齢</label><input type="text" inputmode="numeric" pattern="[0-9]*" id="pf-age" value="${p.age ?? ""}"></div>
    <div class="field"><label for="pf-sex">性別</label><input type="text" id="pf-sex" value="${esc(p.sex)}"></div>
    <div class="field"><label for="pf-height">身長（cm）</label><input type="text" inputmode="numeric" pattern="[0-9]*" id="pf-height" value="${p.heightCm ?? ""}"></div>
    <div class="field"><label for="pf-weight">体重（kg）</label><input type="text" inputmode="decimal" id="pf-weight" value="${p.weightKg ?? ""}"></div>
    <div class="field wide"><label for="pf-fat">体脂肪などの補足</label><textarea id="pf-fat" rows="2">${esc(p.bodyFatNote)}</textarea></div>
    <div class="field wide"><label for="pf-habit">運動習慣の補足</label><textarea id="pf-habit" rows="2">${esc(p.habitNote)}</textarea></div>
  </div>
  <p><button class="btn" id="saveProfile">保存</button></p>
  ${(state.profileHistory ?? []).length ? `<h2>プロフィール履歴</h2>
  <div class="prof-history">${state.profileHistory.map((h) => `<div class="ph-entry"><div class="ph-date">${esc(profileHistoryWhen(h.at))}</div>${h.changes.map((c) => `<div class="ph-row">${esc(c.label)}： ${esc(fmtHistVal(c.from))} → ${esc(fmtHistVal(c.to))}</div>`).join("")}</div>`).join("")}</div>` : ""}
  <h2>データ</h2><p class="small">保存先はサーバー側の data/store.json です。</p>
  <p class="data-actions"><button class="btn" id="exportData">エクスポート</button><button class="btn" id="importData">インポート</button><input type="file" id="importFile" accept="application/json,.json" hidden></p>
  ${importError ? `<p class="error">${esc(importError)}</p>` : ""}
  ${importArm ? `<div class="reset-confirm"><p>「${esc(importFileName)}」で現在のデータをすべて置き換えます。元に戻せません。</p><button class="btn danger-solid" id="importConfirm">インポートする</button><button class="btn" id="importCancel">キャンセル</button></div>` : ""}
  <button class="btn danger" id="reset">データを消す</button>
  ${resetArm ? `<div class="reset-confirm"><p>本当に全データを消しますか？プロフィール・痛みの記録・セッション履歴がすべて消え、元に戻せません。</p><button class="btn danger-solid" id="resetConfirm">本当に全データを消す</button><button class="btn" id="resetCancel">キャンセル</button></div>` : ""}`;
}
function render() {
  if (!state) return; // nothing to render until the initial load succeeds
  document.querySelectorAll("#tabs button").forEach((b) => {
    const active = b.dataset.view === view;
    b.classList.toggle("active", active);
    if (active) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
  });
  // The gear is shown only on the home (pain) screen and on Settings.
  document.getElementById("gear").style.display = view === "pain" || view === "settings" ? "" : "none";
  $app.innerHTML = view === "pain" ? renderPain() : view === "menu" ? renderMenu() : view === "history" ? renderHistory() : renderSettings();
  updateHeader();
  bind();
}
// Bindings for the report entry list only. bind() calls this on every
// full render, and refreshHistoryList() calls it after replacing the
// list during a search, so the edit buttons always work.
function bindHistoryEntries() {
  const root = document.getElementById("histEntries") ?? $app;
  root.querySelectorAll(".set-input").forEach((el) => el.addEventListener("input", () => { el.value = sanitizeDigits(el.value); }));
  root.querySelectorAll("[data-edit-history]").forEach((el) => el.addEventListener("click", () => { editingHist.add(Number(el.dataset.editHistory)); render(); }));
  root.querySelectorAll("[data-save-history]").forEach((el) => el.addEventListener("click", async () => {
    const s = state.sessions.find((x) => x.id === Number(el.dataset.saveHistory));
    const exercises = s.exercises.map((ex) => ({ exerciseId: ex.id, ...collectExercise($app, ex) }));
    await withBusy(el, async () => {
      for (const u of exercises) { const err = validateExerciseData(u); if (err) throw new Error(err); }
      await api(`/api/session/${s.id}/record`, { exercises }); editingHist.delete(s.id); render();
    });
  }));
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
    const payload = () => ({ soreness: state.pain?.soreness ?? painDraft.soreness, jointPain: state.pain?.jointPain ?? painDraft.jointPain, redFlags: state.pain?.redFlags ?? painDraft.redFlags });
    const savePainNow = async () => {
      await api("/api/pain", payload());
      painSavedGen = painGen;
      Object.keys(painDraft.soreness).length = 0;
    };
    if (state.todaySession?.status === "completed") { // 「今日の結果を見る」: save any edits first, then go
      if (!painIsSaved() && !(await withBusy(savePain, savePainNow))) return; // failed: error line shown, stay here
      go("history"); return;
    }
    if (painIsSaved()) { // 「ワークアウトを開始」: create today's session first if there is none yet
      if (!state.todaySession) {
        savePain.disabled = true; // one generation attempt at a time
        try { await api("/api/session/generate", {}); menuGenError = ""; }
        catch (e) { menuGenError = e.message; } // blocked (red flag / rest day): the menu empty state shows the reason
      }
      go("menu"); return;
    }
    await withBusy(savePain, async () => { await savePainNow(); render(); }); // the CTA now reads ワークアウトを開始
  });
  const backHome = document.getElementById("backHome");
  if (backHome) backHome.addEventListener("click", () => { go("pain"); });
  const gen = document.getElementById("gen");
  if (gen) gen.addEventListener("click", async () => {
    if (gen.disabled) return;
    gen.disabled = true; // the #genErr line below already reports failures
    try { await api("/api/session/generate", {}); menuGenError = ""; go("menu"); }
    catch (e) { menuGenError = e.message; const ge = document.getElementById("genErr"); if (ge) ge.textContent = e.message; }
    finally { if (gen.isConnected) gen.disabled = false; }
  });
  const goCond = document.getElementById("goCond");
  if (goCond) goCond.addEventListener("click", () => { go("pain"); });
  const goReport = document.getElementById("goReport");
  if (goReport) goReport.addEventListener("click", () => { go("history"); });
  const histGoMenu = document.getElementById("histGoMenu");
  if (histGoMenu) histGoMenu.addEventListener("click", () => { go("menu"); });
  $app.querySelectorAll("[data-save-ex]").forEach((el) => el.addEventListener("click", async () => {
    const [sid, eid] = el.dataset.saveEx.split(":").map(Number);
    const s = state.sessions.find((x) => x.id === sid) ?? menuSession();
    const ex = s.exercises.find((x) => x.id === eid);
    // 「記録して完了」: saving from the menu card always marks the exercise completed.
    await withBusy(el, async () => {
      const data = { ...collectExercise($app, ex), completed: true };
      const err = validateExerciseData(data); if (err) throw new Error(err);
      await api(`/api/session/${sid}/exercise/${eid}`, data);
      if (menuSession() && sid === menuSession().id) dropDraftExercise(eid); // saved: the draft is done
      render();
    });
  }));
  const findTodayEx = (id) => (menuSession()?.exercises ?? []).find((e) => e.id === id);
  $app.querySelectorAll("[data-timer-start]").forEach((el) => el.addEventListener("click", () => { const ex = findTodayEx(Number(el.dataset.timerStart)); if (ex) startTimer(ex); }));
  $app.querySelectorAll("[data-timer-pause]").forEach((el) => el.addEventListener("click", () => { const ex = findTodayEx(Number(el.dataset.timerPause)); if (ex) pauseTimer(ex); }));
  $app.querySelectorAll("[data-timer-reset]").forEach((el) => el.addEventListener("click", () => { const ex = findTodayEx(Number(el.dataset.timerReset)); if (ex) resetTimer(ex); }));
  const complete = document.getElementById("complete");
  if (complete) complete.addEventListener("click", async () => {
    await withBusy(complete, async () => { await api(`/api/session/${menuSession().id}/complete`, {}); dropDraftSession(); menuCancelArm = false; go("history"); });
  });
  const cancelMenu = document.getElementById("cancelMenu");
  if (cancelMenu) cancelMenu.addEventListener("click", () => { menuCancelArm = true; render(); });
  const cancelBack = document.getElementById("cancelBack");
  if (cancelBack) cancelBack.addEventListener("click", () => { menuCancelArm = false; render(); });
  const cancelExec = document.getElementById("cancelExec");
  if (cancelExec) cancelExec.addEventListener("click", async () => {
    const key = draftKey(); // after the delete there is no menu session to key on
    await withBusy(cancelExec, async () => {
      await api(`/api/session/${menuSession().id}/delete`, {});
      if (key) { try { localStorage.removeItem(key); } catch { /* ignore */ } }
      menuCancelArm = false; go("pain");
    });
  });
  bindHistoryEntries();
  const saveProfile = document.getElementById("saveProfile");
  if (saveProfile) saveProfile.addEventListener("click", async () => {
    await withBusy(saveProfile, async () => {
      const values = { age: document.getElementById("pf-age").value, sex: document.getElementById("pf-sex").value, heightCm: document.getElementById("pf-height").value, weightKg: document.getElementById("pf-weight").value, bodyFatNote: document.getElementById("pf-fat").value, habitNote: document.getElementById("pf-habit").value };
      const err = validateProfileData(values); if (err) throw new Error(err);
      await api("/api/profile", values);
      render();
    });
  });
  const exportData = document.getElementById("exportData");
  if (exportData) exportData.addEventListener("click", () => { window.location.href = "/api/export"; });
  const importData = document.getElementById("importData");
  const importFile = document.getElementById("importFile");
  if (importData && importFile) {
    importData.addEventListener("click", () => importFile.click());
    importFile.addEventListener("change", async () => {
      const f = importFile.files?.[0]; if (!f) return;
      try {
        importPending = JSON.parse(await f.text());
        importFileName = f.name; importError = ""; importArm = true;
      } catch { importPending = null; importFileName = ""; importError = "ファイルの形式が正しくありません"; importArm = false; }
      render();
    });
  }
  const importCancel = document.getElementById("importCancel");
  if (importCancel) importCancel.addEventListener("click", () => { importArm = false; importPending = null; render(); });
  const importConfirm = document.getElementById("importConfirm");
  if (importConfirm) importConfirm.addEventListener("click", async () => {
    await withBusy(importConfirm, async () => {
      await api("/api/import", importPending);
      importArm = false; importPending = null; importError = "";
      painGen = 0; painSavedGen = -1; editingHist.clear();
      for (const k of Object.keys(timers)) delete timers[k];
      pruneDrafts(); // drafts of the replaced data never survive
      render();
    });
  });
  const reset = document.getElementById("reset");
  if (reset) reset.addEventListener("click", () => { resetArm = true; render(); });
  const resetCancel = document.getElementById("resetCancel");
  if (resetCancel) resetCancel.addEventListener("click", () => { resetArm = false; render(); });
  const resetConfirm = document.getElementById("resetConfirm");
  if (resetConfirm) resetConfirm.addEventListener("click", async () => {
    await withBusy(resetConfirm, async () => { await api("/api/reset", {}); resetArm = false; dropAllDrafts(); painGen = 0; painSavedGen = -1; go("pain"); });
  });
}
load().catch(loadFailed);

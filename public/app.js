// Leading-zero safe numeric input: keep the raw digit string, strip leading
// zeros for display ("0" itself stays "0"), so typing 1 never shows "01".
function sanitizeDigits(v) {
  const d = String(v).replace(/\D/g, "");
  if (d === "") return "";
  return d.replace(/^0+(?=\d)/, "");
}
let state = null;
let view = "pain";
const painDraft = { soreness: {}, jointPain: {}, redFlags: [] };

const $app = document.getElementById("app");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
async function api(path, body) {
  const res = await fetch(path, body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {});
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  if (data.today) state = data;
  return data;
}
async function load() { state = await (await fetch("/api/state")).json(); render(); }
document.getElementById("tabs").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-view]"); if (!b) return;
  view = b.dataset.view; render();
});

function tapGrid(kind, parts, current) {
  return parts.map((p) => {
    const lv = current[p] || 0;
    return `<button class="tap lv${lv}" data-tap="${kind}:${esc(p)}">${esc(p)}<b>${lv}</b><small>タップで+1</small></button>`;
  }).join("");
}
function renderPain() {
  const pain = state.pain;
  const src = pain ?? painDraft;
  const soreness = { ...painDraft.soreness, ...(pain?.soreness ?? {}) };
  const jointPain = { ...painDraft.jointPain, ...(pain?.jointPain ?? {}) };
  const flags = pain?.redFlags ?? painDraft.redFlags;
  const a = state.assessment;
  return `
  ${!state.profile ? `<div class="warn">先に「設定」タブでプロフィールを入力してください（空でも記録はできます）。</div>` : ""}
  <h2>筋肉痛チェック（部位別 0〜5）</h2><div>${tapGrid("soreness", state.catalog.muscleParts, soreness)}</div>
  <h2>関節痛チェック（0〜5）</h2><div>${tapGrid("jointPain", state.catalog.joints, jointPain)}</div>
  <h2>警告サイン（当てはまるものにチェック）</h2>
  ${state.catalog.redFlags.map((f) => `<label class="row"><input type="checkbox" data-flag="${f.id}" ${flags.includes(f.id) ? "checked" : ""}> ${esc(f.label)}</label>`).join("")}
  <p><button class="btn" id="savePain">痛みの記録を保存</button></p>
  ${a ? (a.care ? `<div class="warn">受診目安：${a.careReasons.join(" / ")}</div>`
      : a.rest ? `<div class="warn">完全休養日：${esc(a.restReason)}</div>`
      : `<div class="ok">開始できます。${a.parts.flatMap((p) => p.reasons).join(" / ")}</div>`) : ""}`;
}
function exerciseCard(s, ex, editable) {
  const sets = ex.loggedSets.map((v, i) =>
    `<input class="set-input" type="text" inputmode="numeric" autocomplete="off" data-set="${ex.id}:${i}" value="${v === 0 ? "" : v}" placeholder="0">`).join(" ");
  return `<div class="card"><h3>${esc(ex.name)}（${esc(ex.variation)}）</h3>
    <p class="small">${esc(ex.muscleGroup)} ／ 目標 ${ex.targetReps}${ex.targetUnit} × ${ex.targetSets}セット<br>${esc(ex.cue)}</p>
    <div>実施：${sets}</div>
    <label class="row">RPE（1〜10、あと何回できたか） <input class="rpe-input" type="text" inputmode="decimal" data-rpe="${ex.id}" value="${ex.rpe ?? ""}"></label>
    <label class="row"><input type="checkbox" data-done="${ex.id}" ${ex.completed ? "checked" : ""}> 完了</label>
    <input class="note-input" type="text" data-note="${ex.id}" placeholder="この種目のメモ（例：きつかった／できない／楽だった）" value="${esc(ex.note)}">
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
function renderMenu() {
  const s = state.todaySession;
  if (!s) return `<p>今日のセッションはまだありません。</p><button class="btn" id="gen">今日のメニューを作る</button><p id="genErr" class="error"></p>`;
  return `<h2>${esc(s.title)}（${esc(s.rotation)}）${s.intro ? "・導入期" : ""}</h2>
  ${s.focusNote ? `<p>${esc(s.focusNote)}</p>` : ""}
  ${s.progressionNotes.length ? `<div class="card"><h3>前回の記録・メモ・RPEからの調整</h3><ul>${s.progressionNotes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul></div>` : ""}
  ${s.exercises.map((ex) => exerciseCard(s, ex, true)).join("")}
  ${s.status !== "completed" ? `<button class="btn" id="complete">トレーニングを完了する</button>` : `<div class="ok">完了済みです。結果タブで確認できます。</div>`}`;
}
function renderResult() {
  const s = state.todaySession;
  if (!s) return `<p>今日のセッションはまだありません。</p>`;
  const done = s.exercises.filter((e) => e.completed).length;
  return `<h2>結果</h2><div class="card"><p>${esc(s.title)} ／ 合計 ${s.totalVolume} ／ 完了 ${done}/${s.exercises.length}種目</p>
  <ul>${s.exercises.map((e) => `<li>${esc(e.name)}：${e.loggedSets.join(" / ") || "-"}${e.targetUnit}（RPE ${e.rpe ?? "-"}）${e.note ? `・メモ：${esc(e.note)}` : ""}</li>`).join("")}</ul>
  <p class="small">累計：完了 ${state.stats.totalCompleted}回 ／ 総量 ${state.stats.totalVolume}</p></div>`;
}
function renderHistory() {
  if (!state.sessions.length) return `<p>記録はまだありません。</p>`;
  return state.sessions.map((s) => `<div class="card"><h3>${esc(s.date)}：${esc(s.title)}（合計 ${s.totalVolume}）</h3>
    ${s.exercises.map((ex) => exerciseCard(s, ex, false)).join("")}
    <button class="btn" data-save-history="${s.id}">この記録を修正して保存</button></div>`).join("");
}
function renderSettings() {
  const p = state.profile ?? { age: "", sex: "", heightCm: "", weightKg: "", bodyFatNote: "", habitNote: "" };
  return `<h2>プロフィール（初回設定）</h2>
  <label class="row">年齢 <input type="text" inputmode="numeric" id="pf-age" value="${p.age ?? ""}"></label>
  <label class="row">性別 <input type="text" id="pf-sex" value="${esc(p.sex)}"></label>
  <label class="row">身長(cm) <input type="text" inputmode="decimal" id="pf-height" value="${p.heightCm ?? ""}"></label>
  <label class="row">体重(kg) <input type="text" inputmode="decimal" id="pf-weight" value="${p.weightKg ?? ""}"></label>
  <label class="row">体脂肪などの補足 <input type="text" id="pf-fat" value="${esc(p.bodyFatNote)}"></label>
  <label class="row">運動習慣の補足 <input type="text" id="pf-habit" value="${esc(p.habitNote)}"></label>
  <p><button class="btn" id="saveProfile">保存</button></p>
  <h2>データ</h2><p class="small">保存先はサーバー側の data/store.json です。全データを消す場合はリセットしてください。</p>
  <button class="btn" id="reset">全データをリセット</button>`;
}
function render() {
  document.querySelectorAll("#tabs button").forEach((b) => b.classList.toggle("active", b.dataset.view === view));
  $app.innerHTML = view === "pain" ? renderPain() : view === "menu" ? renderMenu() : view === "result" ? renderResult() : view === "history" ? renderHistory() : renderSettings();
  bind();
}
function bind() {
  $app.querySelectorAll("[data-tap]").forEach((el) => el.addEventListener("click", () => {
    const [kind, part] = el.dataset.tap.split(":");
    const cur = { ...(state.pain?.[kind] ?? {}), ...painDraft[kind] };
    painDraft[kind] = { ...cur, [part]: ((cur[part] || 0) + 1) % 6 };
    // draft is merged over saved values at save/render time; re-render from a merged pain view
    state = { ...state, pain: { date: state.today, soreness: { ...(state.pain?.soreness ?? {}), ...painDraft.soreness }, jointPain: { ...(state.pain?.jointPain ?? {}), ...painDraft.jointPain }, redFlags: state.pain?.redFlags ?? painDraft.redFlags } };
    render();
  }));
  $app.querySelectorAll("[data-flag]").forEach((el) => el.addEventListener("change", () => {
    const flags = new Set(state.pain?.redFlags ?? painDraft.redFlags);
    el.checked ? flags.add(el.dataset.flag) : flags.delete(el.dataset.flag);
    painDraft.redFlags = [...flags];
    state = { ...state, pain: { ...(state.pain ?? { date: state.today, soreness: {}, jointPain: {} }), redFlags: painDraft.redFlags } };
  }));
  $app.querySelectorAll(".set-input").forEach((el) => el.addEventListener("input", () => { el.value = sanitizeDigits(el.value); }));
  const savePain = document.getElementById("savePain");
  if (savePain) savePain.addEventListener("click", async () => {
    await api("/api/pain", { soreness: state.pain?.soreness ?? painDraft.soreness, jointPain: state.pain?.jointPain ?? painDraft.jointPain, redFlags: state.pain?.redFlags ?? painDraft.redFlags });
    Object.keys(painDraft.soreness).length = 0; render();
  });
  const gen = document.getElementById("gen");
  if (gen) gen.addEventListener("click", async () => {
    try { await api("/api/session/generate", {}); view = "menu"; render(); }
    catch (e) { document.getElementById("genErr").textContent = e.message; }
  });
  $app.querySelectorAll("[data-save-ex]").forEach((el) => el.addEventListener("click", async () => {
    const [sid, eid] = el.dataset.saveEx.split(":").map(Number);
    const s = state.sessions.find((x) => x.id === sid) ?? state.todaySession;
    const ex = s.exercises.find((x) => x.id === eid);
    await api(`/api/session/${sid}/exercise/${eid}`, collectExercise($app, ex)); render();
  }));
  const complete = document.getElementById("complete");
  if (complete) complete.addEventListener("click", async () => { await api(`/api/session/${state.todaySession.id}/complete`, {}); view = "result"; render(); });
  $app.querySelectorAll("[data-save-history]").forEach((el) => el.addEventListener("click", async () => {
    const s = state.sessions.find((x) => x.id === Number(el.dataset.saveHistory));
    const exercises = s.exercises.map((ex) => ({ exerciseId: ex.id, ...collectExercise($app, ex) }));
    await api(`/api/session/${s.id}/record`, { exercises }); render();
  }));
  const saveProfile = document.getElementById("saveProfile");
  if (saveProfile) saveProfile.addEventListener("click", async () => {
    await api("/api/profile", { age: document.getElementById("pf-age").value, sex: document.getElementById("pf-sex").value, heightCm: document.getElementById("pf-height").value, weightKg: document.getElementById("pf-weight").value, bodyFatNote: document.getElementById("pf-fat").value, habitNote: document.getElementById("pf-habit").value });
    render();
  });
  const reset = document.getElementById("reset");
  if (reset) reset.addEventListener("click", async () => { if (confirm("全データを消しますか？")) { await api("/api/reset", {}); render(); } });
}
load().catch((e) => { $app.innerHTML = `<p class="error">${esc(e.message)}</p>`; });

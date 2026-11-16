// Leading-zero safe numeric input: keep the raw digit string, strip leading
// zeros for display ("0" itself stays "0"), so typing 1 never shows "01".
function sanitizeDigits(v) {
  const d = String(v).replace(/\D/g, "");
  if (d === "") return "";
  return d.replace(/^0+(?=\d)/, "");
}

// ---------- UI language (Japanese / English) ----------
// All UI text lives in the STR dictionary; the current language comes
// from the server state (state.lang, saved in the store — absent means
// Japanese) and every render goes through t(). Switching the language
// in Settings saves it server-side and re-renders in place, with no
// reload. Data-derived names (exercise names, variations, the user's
// own notes) are never translated; body-part / joint / muscle-group
// display labels are translated from the maps below while the stored
// keys stay Japanese.
let lang = "ja";
const STR = {
  ja: {
    appTitle: "自重トレーニング記録",
    purpose: "器具なし / 筋力・筋肥大",
    totalLabel: "累計", totalUnit: "負荷",
    gear: "設定",
    tab_pain: "コンディション", tab_menu: "ワークアウト", tab_history: "レポート",
    loading: "読み込み中…",
    levelAria: "{part}：レベル{lv}（{word}）",
    networkError: "通信に失敗しました。接続を確認してもう一度お試しください。",
    loadFailedDefault: "読み込みに失敗しました",
    serverHint: "サーバーが起動していない可能性があります。起動コマンド： bun run server.ts",
    reload: "再読み込み",
    saveFailedRetry: "保存に失敗しました。もう一度お試しください。",
    profileMissing: "先に右上の歯車ボタンからプロフィールを入力してください（空でも記録はできます）。",
    warnSignsH: "まず、警告サインの確認",
    warnSignsDesc: "当てはまるものがあれば押してください。1つでも当てはまれば、その日は中止・受診が目安です。",
    sorenessH: "今日の筋肉痛は？（部位ごと）",
    sorenessDesc: "タップで強度が上がります（5の次は0に戻ります）。",
    jointH: "今日の関節痛は？（関節ごと）",
    jointDesc: "筋肉痛とは別に記録します。タップで強度が上がります（5の次は0に戻ります）。関節は筋肉より厳しめの基準です。",
    badgeNormal: "0–1 通常", badgeReduce: "2 軽減", badgeExclude: "3以上 除外",
    badgeRest: "4以上 ×2部位 休養", badgeSign: "サインあり 受診目安",
    ctaResults: "今日の結果を見る", ctaSaveStart: "保存してワークアウトを開始",
    carePrefix: "受診目安：", restPrefix: "完全休養日：", okPrefix: "開始できます。",
    gaugeSub: "／ {total} 種目完了",
    metricExercises: "種目", metricSets: "セット", metricSessions: "累計回",
    setLabel: "{n}セット目",
    sideLeft: "左", sideRight: "右",
    targetLine: "目標 {sets}セット × {reps}{unit}",
    totalLabelUnit: "合計{unit}",
    rpeLabel: "きつさ RPE",
    rpeNone: "未入力",
    noteLabel: "この種目のメモ（任意）",
    notePlaceholder: "例：フォームが崩れた／左側がきつかった",
    noteHint: "次回、この種目にだけ反映されます。",
    updateRecord: "記録を更新", saveAndDone: "記録して完了",
    timerStart: "開始", timerPause: "一時停止", timerReset: "リセット",
    noCondition: "今日のコンディションが未入力です。先に入力してください。",
    goCondition: "コンディションを入力",
    noSession: "今日のセッションはまだありません。",
    createWorkout: "今日のワークアウトを作る",
    pastSession: "{date}のセッション",
    remain: "あと{n}種目", allDone: "全種目完了",
    completeBtn: "今日のトレーニングを完了する",
    cancelConfirm: "このワークアウトを取り消しますか？今日のセッションと入力した内容が消えます。",
    cancelExec: "取り消す", cancelBack: "やめる", cancelLink: "このワークアウトを取り消す",
    completedBox: "完了済みです。レポートで確認できます。",
    viewReport: "レポートを見る",
    titleAltSuffix: "（代替）",
    reportH: "レポート",
    noRecords: "記録はまだありません。",
    goWorkout: "ワークアウトへ",
    searchPlaceholder: "種目名・メモで検索", searchAria: "記録を検索",
    sumMonthly: "月別", sumGroups: "部位別",
    monthValue: "{n}回 ／ {vol}レップ", groupValue: "{n}回 ／ {vol}",
    monthCount: "{n}回", histNewer: "新しい日へ", histOlder: "古い日へ",
    histDayView: "日別", histMonthView: "月別",
    noMatch: "該当する記録がありません。",
    notePrefix: "種目メモ： ", loadSuffix: "負荷",
    editRecord: "記録を編集", editDoneBtn: "編集を終わる",
    rpeParen: "（RPE {rpe} {word}）", rpePlain: "RPE {rpe} {word}",
    backHome: "← ホームに戻る",
    profileH: "プロフィール（初回設定）",
    fAge: "年齢", fSex: "性別", fHeight: "身長（cm）", fWeight: "体重（kg）",
    sexMale: "男性", sexFemale: "女性", sexNone: "選択しない",
    fNote: "補足",
    fNoteHint: "既往症・ケガの履歴、常用している薬、アレルギー、体脂肪、運動習慣など、判定やメニューに影響しうる情報を書いてください。",
    savedIndicator: "保存済み",
    languageH: "言語",
    themeH: "テーマ", themeDark: "ダーク", themeLight: "ライト", themeSystem: "システム",
    profileHistoryH: "プロフィール履歴",
    notEntered: "未入力",
    dataH: "データ",
    dataNote: "保存先はサーバー側の data/store.json です。",
    dataFormats: "エクスポート：JSON（全データ、復元用）／ CSV（セッション記録の一覧、閲覧用）。インポート：JSONのみ（CSVは取り込めません）。",
    exportJsonBtn: "エクスポート（JSON）", exportCsvBtn: "エクスポート（CSV）", importBtn: "インポート",
    menuDefH: "メニュー定義",
    menuDefNote: "ワークアウトのメニュー（種目・代替・痛みの対象部位）をJSONで編集できます。変更は次に生成されるセッションから反映され、記録済みのセッションは変わりません。",
    menuDefSaveBtn: "保存", menuDefExportBtn: "エクスポート", menuDefImportBtn: "インポート", menuDefResetBtn: "初期値に戻す",
    menuDefResetArmBtn: "本当に初期値に戻す", menuDefSaved: "保存しました",
    menuDefBtn: "メニュー編集",
    guideStepsH: "手順", guideFocusH: "意識する部位", guideClose: "閉じる", guideBtnLabel: "解説",
    importConfirmText: "「{name}」で現在のデータをすべて置き換えます。元に戻せません。",
    importExec: "インポートする", cancelBtn: "キャンセル",
    fileFormatError: "ファイルの形式が正しくありません",
    deleteData: "データを消す",
    resetConfirmText: "本当に全データを消しますか？プロフィール・痛みの記録・セッション履歴がすべて消え、元に戻せません。",
    resetExec: "本当に全データを消す",
    vReps: "回数は0〜999の整数で入力してください",
    vRpe: "RPEは6〜10（0.5刻み）で入力してください",
    vNote: "メモは200文字以内で入力してください",
    vAgeRequired: "年齢を入力してください", vAgeRange: "年齢は10〜100の整数で入力してください",
    vHeightRequired: "身長を入力してください", vHeightRange: "身長は100〜250cmの整数で入力してください",
    vWeightRequired: "体重を入力してください", vWeightRange: "体重は20〜300kgで入力してください",
    vNoteField: "補足は500文字以内で入力してください",
    vSexInvalid: "性別は選択肢から選んでください",
  },
  en: {
    appTitle: "Bodyweight Training Log",
    purpose: "No equipment / Strength & hypertrophy",
    totalLabel: "Total", totalUnit: "load",
    gear: "Settings",
    tab_pain: "Condition", tab_menu: "Workout", tab_history: "Report",
    loading: "Loading…",
    levelAria: "{part}: level {lv} ({word})",
    networkError: "Network error. Check your connection and try again.",
    loadFailedDefault: "Failed to load",
    serverHint: "The server may not be running. Start command: bun run server.ts",
    reload: "Reload",
    saveFailedRetry: "Saving failed. Please try again.",
    profileMissing: "Enter your profile first from the gear button at the top right (you can still record without it).",
    warnSignsH: "First, check the warning signs",
    warnSignsDesc: "Tap any that apply. If even one applies, treat the day as a no-training day and consider seeing a doctor.",
    sorenessH: "Muscle soreness today (by part)",
    sorenessDesc: "Tap to raise the level (after 5 it returns to 0).",
    jointH: "Joint pain today (by joint)",
    jointDesc: "Recorded separately from soreness. Tap to raise the level (after 5 it returns to 0). Joints are judged more strictly than muscles.",
    badgeNormal: "0–1 Normal", badgeReduce: "2 Reduced", badgeExclude: "3+ Excluded",
    badgeRest: "4+ in 2+ parts: rest", badgeSign: "Sign present: see a doctor",
    ctaResults: "See today's results", ctaSaveStart: "Save and start workout",
    carePrefix: "See a doctor: ", restPrefix: "Full rest day: ", okPrefix: "You can start. ",
    gaugeSub: "/ {total} exercises done",
    metricExercises: "Exercises", metricSets: "Sets", metricSessions: "Sessions",
    setLabel: "Set {n}",
    sideLeft: "L", sideRight: "R",
    targetLine: "Target {sets} sets × {reps} {unit}",
    totalLabelUnit: "Total {unit}",
    rpeLabel: "Effort (RPE)",
    rpeNone: "Not entered",
    noteLabel: "Note for this exercise (optional)",
    notePlaceholder: "e.g. my form broke down / the left side was harder",
    noteHint: "Applies to this exercise only, next time.",
    updateRecord: "Update record", saveAndDone: "Save and finish",
    timerStart: "Start", timerPause: "Pause", timerReset: "Reset",
    noCondition: "Today's condition check has not been entered yet. Enter it first.",
    goCondition: "Enter condition check",
    noSession: "There is no session for today yet.",
    createWorkout: "Create today's workout",
    pastSession: "Session from {date}",
    remain: "{n} exercises left", allDone: "All exercises done",
    completeBtn: "Finish today's training",
    cancelConfirm: "Cancel this workout? Today's session and everything you entered will be deleted.",
    cancelExec: "Cancel workout", cancelBack: "Keep it", cancelLink: "Cancel this workout",
    completedBox: "Done. You can check it in the report.",
    viewReport: "View report",
    titleAltSuffix: " (alternative)",
    reportH: "Report",
    noRecords: "No records yet.",
    goWorkout: "Go to workout",
    searchPlaceholder: "Search by exercise or note", searchAria: "Search records",
    sumMonthly: "By month", sumGroups: "By muscle group",
    monthValue: "{n} sessions / {vol} reps", groupValue: "{n} times / {vol}",
    monthCount: "{n} sessions", histNewer: "Newer day", histOlder: "Older day",
    histDayView: "Daily", histMonthView: "Monthly",
    noMatch: "No matching records.",
    notePrefix: "Note: ", loadSuffix: " load",
    editRecord: "Edit record", editDoneBtn: "Done editing",
    rpeParen: "(RPE {rpe} {word})", rpePlain: "RPE {rpe} {word}",
    backHome: "← Back to home",
    profileH: "Profile (first-time setup)",
    fAge: "Age", fSex: "Sex", fHeight: "Height (cm)", fWeight: "Weight (kg)",
    sexMale: "Male", sexFemale: "Female", sexNone: "Prefer not to say",
    fNote: "Notes",
    fNoteHint: "Write anything that could affect the decisions or the menu: past conditions and injuries, regular medication, allergies, body fat, exercise habits, and so on.",
    savedIndicator: "Saved",
    languageH: "Language",
    themeH: "Theme", themeDark: "Dark", themeLight: "Light", themeSystem: "System",
    profileHistoryH: "Profile history",
    notEntered: "Not entered",
    dataH: "Data",
    dataNote: "Data is stored server-side in data/store.json.",
    dataFormats: "Export: JSON (all data, for restoring) / CSV (session records as a table, for viewing). Import: JSON only (CSV cannot be imported).",
    exportJsonBtn: "Export (JSON)", exportCsvBtn: "Export (CSV)", importBtn: "Import",
    menuDefH: "Menu definition",
    menuDefNote: "Edit the workout menu (exercises, substitutes, pain targets) as JSON. Changes apply to sessions generated afterwards; recorded sessions keep the names and targets they were created with.",
    menuDefSaveBtn: "Save", menuDefExportBtn: "Export", menuDefImportBtn: "Import", menuDefResetBtn: "Reset to defaults",
    menuDefResetArmBtn: "Tap again to reset", menuDefSaved: "Saved",
    menuDefBtn: "Edit menu",
    guideStepsH: "Steps", guideFocusH: "Focus on", guideClose: "Close", guideBtnLabel: "How to",
    importConfirmText: "Replace all current data with \"{name}\". This cannot be undone.",
    importExec: "Import", cancelBtn: "Cancel",
    fileFormatError: "The file format is not valid",
    deleteData: "Delete data",
    resetConfirmText: "Delete all data? Your profile, condition records, and session history will all be deleted and cannot be restored.",
    resetExec: "Delete all data",
    vReps: "Enter reps as an integer between 0 and 999",
    vRpe: "Enter RPE as 6–10 in 0.5 steps",
    vNote: "Keep the note within 200 characters",
    vAgeRequired: "Enter your age", vAgeRange: "Enter age as an integer between 10 and 100",
    vHeightRequired: "Enter your height", vHeightRange: "Enter height as an integer between 100 and 250 cm",
    vWeightRequired: "Enter your weight", vWeightRange: "Enter weight between 20 and 300 kg",
    vNoteField: "Keep the note within 500 characters",
    vSexInvalid: "Choose sex from the options",
  },
};
function t(key, vars) {
  let s = STR[lang]?.[key] ?? STR.ja[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}
// Display labels for the canonical Japanese data keys (parts, joints,
// muscle groups). Exercise names and variations are data and stay as-is.
const PART_EN = {
  "胸上部": "Upper chest", "胸下部": "Lower chest", "肩前部": "Front shoulders", "肩後部": "Rear shoulders",
  "上腕二頭": "Biceps", "上腕三頭": "Triceps", "前腕": "Forearms", "背中上部": "Upper back",
  "広背筋": "Lats", "脊柱起立筋": "Spinal erectors", "大腿四頭筋": "Quadriceps", "ハムストリング": "Hamstrings",
  "臀部": "Glutes", "内転筋": "Adductors", "ふくらはぎ": "Calves", "脛": "Shins", "腹筋上部": "Upper abs",
  "腹筋下部": "Lower abs", "腹斜筋": "Obliques", "体幹深部": "Deep core",
  // Pre-expansion names, still found in older records.
  "胸": "Chest", "肩": "Shoulders", "上腕": "Upper arms", "背中": "Back", "脚（前）": "Legs (front)",
  "脚（後ろ）・お尻": "Legs (back) / Glutes", "腹筋": "Abs", "体幹": "Core",
};
// The soreness grid groups the finer parts under region headings so
// the 19 tiles stay scannable; parts in no group (a custom catalog's
// own parts) collect under a trailing "other" heading.
const PART_GROUPS = [
  { ja: "上半身（押す）", en: "Upper body (push)", parts: ["胸上部", "胸下部", "肩前部", "上腕三頭"] },
  { ja: "上半身（引く）", en: "Upper body (pull)", parts: ["肩後部", "上腕二頭", "背中上部", "広背筋", "脊柱起立筋", "前腕"] },
  { ja: "脚", en: "Legs", parts: ["大腿四頭筋", "ハムストリング", "臀部", "内転筋", "ふくらはぎ", "脛"] },
  { ja: "体幹", en: "Core", parts: ["腹筋上部", "腹筋下部", "腹斜筋", "体幹深部"] },
];
const JOINT_EN = { "腰": "Lower back", "背骨": "Spine", "肩": "Shoulders", "肘": "Elbows", "手首": "Wrists", "股関節": "Hips", "膝": "Knees", "足首": "Ankles" };
const GROUP_EN = { "胸・三頭": "Chest & Triceps", "肩": "Shoulders", "脚（前）": "Legs (front)", "ふくらはぎ": "Calves", "背中": "Back", "脚（後ろ）・お尻": "Legs (back) / Glutes", "腹筋": "Abs", "体幹": "Core", "体幹（側面）": "Core (sides)", "上腕": "Upper arms", "脛": "Shins" };
const partLabel = (p) => (lang === "en" ? PART_EN[p] ?? p : p);
const jointLabel = (j) => (lang === "en" ? JOINT_EN[j] ?? j : j);
const groupLabel = (g) => (lang === "en" ? GROUP_EN[g] ?? g : g);
// The label for a pain tile: soreness keys are muscle parts, joint keys are joints.
const tileLabel = (kind, name) => (kind === "jointPain" ? jointLabel(name) : partLabel(name));
const LEVEL_WORDS = {
  ja: ["なし", "軽い", "普通", "強い", "かなり強い", "激しい"],
  en: ["None", "Mild", "Moderate", "Strong", "Very strong", "Severe"],
};
const DOW_LABELS = {
  ja: ["日", "月", "火", "水", "木", "金", "土"],
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
};
const WEEK_LABELS = {
  ja: ["月", "火", "水", "木", "金", "土", "日"],
  en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
};
const MONTH_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const RPE_VALUES = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];
const RPE_WORDS = {
  ja: { below: "とても楽", 6: "かなり楽", 6.5: "楽", 7: "やや楽", 7.5: "少しきつい", 8: "きつい", 8.5: "かなりきつい", 9: "とてもきつい", 9.5: "ほぼ限界", 10: "限界" },
  en: { below: "Extremely easy", 6: "Very easy", 6.5: "Easy", 7: "Fairly easy", 7.5: "A bit hard", 8: "Hard", 8.5: "Very hard", 9: "Extremely hard", 9.5: "Near limit", 10: "Limit" },
};
// A unit as stored ("回" / "秒") in display form for the current language.
const unitWord = (u) => (lang === "en" ? (u === "秒" ? "sec" : "reps") : u);
// Profile field labels for the change history, keyed by the stored field
// name (the label saved in the data is Japanese; display follows the UI).
const FIELD_LABELS = {
  ja: { age: "年齢", sex: "性別", heightCm: "身長", weightKg: "体重", note: "補足", bodyFatNote: "体脂肪などの補足", habitNote: "運動習慣の補足" },
  en: { age: "Age", sex: "Sex", heightCm: "Height", weightKg: "Weight", note: "Notes", bodyFatNote: "Body fat and other notes", habitNote: "Exercise habit notes" },
};
const fieldLabel = (c) => FIELD_LABELS[lang]?.[c.field] ?? c.label;
// Session title: sessions recorded under the rotation system resolve
// their base title from the catalog's legacy rotation titles; newer
// sessions store a title composed from movement patterns, translated
// token by token for English. In both cases the stored title only
// decides the "(alternative)" suffix. The rotation letter (A / B / C)
// is internal data and is NOT shown.
const PATTERN_TOKENS = { "押す": "Push", "引く": "Pull", "脚": "Legs", "体幹": "Core", "全身": "Full body" };
function sessionTitle(s) {
  const rot = state?.catalog?.rotations?.find((r) => r.id === s.rotation);
  let base = rot ? rot.title : s.title.replace(/（代替）$/, "").replace(/\(alternative\)$/, "");
  if (!rot && lang === "en") base = base.split(" + ").map((tok) => PATTERN_TOKENS[tok] ?? tok).join(" + ");
  const alt = s.title.endsWith("（代替）") || s.title.endsWith("(alternative)");
  return `${base}${alt ? t("titleAltSuffix") : ""}`;
}
// Strings that live in index.html (tabs, header) are re-applied on
// every render, so a language switch needs no reload.
function applyStatic() {
  document.documentElement.lang = lang === "en" ? "en" : "ja";
  document.title = t("appTitle");
  document.querySelectorAll("#tabs button").forEach((b) => { b.textContent = t(`tab_${b.dataset.view}`); });
  const setText = (id, key) => { const el = document.getElementById(id); if (el) el.textContent = t(key); };
  setText("ah-purpose", "purpose");
  setText("ah-total-label", "totalLabel");
  setText("ah-total-unit", "totalUnit");
  const gear = document.getElementById("gear");
  if (gear) { gear.setAttribute("aria-label", t("gear")); gear.title = t("gear"); }
}

// ---------- colour theme (dark / light / system) ----------
// The setting ("dark" | "light" | "system") lives in the server store
// (state.theme; absent means "system") like the language. The resolved
// theme is applied as <html data-theme="dark|light">, which selects
// the CSS token set. The setting is mirrored to localStorage so
// index.html can apply it before first paint (no flash); on load the
// server value wins and re-syncs the mirror. While the setting is
// "system", an OS colour-scheme change re-resolves immediately.
let themeSetting = "system";
const THEME_MIRROR_KEY = "btl-theme";
function resolvedTheme() {
  if (themeSetting === "dark" || themeSetting === "light") return themeSetting;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}
function applyTheme() {
  const r = resolvedTheme();
  document.documentElement.dataset.theme = r;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = r === "dark" ? "#0f0f0f" : "#f2f2f0";
  try { localStorage.setItem(THEME_MIRROR_KEY, themeSetting); } catch { /* mirror is best-effort */ }
}
window.matchMedia("(prefers-color-scheme: light)").addEventListener?.("change", () => {
  if (themeSetting === "system") applyTheme();
});

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
let histSessionId = null; // report screen: session shown in the day pager (null = newest)
let reportView = "day"; // report screen: "day" (trend + pager) or "month" (monthly + muscle-group charts)
let profileSaveTimer = null; // settings: pending profile-autosave debounce timer
let profileError = ""; // settings: last autosave error, shown in place under the form
let profileSavedShow = false; // settings: whether the 保存済み indicator is shown
let guideFor = null; // workout tab: baseId whose how-to window is open, or null
let menuDefText = null; // settings: menu-definition JSON text (null = not loaded yet)
let menuDefLoading = false; // settings: a /api/catalog fetch is in flight
let menuDefError = ""; // settings: last menu-definition save/import error
let menuDefSavedShow = false; // settings: whether the menu 保存しました indicator is shown
let menuDefResetArm = false; // settings: two-step reset-to-defaults confirmation state
let scrollToMenuDef = false; // navigation: scroll to the menu-definition section on arrival

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
  flushProfileSave(); // a pending profile autosave fires before the form unmounts
  if (v === view) { render(); return; }
  scrollByKey[navKey] = window.scrollY;
  view = v; menuCancelArm = false; menuGenError = "";
  navKey = ++navKeySeq;
  history.pushState({ v, k: navKey }, "", VIEW_PATHS[v]);
  render();
  window.scrollTo(0, 0);
  syncGear();
}
window.addEventListener("popstate", (e) => {
  flushProfileSave(); // same as go(): do not lose a pending autosave
  const v = e.state?.v ?? PATH_VIEWS[location.pathname] ?? "pain";
  scrollByKey[navKey] = window.scrollY;
  navKey = e.state?.k ?? 0;
  view = v; menuCancelArm = false; menuGenError = "";
  render();
  const y = scrollByKey[navKey] ?? 0;
  requestAnimationFrame(() => { window.scrollTo(0, y); syncGear(); });
});

// ---------- settings gear: every view, only at the very top ----------
// The gear is present on all four views, but shown only while the page
// is scrolled to the very top (a few px of tolerance for fractional /
// rubber-band offsets). Scrolling down hides it (the .gear-hidden
// state fades it out and takes no taps); returning to the top shows
// it again. The state follows the scroll position itself, so view
// switches and per-entry scroll restoration stay in sync through the
// scroll events they cause; go(), popstate and render() also sync
// explicitly so the resting state is never stale.
const GEAR_TOP_PX = 4;
function syncGear() {
  const gear = document.getElementById("gear");
  if (gear) gear.classList.toggle("gear-hidden", window.scrollY > GEAR_TOP_PX);
}
window.addEventListener("scroll", syncGear, { passive: true });
window.addEventListener("resize", syncGear);
syncGear();
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
// Capture edits on workout cards only: a card counts as a workout
// card when it carries the menu save button (data-save-ex) — the
// report's edit cards share the layout but are never drafted, and
// settings fields are not in cards at all.
function captureDraft(e) {
  const el = e.target;
  if (!(el instanceof Element) || !menuSession()) return;
  const card = el.closest(".ex-card"); if (!card) return;
  if (!card.querySelector("[data-save-ex]")) return;
  const field = el.closest("[data-set],[data-rpe],[data-note]"); if (!field) return;
  const tag = field.dataset.set ?? field.dataset.rpe ?? field.dataset.note;
  const exId = Number(String(tag).split(":")[0]);
  // Plain sets draft as raw strings; a unilateral set drafts as an
  // {l, r} pair of raw strings, mirroring the stored pair shape.
  const byIdx = new Map();
  card.querySelectorAll("[data-set]").forEach((i) => {
    const idx = Number(i.dataset.set.split(":")[1]);
    if (i.dataset.side) {
      const cur = byIdx.get(idx) ?? {};
      cur[i.dataset.side] = i.value;
      byIdx.set(idx, cur);
    } else byIdx.set(idx, i.value);
  });
  const sets = [...byIdx.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v);
  const rpeEl = card.querySelector("[data-rpe]");
  const noteEl = card.querySelector("[data-note]");
  const d = readDrafts();
  d[exId] = { sets, rpe: rpeEl ? rpeEl.value : "", note: noteEl ? noteEl.value : "" };
  writeDrafts(d);
}

const $app = document.getElementById("app");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
// ---------- logged-set helpers (plain counts and left/right pairs) ----------
// A stored set is a plain number, or — for unilateral exercises — a
// {l, r} pair. The exercise total is the sum of both sides; a legacy
// plain number on a unilateral card reads as that value on each side.
const setSum = (v) => (typeof v === "number" ? v : v.l + v.r);
const isUni = (ex) => {
  const cat = state?.catalog;
  if ((cat?.unilateral ?? []).includes(ex.baseId)) return true;
  const from = cat?.unilateralFrom?.[ex.baseId];
  return from != null && (ex.ladderIndex ?? 0) >= from;
};
const sideVal = (v, side) => (typeof v === "number" ? v : v[side]);
// One set in report text: a pair shows as 左11 / 右10 (L / R in English).
const setText = (ex, v) => (isUni(ex) && typeof v !== "number"
  ? `${t("sideLeft")}${v.l} / ${t("sideRight")}${v.r}` : String(v));
async function api(path, body) {
  let res;
  try {
    res = await fetch(path, body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {});
  } catch { throw new Error(t("networkError")); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  if (data.today) state = data;
  if (data.lang) lang = data.lang;
  if (data.theme) { themeSetting = data.theme; applyTheme(); }
  return data;
}
async function load() {
  let res;
  try { res = await fetch("/api/state"); } catch { throw new Error(t("networkError")); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || t("loadFailedDefault"));
  state = data;
  lang = data.lang ?? "ja";
  themeSetting = data.theme ?? "system";
  applyTheme();
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
  $app.innerHTML = `<p class="error">${esc(e.message)}</p><p class="small">${esc(t("serverHint"))}</p><button class="cta" id="reloadBtn">${esc(t("reload"))}</button>`;
  document.getElementById("reloadBtn").addEventListener("click", () => {
    $app.innerHTML = `<p>${esc(t("loading"))}</p>`;
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
    err.textContent = e.message || t("saveFailedRetry");
    return false;
  } finally { if (btn.isConnected) btn.disabled = false; }
}
document.getElementById("tabs").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-view]"); if (!b) return;
  go(b.dataset.view);
});
document.getElementById("gear").addEventListener("click", () => { go("settings"); });
// (The report screen's free-word search went away with the day pager:
// one day at a time, reached by swiping or the trend chart.)
$app.addEventListener("input", captureDraft);
$app.addEventListener("change", captureDraft);

function tapGrid(kind, parts, current) {
  const words = LEVEL_WORDS[lang];
  return `<div class="tapgrid">${parts.map((p) => {
    const lv = current[p] || 0;
    const ticks = Array.from({ length: 5 }, (_, i) => `<i class="${i < lv ? "on" : ""}"></i>`).join("");
    const label = tileLabel(kind, p);
    return `<button class="tap lv${lv}" data-tap="${kind}:${esc(p)}" aria-label="${esc(t("levelAria", { part: label, lv, word: words[lv] }))}">
      <span class="tap-row"><span class="tap-name">${esc(label)}</span><b class="num tap-num">${lv}</b></span>
      <span class="tap-row"><span class="tap-word">${words[lv]}</span><span class="ticks">${ticks}</span></span>
    </button>`;
  }).join("")}</div>`;
}

// The soreness grid with region headings (PART_GROUPS). Parts the
// catalog lists but no group claims are shown under a final heading,
// so a custom catalog's parts never silently disappear.
function tapGridGrouped(kind, parts, current) {
  const claimed = new Set(PART_GROUPS.flatMap((g) => g.parts));
  const sections = PART_GROUPS
    .map((g) => ({ label: lang === "en" ? g.en : g.ja, parts: g.parts.filter((p) => parts.includes(p)) }))
    .filter((s) => s.parts.length > 0);
  const rest = parts.filter((p) => !claimed.has(p));
  if (rest.length > 0) sections.push({ label: lang === "en" ? "Other" : "その他", parts: rest });
  if (sections.length <= 1) return tapGrid(kind, parts, current);
  return sections.map((s) => `<div class="tapgroup-h">${esc(s.label)}</div>${tapGrid(kind, s.parts, current)}`).join("");
}

// ---------- dates ----------
// Dates are YYYY-MM-DD (Asia/Tokyo). Weekday math is done on UTC day numbers
// so the browser's own timezone cannot shift the day.
const DAY_MS = 86400000;
const dayNum = (d) => { const [y, m, dd] = d.split("-").map(Number); return Date.UTC(y, m - 1, dd) / DAY_MS; };
const dowOf = (d) => DOW_LABELS[lang][(dayNum(d) + 4) % 7]; // (n+4)%7: 0=Sunday
// Header date form: ja "M/D（曜）", en "M/D (Dow)".
function headerDate(d) {
  const dt = new Date(dayNum(d) * DAY_MS);
  const base = `${dt.getUTCMonth() + 1}/${dt.getUTCDate()}`;
  return lang === "en" ? `${base} (${dowOf(d)})` : `${base}（${dowOf(d)}）`;
}
// History date form: "MM/DD(曜)" / "MM/DD(Dow)", zero-padded.
function histDate(d) {
  return `${d.slice(5, 7)}/${d.slice(8, 10)}(${dowOf(d)})`;
}
// ---------- app header (date + purpose / Day + cumulative reps) ----------
function updateHeader() {
  const dateEl = document.getElementById("ah-date");
  if (!dateEl || !state) return;
  const n = dayNum(state.today);
  dateEl.textContent = headerDate(state.today);
  const dates = state.sessions.map((s) => s.date).sort();
  const dayCount = dates.length ? Math.round(n - dayNum(dates[0])) + 1 : 1;
  document.getElementById("ah-day").textContent = dayCount;
  // Cumulative total = the load score across all recorded sessions
  // (never a mixed reps-plus-seconds sum).
  document.getElementById("ah-reps").textContent = state.stats.totalLoad ?? 0;
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
  const labels = WEEK_LABELS[lang];
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
    <div class="gauge2-center"><div class="num gauge2-num">${done}</div><div class="gauge2-sub">${esc(t("gaugeSub", { total }))}</div></div></div>`;
}
// Three metrics divided by hairlines: exercise count / completed sets over
// total sets / cumulative completed sessions.
function menuMetrics(s) {
  const totalSets = s.exercises.reduce((a, e) => a + e.targetSets, 0);
  const doneSets = s.exercises.reduce((a, e) => a + (e.completed ? e.targetSets : e.loggedSets.filter((v) => setSum(v) > 0).length), 0);
  return `<div class="menu-metrics">
    <div class="mmetric"><div class="m-num num">${s.exercises.length}</div><div class="m-label">${esc(t("metricExercises"))}</div></div>
    <div class="mmetric"><div class="m-num num">${doneSets}/${totalSets}</div><div class="m-label">${esc(t("metricSets"))}</div></div>
    <div class="mmetric"><div class="m-num num">${state.stats.totalCompleted}</div><div class="m-label">${esc(t("metricSessions"))}</div></div>
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
  const tm = timers[ex.id];
  if (tm) syncTimer(tm); // a re-render must not show a stale remainder
  const total = tm ? tm.total : ex.targetReps;
  const rem = tm ? tm.remaining : ex.targetReps;
  const pct = total > 0 ? (rem / total) * 100 : 0;
  return `<div class="timer${tm && tm.done ? " done" : ""}" id="timer-${ex.id}">
    <div class="timer-display"><span class="num" id="tdisp-${ex.id}">${rem}</span><small> ${esc(unitWord("秒"))}</small></div>
    <div class="timer-bar"><div class="timer-fill" id="tbar-${ex.id}" style="width:${pct}%"></div></div>
    <div class="timer-btns"><button class="btn" data-timer-start="${ex.id}">${esc(t("timerStart"))}</button><button class="btn" data-timer-pause="${ex.id}">${esc(t("timerPause"))}</button><button class="btn" data-timer-reset="${ex.id}">${esc(t("timerReset"))}</button></div>
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
  const painCta = completedToday ? t("ctaResults") : t("ctaSaveStart");
  return `
  ${!state.profile ? `<div class="warn">${esc(t("profileMissing"))}</div>` : ""}
  <h2>${esc(t("warnSignsH"))}</h2>
  <p class="desc">${esc(t("warnSignsDesc"))}</p>
  <div class="chips">${state.catalog.redFlags.map((f) => `<button type="button" class="chip${flags.includes(f.id) ? " on" : ""}" data-flagchip="${f.id}" aria-pressed="${flags.includes(f.id)}">${esc(f.label)}</button>`).join("")}</div>
  <h2>${esc(t("sorenessH"))}</h2>
  <p class="desc">${esc(t("sorenessDesc"))}</p>
  <div class="badges"><span class="badge">${esc(t("badgeNormal"))}</span><span class="badge">${esc(t("badgeReduce"))}</span><span class="badge">${esc(t("badgeExclude"))}</span><span class="badge">${esc(t("badgeRest"))}</span></div>
  ${tapGridGrouped("soreness", state.catalog.muscleParts, soreness)}
  <h2>${esc(t("jointH"))}</h2>
  <p class="desc">${esc(t("jointDesc"))}</p>
  <div class="badges"><span class="badge">${esc(t("badgeNormal"))}</span><span class="badge">${esc(t("badgeReduce"))}</span><span class="badge">${esc(t("badgeExclude"))}</span><span class="badge">${esc(t("badgeSign"))}</span></div>
  ${tapGrid("jointPain", state.catalog.joints, jointPain)}
  <button class="cta" id="savePain">${esc(painCta)}</button>
  ${a ? (a.care ? `<div class="warn">${esc(t("carePrefix"))}${esc(a.careReasons.join(" / "))}</div>`
      : a.rest ? `<div class="warn">${esc(t("restPrefix"))}${esc(a.restReason)}</div>`
      : `<div class="ok">${esc(t("okPrefix"))}${esc(a.parts.flatMap((p) => p.reasons).join(" / "))}</div>`) : ""}
  ${(state.guidance ?? []).map((g) => `<div class="caution">${esc(g.message)}</div>`).join("")}
`;
}
function collectExercise(root, ex) {
  const loggedSets = ex.loggedSets.map((_, i) => {
    // Unilateral card: two inputs (data-side="l" / "r") per set, read
    // back as a pair. A missing side keeps the stored side value.
    if (isUni(ex)) {
      const get = (side) => {
        const el = root.querySelector(`[data-set="${ex.id}:${i}"][data-side="${side}"]`);
        return el ? Number(sanitizeDigits(el.value) || 0) : sideVal(ex.loggedSets[i], side);
      };
      return { l: get("l"), r: get("r") };
    }
    const el = root.querySelector(`[data-set="${ex.id}:${i}"]`);
    return el ? Number(sanitizeDigits(el.value) || 0) : ex.loggedSets[i];
  });
  const rpeEl = root.querySelector(`[data-rpe="${ex.id}"]`);
  const noteEl = root.querySelector(`[data-note="${ex.id}"]`);
  // The unified card has no completion checkbox: the menu save marks
  // the exercise completed (its handler), a report edit keeps the
  // stored flag.
  return { loggedSets, rpe: rpeEl && rpeEl.value !== "" ? Number(rpeEl.value) : null, completed: ex.completed, note: noteEl ? noteEl.value : ex.note };
}
// Client-side mirror of the server validation (src/validate.ts). The server
// re-checks everything and answers 400 with the reason; checking here first
// shows the same reason in the button's error line without a round trip.
// Each returns a short reason string, or null when the input is valid.
// The reason texts are the dictionary's, matching the server's per language.
const NOTE_MAX_LEN = 200;
const PROFILE_NOTE_MAX_LEN = 500; // the merged profile note's cap (server: NOTE_FIELD_MAX)
function validateExerciseData(d) {
  for (const v of d.loggedSets) {
    const vals = typeof v === "number" ? [v] : (v && typeof v === "object" ? [v.l, v.r] : [NaN]);
    for (const x of vals) if (!Number.isInteger(x) || x < 0 || x > 999) return t("vReps");
  }
  if (d.rpe != null && !(typeof d.rpe === "number" && d.rpe >= 6 && d.rpe <= 10 && Number.isInteger(d.rpe * 2))) return t("vRpe");
  if (typeof d.note === "string" && d.note.length > NOTE_MAX_LEN) return t("vNote");
  return null;
}
function validateProfileData(v) {
  const num = (s) => { const t2 = String(s).trim(); return t2 === "" ? null : Number(t2); };
  const age = num(v.age);
  if (age === null || Number.isNaN(age)) return t("vAgeRequired");
  if (!Number.isInteger(age) || age < 10 || age > 100) return t("vAgeRange");
  const h = num(v.heightCm);
  if (h === null || Number.isNaN(h)) return t("vHeightRequired");
  if (!Number.isInteger(h) || h < 100 || h > 250) return t("vHeightRange");
  const w = num(v.weightKg);
  if (w === null || Number.isNaN(w)) return t("vWeightRequired");
  if (Number.isNaN(w) || w < 20 || w > 300) return t("vWeightRange");
  if (!["男性", "女性", ""].includes(v.sex)) return t("vSexInvalid");
  if (v.note.length > PROFILE_NOTE_MAX_LEN) return t("vNoteField");
  return null;
}
// Profile autosave (settings): there is no save button — edits are
// debounce-saved (see bind) and a view change flushes a pending save
// (go / popstate call flushProfileSave before the form unmounts; the
// values are read synchronously, before the first await). Validation
// runs first: an invalid form is NOT saved and the reason shows in
// place. On success only the small 保存済み indicator flips — the form
// itself is never re-rendered, so focus and input are never lost.
async function saveProfileAuto() {
  const el = (id) => document.getElementById(id);
  if (!el("pf-age")) return; // the settings view is gone; nothing to read
  const values = { age: el("pf-age").value, sex: el("pf-sex").value, heightCm: el("pf-height").value, weightKg: el("pf-weight").value, note: el("pf-note").value };
  const errEl = el("profileErr");
  const showErr = (msg) => { profileError = msg; if (errEl) errEl.textContent = msg; };
  const err = validateProfileData(values);
  if (err) { showErr(err); return; }
  try {
    await api("/api/profile", values);
    profileError = ""; profileSavedShow = true;
    if (errEl) errEl.textContent = "";
    const ind = el("profileSaved"); if (ind) ind.hidden = false;
  } catch (e) { showErr(e.message); }
}
function flushProfileSave() {
  if (profileSaveTimer === null) return;
  clearTimeout(profileSaveTimer); profileSaveTimer = null;
  void saveProfileAuto();
}
// Menu-screen exercise card, laid out like the original space: muscle
// group small at the top-left, the variation as the big heading, target
// line and form cue in gray, the total target at the top-right. Set inputs
// are black boxes in an even row; RPE is a black select; the per-exercise
// note sits over a full-width teal record button.
// RPE select options: exactly these ten entries, each shown as
// "value（word）" (also while selected); the saved value is the bare number.
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
// The one exercise-card renderer, shared by the workout screen and
// the report's record editing: same heading / target / cue block, the
// same "{n}セット目" black-box set inputs, the same ten-option RPE
// select, and the same note field, with a per-card save button. In
// history mode the initial values are the recorded ones, the timer is
// not shown, and the save button writes through the record endpoint
// (data-save-history-ex) instead of the workout one.
function menuExerciseCard(s, ex, opts = {}) {
  const historyMode = !!opts.history;
  const recorded = ex.completed || ex.rpe != null || ex.loggedSets.some((v) => setSum(v) !== 0);
  // An unrecorded workout card restores its unsaved draft (see the
  // draft helpers); a recorded card — and every history-edit card —
  // shows the saved server values.
  const draft = recorded || historyMode ? null : readDrafts()[ex.id];
  const uni = isUni(ex);
  const setInput = (i, side, shown) => `<input class="set-input" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" data-set="${ex.id}:${i}"${side ? ` data-side="${side}"` : ""} value="${esc(shown)}" placeholder="0" aria-label="${esc(ex.variation || ex.name)} ${esc(t("setLabel", { n: i + 1 }))}${side ? ` ${esc(side === "l" ? t("sideLeft") : t("sideRight"))}` : ""}">`;
  const sets = ex.loggedSets.map((v, i) => {
    const label = `<div class="set-label">${esc(t("setLabel", { n: i + 1 }))}</div>`;
    if (uni) {
      // Two inputs per set, left and right. A recorded pair shows its
      // sides (a legacy plain number shows on both sides); an
      // unrecorded set starts from the draft sides or the target.
      const d = draft && i < draft.sets.length && draft.sets[i] && typeof draft.sets[i] === "object" ? draft.sets[i] : null;
      const shownSide = (side) => recorded
        ? (sideVal(v, side) === 0 ? "" : sideVal(v, side))
        : (d && d[side] !== undefined ? d[side] : ex.targetReps);
      return `<div class="set-cell">${label}<div class="set-pair"><label class="set-side"><span>${esc(t("sideLeft"))}</span>${setInput(i, "l", shownSide("l"))}</label><label class="set-side"><span>${esc(t("sideRight"))}</span>${setInput(i, "r", shownSide("r"))}</label></div></div>`;
    }
    const shown = recorded ? (v === 0 ? "" : v) : (draft && i < draft.sets.length ? draft.sets[i] : ex.targetReps);
    return `<div class="set-cell">${label}${setInput(i, null, shown)}</div>`;
  }).join("");
  // Initial RPE selection: a draft wins, then the saved value, then —
  // for an unrecorded workout card — the previous recorded RPE of this
  // exercise. A history-edit card shows exactly the recorded value.
  const selRpe = historyMode ? ex.rpe : (draft ? (draft.rpe === "" ? null : Number(draft.rpe)) : (ex.rpe ?? lastRpeFor(ex)));
  const words = RPE_WORDS[lang];
  const rpeOptions = [`<option value=""${selRpe == null ? " selected" : ""}>${esc(t("rpeNone"))}</option>`]
    .concat(RPE_VALUES.map((v) => `<option value="${v}"${selRpe === v ? " selected" : ""}>${v}（${words[v]}）</option>`)).join("");
  const totalTarget = ex.targetReps * ex.targetSets;
  return `<div class="card ex-card">
    <div class="ex-head"><div class="ex-head-left">
      <div class="ex-part">${esc(groupLabel(ex.muscleGroup))}</div>
      <div class="ex-title-row"><h3 class="ex-title">${esc(ex.variation || ex.name)}</h3>${historyMode ? "" : `<button class="info-btn" type="button" data-guide="${esc(ex.baseId)}" aria-label="${esc(t("guideBtnLabel"))}">i</button>`}</div>
      <div class="ex-target-line">${esc(t("targetLine", { sets: ex.targetSets, reps: ex.targetReps, unit: unitWord(ex.targetUnit) }))}</div>
      ${historyMode ? `<p class="ex-cue">${esc(ex.cue)}</p>` : ""}
    </div>
    <div class="ex-total"><div class="num">${totalTarget}</div><div class="ex-total-label">${esc(t("totalLabelUnit", { unit: unitWord(ex.targetUnit) }))}</div></div></div>
    <div class="set-grid">${sets}</div>
    <hr class="ex-divider">
    <div class="rpe-row"><label for="rpe-${ex.id}">${esc(t("rpeLabel"))}</label><select class="rpe-select" id="rpe-${ex.id}" data-rpe="${ex.id}">${rpeOptions}</select></div>
    <label class="note-label" for="note-${ex.id}">${esc(t("noteLabel"))}</label>
    <input class="note-input" id="note-${ex.id}" type="text" data-note="${ex.id}" placeholder="${esc(t("notePlaceholder"))}" value="${esc(draft ? draft.note : ex.note)}">
    <div class="note-hint">${esc(t("noteHint"))}</div>
    ${!historyMode && ex.targetUnit === "秒" ? timerHtml(ex) : ""}
    <button class="cta ex-save" ${historyMode ? `data-save-history-ex="${s.id}:${ex.id}"` : `data-save-ex="${s.id}:${ex.id}"`}>${esc(recorded ? t("updateRecord") : t("saveAndDone"))}</button>
  </div>`;
}
// The how-to window for one exercise, opened from the i button next to
// its name: the steps and the body part to focus on, from the catalog's
// guide data (so it follows the user's own menu definition).
function guideModal(s) {
  if (!guideFor) return "";
  const ex = s.exercises.find((e) => e.baseId === guideFor);
  const g = state.catalog.guides?.[guideFor];
  if (!ex || !g) return "";
  return `<div class="guide-overlay" id="guideOverlay"><div class="guide-window" role="dialog" aria-modal="true">
    <div class="guide-head"><h3>${esc(ex.variation || ex.name)}</h3><button class="guide-close" type="button" id="guideClose" aria-label="${esc(t("guideClose"))}">×</button></div>
    <h4>${esc(t("guideStepsH"))}</h4>
    <ol class="guide-steps">${g.steps.map((st) => `<li>${esc(st)}</li>`).join("")}</ol>
    <h4>${esc(t("guideFocusH"))}</h4>
    <p class="guide-focus">${esc(g.focus)}</p>
  </div></div>`;
}
function renderMenu() {
  const s = menuSession();
  if (!s) {
    // No condition recorded today yet: this guidance takes priority over
    // the generate-session guidance.
    if (!state.pain) return `<p>${esc(t("noCondition"))}</p><button class="cta" id="goCond">${esc(t("goCondition"))}</button><p class="menu-def-nav"><button class="btn" type="button" id="goMenuDef">${esc(t("menuDefBtn"))}</button></p>`;
    return `<p>${esc(t("noSession"))}</p><button class="cta" id="gen">${esc(t("createWorkout"))}</button><p id="genErr" class="error">${esc(menuGenError)}</p><p class="menu-def-nav"><button class="btn" type="button" id="goMenuDef">${esc(t("menuDefBtn"))}</button></p>`;
  }
  const remaining = s.exercises.filter((e) => !e.completed).length;
  // An unfinished session from an earlier day keeps its own date: the
  // title block names that date (header date form) so it can never be
  // mistaken for a session of the new day.
  const pastDate = s.date !== state.today
    ? `<div class="menu-date">${esc(t("pastSession", { date: headerDate(s.date) }))}</div>` : "";
  return `${weekDots()}
  ${ringGauge(s)}
  <div class="menu-title"><h2 class="menu-session-title">${esc(sessionTitle(s))}</h2>
  ${pastDate}
  <div class="menu-remain">${remaining > 0 ? esc(t("remain", { n: remaining })) : esc(t("allDone"))}</div></div>
  ${menuMetrics(s)}
  ${s.exercises.map((ex) => menuExerciseCard(s, ex)).join("")}
  ${s.status !== "completed" ? `<div class="card finish-card"><button class="cta" id="complete">${esc(t("completeBtn"))}</button>
    ${menuCancelArm ? `<div class="cancel-confirm"><p>${esc(t("cancelConfirm"))}</p><div class="cancel-btns"><button class="btn danger-solid" id="cancelExec">${esc(t("cancelExec"))}</button><button class="btn" id="cancelBack">${esc(t("cancelBack"))}</button></div></div>`
      : `<button class="cancel-link" id="cancelMenu">${esc(t("cancelLink"))}</button>`}</div>`
    : `<div class="ok">${esc(t("completedBox"))}</div><button class="cta" id="goReport">${esc(t("viewReport"))}</button>`}
  ${s.progressionNotes.length ? `<div class="adj-notes"><ul>${s.progressionNotes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul></div>` : ""}
  <p class="menu-def-nav"><button class="btn" type="button" id="goMenuDef">${esc(t("menuDefBtn"))}</button></p>
  ${guideModal(s)}`;
}
// RPE number -> the word the original space shows next to it.
function rpeWord(rpe) {
  if (rpe == null) return "";
  const w = RPE_WORDS[lang];
  if (rpe >= 10) return w[10];
  if (rpe >= 9.5) return w[9.5];
  if (rpe >= 9) return w[9];
  if (rpe >= 8.5) return w[8.5];
  if (rpe >= 8) return w[8];
  if (rpe >= 7.5) return w[7.5];
  if (rpe >= 7) return w[7];
  if (rpe >= 6.5) return w[6.5];
  if (rpe >= 6) return w[6];
  return w.below;
}
// ---------- report summaries + search ----------
// Monthly totals (newest month first) and per-muscle-group totals,
// computed from the recorded sessions on the client. A session counts
// toward a muscle group once per exercise actually performed
// (completed, or with any set logged above zero); the group total is
// the raw sum of logged sets (seconds for timed exercises).
function monthLabel(key) {
  const y = Number(key.slice(0, 4)), m = Number(key.slice(5, 7));
  return lang === "en" ? `${MONTH_EN[m - 1]} ${y}` : `${y}年${m}月`;
}
// ---------- report graphs + day pager ----------
// The report is graphs, not a vertical list: monthly totals as a
// vertical bar chart, per-muscle-group totals as horizontal bars, and
// the per-day detail in a pager — one day at a time, changed by
// swiping left/right, by the ‹ › buttons, or by tapping a bar in the
// per-day trend chart. Sessions are newest first in state.sessions.
function historySummariesHtml() {
  const months = new Map();
  for (const s of state.sessions) {
    const k = s.date.slice(0, 7);
    const m = months.get(k) ?? { n: 0, vol: 0 };
    m.n++; m.vol += s.load ?? 0; months.set(k, m);
  }
  const monthList = [...months.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const monthMax = Math.max(1, ...monthList.map(([, m]) => m.vol));
  const monthBars = monthList.map(([k, m]) => `<div class="vbar-col"><div class="vbar-val num">${m.vol}</div><div class="vbar" style="height:${Math.max(3, Math.round((m.vol / monthMax) * 100))}%"></div><div class="vbar-label">${esc(monthLabel(k))}<br>${esc(t("monthCount", { n: m.n }))}</div></div>`).join("");
  const groups = new Map();
  for (const s of state.sessions) for (const e of s.exercises) {
    if (!e.completed && !e.loggedSets.some((v) => setSum(v) > 0)) continue;
    const g = groups.get(e.muscleGroup) ?? { n: 0, vol: 0 };
    g.n++; g.vol += e.load ?? 0; groups.set(e.muscleGroup, g);
  }
  const groupList = [...groups.entries()].sort((a, b) => b[1].vol - a[1].vol);
  const groupMax = Math.max(1, ...groupList.map(([, v]) => v.vol));
  const groupRows = groupList.map(([g, v]) => `<div class="hbar-row"><div class="hbar-label">${esc(groupLabel(g))}</div><div class="hbar-track"><div class="hbar" style="width:${Math.max(2, Math.round((v.vol / groupMax) * 100))}%"></div></div><div class="hbar-val num">${v.vol}</div></div>`).join("");
  return `<h3 class="sum-head">${esc(t("sumMonthly"))}</h3><div class="vchart">${monthBars}</div><h3 class="sum-head">${esc(t("sumGroups"))}</h3><div class="hchart">${groupRows}</div>`;
}
// The day pager's current session: the one the user picked, else the
// newest. Falls back to the newest when the picked one is gone.
function histCurrent() {
  const list = state.sessions;
  let idx = histSessionId == null ? 0 : list.findIndex((s) => s.id === histSessionId);
  if (idx < 0) idx = 0;
  return { s: list[idx], idx, total: list.length };
}
// Trend chart: one bar per recorded day, oldest on the left, the
// pager's current day in the accent colour; tapping a bar jumps there.
// It sits at the very top of the report, above the monthly chart.
function trendChartHtml(curId) {
  const days = [...state.sessions].reverse(); // chronological
  const max = Math.max(1, ...days.map((s) => s.load ?? 0));
  const bars = days.map((s) => `<button type="button" class="trend-bar${s.id === curId ? " cur" : ""}" data-hist-day="${s.id}" title="${esc(histDate(s.date))}" aria-label="${esc(histDate(s.date))}"><span class="trend-fill" style="height:${Math.max(4, Math.round(((s.load ?? 0) / max) * 100))}%"></span></button>`).join("");
  return `<div class="trend" id="histTrend">${bars}</div>`;
}
function histDayHtml() {
  const { s, idx, total } = histCurrent();
  const editing = editingHist.has(s.id);
  const head = `<div class="pager-head">
    <button type="button" class="pager-btn" id="histOlder" aria-label="${esc(t("histOlder"))}"${idx === total - 1 ? " disabled" : ""}>‹</button>
    <div class="pager-title"><div class="pager-date num">${histDate(s.date)}</div><div class="pager-rot">${esc(sessionTitle(s))}</div><div class="pager-pos">${idx + 1} / ${total}</div></div>
    <button type="button" class="pager-btn" id="histNewer" aria-label="${esc(t("histNewer"))}"${idx === 0 ? " disabled" : ""}>›</button>
  </div>`;
  if (editing) {
    return `${head}<div class="pager-day">${s.exercises.map((ex) => menuExerciseCard(s, ex, { history: true })).join("")}<button class="edit-btn" data-exit-history="${s.id}">${esc(t("editDoneBtn"))}</button></div>`;
  }
  // Supplementary performed amounts for the day page, kept in their
  // own units — reps and seconds are never added together.
  const repsSecondsText = (sess) => {
    let reps = 0, secs = 0;
    for (const e of sess.exercises) {
      const sum = e.loggedSets.reduce((a, v) => a + setSum(v), 0);
      if (e.targetUnit === "秒") secs += sum; else reps += sum;
    }
    const parts = [];
    if (reps > 0) parts.push(`${reps}回`);
    if (secs > 0) parts.push(`${secs}秒`);
    return parts.join(" + ");
  };
  const totals = s.exercises.map((ex) => ({ ex, v: ex.loggedSets.reduce((a, v) => a + setSum(v), 0), t: (ex.targetReps ?? 0) * (ex.targetSets ?? 0) }));
  const max = Math.max(1, ...totals.map((x) => x.v));
  const rows = totals.map(({ ex, v, t }) => {
    const rpe = ex.rpe != null ? esc(t("rpePlain", { rpe: ex.rpe, word: rpeWord(ex.rpe) })) : "";
    // The bar fills toward the exercise's target (targetReps × sets):
    // full width means the target was reached. The value shows the
    // numbers themselves, performed/target. Exercises recorded
    // without a target fall back to relative-to-largest.
    const pct = t > 0 ? Math.min(100, (v / t) * 100) : (v / max) * 100;
    const val = t > 0 ? `${v}/${t}` : `${v}`;
    return `<div class="hbar-row"><div class="hbar-label">${esc(ex.variation || ex.name)}<span class="ex-sub rpe-line">${rpe}</span></div><div class="hbar-track"><div class="hbar" style="width:${Math.max(2, Math.round(pct))}%"></div></div><div class="hbar-val num">${val}<span class="hbar-unit">${esc(unitWord(ex.targetUnit))}</span></div></div>${ex.note ? `<div class="ex-memo">${esc(t("notePrefix"))}${esc(ex.note)}</div>` : ""}`;
  }).join("");
  return `${head}<div class="pager-day" id="pagerDay">
    <div class="pager-total"><span class="num">${s.load ?? 0}</span>${esc(t("loadSuffix"))}</div>
    ${repsSecondsText(s) ? `<div class="pager-sub">${esc(repsSecondsText(s))}</div>` : ""}
    <div class="hchart">${rows}</div>
    <button class="edit-btn" data-edit-history="${s.id}">${esc(t("editRecord"))}</button>
  </div>`;
}
function renderHistory() {
  if (!state.sessions.length) return `<h2>${esc(t("reportH"))}</h2><p>${esc(t("noRecords"))}</p><button class="cta" id="histGoMenu">${esc(t("goWorkout"))}</button>`;
  const toggle = `<div class="seg" role="group" aria-label="${esc(t("reportH"))}">
    <button type="button" class="seg-btn${reportView === "day" ? " on" : ""}" data-report-view="day">${esc(t("histDayView"))}</button>
    <button type="button" class="seg-btn${reportView === "month" ? " on" : ""}" data-report-view="month">${esc(t("histMonthView"))}</button>
  </div>`;
  if (reportView === "month") {
    return `<h2>${esc(t("reportH"))}</h2>
  ${toggle}
  <div id="histSummaries">${historySummariesHtml()}</div>`;
  }
  return `<h2>${esc(t("reportH"))}</h2>
  ${toggle}
  ${trendChartHtml(histCurrent().s.id)}
  <div id="histEntries">${histDayHtml()}</div>`;
}
// Profile-history value formatting: an unset value reads 未入力.
const fmtHistVal = (v) => (v === null || v === undefined || v === "" ? t("notEntered") : String(v));
// A profile-history timestamp (ISO, UTC) shown in Asia/Tokyo as the
// header date form plus HH:MM, e.g. 11/13（金） 14:05.
function profileHistoryWhen(at) {
  const tm = new Date(at);
  if (Number.isNaN(tm.getTime())) return "";
  const d = tm.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
  const time = tm.toLocaleTimeString(lang === "en" ? "en-GB" : "ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit", hour12: false });
  return `${headerDate(d)} ${time}`;
}
function renderSettings() {
  const p = state.profile ?? { age: "", sex: "", heightCm: "", weightKg: "", note: "" };
  return `<button class="back-btn" id="backHome">${esc(t("backHome"))}</button>
  <h2>${esc(t("profileH"))}</h2>
  <div class="form-grid">
    <div class="field"><label for="pf-age">${esc(t("fAge"))}</label><input type="text" inputmode="numeric" pattern="[0-9]*" id="pf-age" value="${p.age ?? ""}"></div>
    <div class="field"><label for="pf-sex">${esc(t("fSex"))}</label><select id="pf-sex"><option value=""${p.sex === "" ? " selected" : ""}>${esc(t("sexNone"))}</option><option value="男性"${p.sex === "男性" ? " selected" : ""}>${esc(t("sexMale"))}</option><option value="女性"${p.sex === "女性" ? " selected" : ""}>${esc(t("sexFemale"))}</option></select></div>
    <div class="field"><label for="pf-height">${esc(t("fHeight"))}</label><input type="text" inputmode="numeric" pattern="[0-9]*" id="pf-height" value="${p.heightCm ?? ""}"></div>
    <div class="field"><label for="pf-weight">${esc(t("fWeight"))}</label><input type="text" inputmode="decimal" id="pf-weight" value="${p.weightKg ?? ""}"></div>
    <div class="field wide"><label for="pf-note">${esc(t("fNote"))}</label><textarea id="pf-note" rows="3">${esc(p.note)}</textarea><div class="field-hint">${esc(t("fNoteHint"))}</div></div>
  </div>
  <p class="profile-save-line"><span id="profileSaved" class="saved-ind"${profileSavedShow ? "" : " hidden"}>${esc(t("savedIndicator"))}</span><span id="profileErr" class="error">${esc(profileError)}</span></p>
  <h2>${esc(t("languageH"))}</h2>
  <p class="data-actions"><button class="btn${lang === "ja" ? " active" : ""}" data-lang="ja">日本語</button><button class="btn${lang === "en" ? " active" : ""}" data-lang="en">English</button></p>
  <h2>${esc(t("themeH"))}</h2>
  <p class="data-actions"><button class="btn${themeSetting === "dark" ? " active" : ""}" data-theme-set="dark">${esc(t("themeDark"))}</button><button class="btn${themeSetting === "light" ? " active" : ""}" data-theme-set="light">${esc(t("themeLight"))}</button><button class="btn${themeSetting === "system" ? " active" : ""}" data-theme-set="system">${esc(t("themeSystem"))}</button></p>
  ${(state.profileHistory ?? []).length ? `<h2>${esc(t("profileHistoryH"))}</h2>
  <div class="prof-history">${state.profileHistory.map((h) => `<div class="ph-entry"><div class="ph-date">${esc(profileHistoryWhen(h.at))}</div>${h.changes.map((c) => `<div class="ph-row">${esc(fieldLabel(c))}： ${esc(fmtHistVal(c.from))} → ${esc(fmtHistVal(c.to))}</div>`).join("")}</div>`).join("")}</div>` : ""}
  <h2>${esc(t("dataH"))}</h2><p class="small">${esc(t("dataNote"))}</p>
  <p class="small">${esc(t("dataFormats"))}</p>
  <p class="data-actions"><button class="btn" id="exportJson">${esc(t("exportJsonBtn"))}</button><button class="btn" id="exportCsv">${esc(t("exportCsvBtn"))}</button><button class="btn" id="importData">${esc(t("importBtn"))}</button><input type="file" id="importFile" accept="application/json,.json" hidden></p>
  ${importError ? `<p class="error">${esc(importError)}</p>` : ""}
  ${importArm ? `<div class="reset-confirm"><p>${esc(t("importConfirmText", { name: importFileName }))}</p><button class="btn danger-solid" id="importConfirm">${esc(t("importExec"))}</button><button class="btn" id="importCancel">${esc(t("cancelBtn"))}</button></div>` : ""}
  <h2 id="menuDefSection">${esc(t("menuDefH"))}</h2><p class="small">${esc(t("menuDefNote"))}</p>
  <textarea id="menuDefText" class="menu-def-text" rows="16" spellcheck="false">${esc(menuDefText ?? "")}</textarea>
  <p class="data-actions"><button class="btn" id="menuDefSave">${esc(t("menuDefSaveBtn"))}</button><button class="btn" id="menuDefExport">${esc(t("menuDefExportBtn"))}</button><button class="btn" id="menuDefImport">${esc(t("menuDefImportBtn"))}</button><input type="file" id="menuDefFile" accept="application/json,.json" hidden><button class="btn" id="menuDefReset">${esc(menuDefResetArm ? t("menuDefResetArmBtn") : t("menuDefResetBtn"))}</button></p>
  ${menuDefError ? `<p class="error">${esc(menuDefError)}</p>` : ""}
  ${menuDefSavedShow ? `<p class="saved-ind">${esc(t("menuDefSaved"))}</p>` : ""}
  <button class="btn danger" id="reset">${esc(t("deleteData"))}</button>
  ${resetArm ? `<div class="reset-confirm"><p>${esc(t("resetConfirmText"))}</p><button class="btn danger-solid" id="resetConfirm">${esc(t("resetExec"))}</button><button class="btn" id="resetCancel">${esc(t("cancelBtn"))}</button></div>` : ""}`;
}
function render() {
  if (!state) return; // nothing to render until the initial load succeeds
  applyStatic();
  document.querySelectorAll("#tabs button").forEach((b) => {
    const active = b.dataset.view === view;
    b.classList.toggle("active", active);
    if (active) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
  });
  // The gear is present on every view, shown only at the very top.
  syncGear();
  $app.innerHTML = view === "pain" ? renderPain() : view === "menu" ? renderMenu() : view === "history" ? renderHistory() : renderSettings();
  updateHeader();
  bind();
  // The menu-definition editor loads its JSON lazily on first arrival
  // in the settings view, then re-renders with the text in place.
  if (view === "settings" && menuDefText === null && !menuDefLoading) {
    menuDefLoading = true;
    fetch("/api/catalog").then((r) => r.json()).then((c) => {
      menuDefText = JSON.stringify(c, null, 2); menuDefLoading = false;
      if (view === "settings") render();
    }).catch(() => { menuDefLoading = false; });
  }
  // Arriving from the workout tab's menu-edit button lands on the
  // menu-definition section, not the top of the settings view.
  if (view === "settings" && scrollToMenuDef) {
    scrollToMenuDef = false;
    requestAnimationFrame(() => document.getElementById("menuDefSection")?.scrollIntoView({ block: "start" }));
  }
}
// Bindings for the report day pager only. bind() calls this on every
// full render, so the pager controls and edit buttons always work.
function bindHistoryEntries() {
  const root = document.getElementById("histEntries") ?? $app;
  // 日別/月別 view toggle (present in both views).
  $app.querySelectorAll("[data-report-view]").forEach((el) => el.addEventListener("click", () => { reportView = el.dataset.reportView; render(); }));
  // Day pager: ‹ › buttons, trend-chart taps, and left/right swipes on
  // the day page all move the shown day (sessions are newest first, so
  // the next page is an older day). Swiping is view-mode only; the edit
  // cards keep their touches for inputs.
  const moveDay = (delta) => {
    const { idx, total } = histCurrent();
    const next = Math.min(total - 1, Math.max(0, idx + delta));
    if (next === idx) return;
    histSessionId = state.sessions[next].id;
    render();
  };
  const newer = document.getElementById("histNewer");
  if (newer) newer.addEventListener("click", () => moveDay(-1));
  const older = document.getElementById("histOlder");
  if (older) older.addEventListener("click", () => moveDay(1));
  // The trend chart sits above the summaries now, outside #histEntries,
  // so its bars are wired from the whole app root.
  $app.querySelectorAll("[data-hist-day]").forEach((el) => el.addEventListener("click", () => { histSessionId = Number(el.dataset.histDay); render(); }));
  // Swipe: attached to the whole pager region (header + day page) and
  // the trend chart, not just the day page, and the region carries
  // touch-action: pan-y (see style.css) so the browser keeps vertical
  // scrolling but hands horizontal drags to these handlers instead of
  // swallowing them. Skipped while the shown day is being edited.
  const attachSwipe = (elm) => {
    if (!elm) return;
    let touchX = null;
    elm.addEventListener("touchstart", (e) => { touchX = e.changedTouches[0].clientX; }, { passive: true });
    elm.addEventListener("touchend", (e) => {
      if (touchX === null) return;
      const dx = e.changedTouches[0].clientX - touchX;
      touchX = null;
      if (editingHist.has(histCurrent().s.id)) return;
      if (dx <= -40) moveDay(1);
      else if (dx >= 40) moveDay(-1);
    }, { passive: true });
  };
  attachSwipe(root);
  attachSwipe(document.getElementById("histTrend"));
  root.querySelectorAll(".set-input").forEach((el) => el.addEventListener("input", () => { el.value = sanitizeDigits(el.value); }));
  root.querySelectorAll("[data-edit-history]").forEach((el) => el.addEventListener("click", () => { editingHist.add(Number(el.dataset.editHistory)); render(); }));
  root.querySelectorAll("[data-exit-history]").forEach((el) => el.addEventListener("click", () => { editingHist.delete(Number(el.dataset.exitHistory)); render(); }));
  // Per-card save, same style as the workout screen: one exercise at a
  // time through the record endpoint, keeping the stored completion
  // flag (the unified card has no checkbox). The entry stays in edit
  // mode so the remaining cards can be fixed too; totals and stats
  // are recomputed server-side as before.
  root.querySelectorAll("[data-save-history-ex]").forEach((el) => el.addEventListener("click", async () => {
    const [sid, eid] = el.dataset.saveHistoryEx.split(":").map(Number);
    const s = state.sessions.find((x) => x.id === sid);
    const ex = s?.exercises.find((x) => x.id === eid);
    if (!s || !ex) return;
    await withBusy(el, async () => {
      const data = collectExercise($app, ex);
      const err = validateExerciseData(data); if (err) throw new Error(err);
      await api(`/api/session/${sid}/record`, { exercises: [{ exerciseId: eid, ...data }] });
      render();
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
    // 「保存してワークアウトを開始」: one button — save the condition
    // check (the server rebuilds the day's planned session around the
    // new assessment), generate today's session when there is none,
    // then move to the workout screen. A blocked generation (red flag
    // / rest day) still lands on the workout screen, whose empty state
    // shows the reason.
    const ok = await withBusy(savePain, async () => {
      await savePainNow();
      if (!state.todaySession) {
        try { await api("/api/session/generate", {}); menuGenError = ""; }
        catch (e) { menuGenError = e.message; }
      }
    });
    if (ok) go("menu");
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
  // Profile autosave: there is no save button — any edit to the
  // profile form is debounce-saved to /api/profile 1.8s after the
  // input stops (a view change flushes it sooner; see go/popstate).
  // Language / theme switches below still save immediately.
  if (document.getElementById("pf-age")) {
    const onProfileInput = () => {
      profileSavedShow = false;
      const ind = document.getElementById("profileSaved"); if (ind) ind.hidden = true;
      const errEl = document.getElementById("profileErr"); if (errEl) errEl.textContent = "";
      if (profileSaveTimer !== null) clearTimeout(profileSaveTimer);
      profileSaveTimer = setTimeout(() => { profileSaveTimer = null; void saveProfileAuto(); }, 1800);
    };
    for (const id of ["pf-age", "pf-sex", "pf-height", "pf-weight", "pf-note"]) {
      const el = document.getElementById(id);
      if (el) { el.addEventListener("input", onProfileInput); el.addEventListener("change", onProfileInput); }
    }
  }
  // Language switch: saved in the store via /api/lang; the response is
  // the fresh state (with the new language), so the whole UI — static
  // strings included — switches in place, without a reload.
  $app.querySelectorAll("[data-lang]").forEach((el) => el.addEventListener("click", async () => {
    const next = el.dataset.lang;
    if (next === lang) return;
    await withBusy(el, async () => { await api("/api/lang", { lang: next }); render(); });
  }));
  // Theme switch: saved in the store via /api/theme; the response
  // state carries the new setting and api() applies it at once — no
  // reload, the whole screen repaints in the new theme.
  $app.querySelectorAll("[data-theme-set]").forEach((el) => el.addEventListener("click", async () => {
    const next = el.dataset.themeSet;
    if (next === themeSetting) return;
    await withBusy(el, async () => { await api("/api/theme", { theme: next }); render(); });
  }));
  const exportJson = document.getElementById("exportJson");
  if (exportJson) exportJson.addEventListener("click", () => { window.location.href = "/api/export"; });
  const exportCsv = document.getElementById("exportCsv");
  if (exportCsv) exportCsv.addEventListener("click", () => { window.location.href = "/api/export.csv"; });
  const importData = document.getElementById("importData");
  const importFile = document.getElementById("importFile");
  if (importData && importFile) {
    importData.addEventListener("click", () => importFile.click());
    importFile.addEventListener("change", async () => {
      const f = importFile.files?.[0]; if (!f) return;
      try {
        importPending = JSON.parse(await f.text());
        importFileName = f.name; importError = ""; importArm = true;
      } catch { importPending = null; importFileName = ""; importError = t("fileFormatError"); importArm = false; }
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
  // Workout tab: the i button next to an exercise name opens its
  // how-to window; the backdrop or the × button closes it.
  $app.querySelectorAll("[data-guide]").forEach((el) => el.addEventListener("click", () => { guideFor = el.dataset.guide; render(); }));
  const guideClose = document.getElementById("guideClose");
  if (guideClose) guideClose.addEventListener("click", () => { guideFor = null; render(); });
  const guideOverlay = document.getElementById("guideOverlay");
  if (guideOverlay) guideOverlay.addEventListener("click", (e) => { if (e.target === guideOverlay) { guideFor = null; render(); } });
  // Workout tab -> settings, straight at the menu-definition section.
  const goMenuDef = document.getElementById("goMenuDef");
  if (goMenuDef) goMenuDef.addEventListener("click", () => { scrollToMenuDef = true; go("settings"); });
  // Settings: menu-definition editor (save / export / import / reset).
  const menuDefSave = document.getElementById("menuDefSave");
  if (menuDefSave) menuDefSave.addEventListener("click", async () => {
    const text = document.getElementById("menuDefText")?.value ?? "";
    await withBusy(menuDefSave, async () => {
      try {
        await api("/api/catalog", { catalogText: text });
        menuDefText = null; menuDefError = ""; menuDefSavedShow = true; menuDefResetArm = false;
      } catch (e) {
        menuDefText = text; menuDefError = e.message; menuDefSavedShow = false;
      }
      render();
    });
  });
  const menuDefExport = document.getElementById("menuDefExport");
  if (menuDefExport) menuDefExport.addEventListener("click", () => { window.location.href = "/api/catalog/export"; });
  const menuDefImport = document.getElementById("menuDefImport");
  const menuDefFile = document.getElementById("menuDefFile");
  if (menuDefImport && menuDefFile) {
    menuDefImport.addEventListener("click", () => menuDefFile.click());
    menuDefFile.addEventListener("change", async () => {
      const f = menuDefFile.files?.[0]; if (!f) return;
      const text = await f.text();
      try {
        await api("/api/catalog", { catalogText: text });
        menuDefText = null; menuDefError = ""; menuDefSavedShow = true; menuDefResetArm = false;
      } catch (e) {
        menuDefError = e.message; menuDefSavedShow = false;
      }
      render();
    });
  }
  const menuDefReset = document.getElementById("menuDefReset");
  if (menuDefReset) menuDefReset.addEventListener("click", async () => {
    if (!menuDefResetArm) { menuDefResetArm = true; render(); return; }
    await withBusy(menuDefReset, async () => {
      try {
        await api("/api/catalog", { reset: true });
        menuDefText = null; menuDefError = ""; menuDefSavedShow = true;
      } catch (e) {
        menuDefError = e.message; menuDefSavedShow = false;
      }
      menuDefResetArm = false;
      render();
    });
  });
}
load().catch(loadFailed);

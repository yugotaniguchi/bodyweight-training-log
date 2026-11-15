import { createHash, timingSafeEqual } from "node:crypto";
import { join } from "node:path";
import { assessPain, catalogOf, detectOverload, diffProfile, generateSession, painDurationGuidance, refreshPlannedSession, sessionTotal, setSum, type PainEntry, type SessionExercise, type SetLog, type Store } from "./src/logic";
import { RED_FLAGS, EXERCISES } from "./src/exercises";
import { loadStore, saveStore, resetStore } from "./src/store";
import { InvalidInput, parseCatalogImport, parseProfile, parseStoreImport, validNote, validPainLevel, validRpe, validSetLog } from "./src/validate";
import { SRV, VMSG, isLang, isTheme, langOf, redFlagLabel, rotationTitle, themeOf, type Lang } from "./src/i18n";
import { ICON_192_BASE64, ICON_512_BASE64, ICON_MASKABLE_512_BASE64, APPLE_TOUCH_ICON_BASE64 } from "./src/icons";
import { logEvent } from "./src/log";

// Icons are embedded as base64 (src/icons.ts) so the repository carries
// no binary files; they are decoded once here and served as image/png
// at the paths the manifest and index.html reference.
const ICON_ROUTES = new Map<string, Uint8Array>([
  ["/icon-192.png", Buffer.from(ICON_192_BASE64, "base64")],
  ["/icon-512.png", Buffer.from(ICON_512_BASE64, "base64")],
  ["/icon-maskable-512.png", Buffer.from(ICON_MASKABLE_512_BASE64, "base64")],
  ["/apple-touch-icon.png", Buffer.from(APPLE_TOUCH_ICON_BASE64, "base64")],
]);

const PORT = Number(process.env.PORT ?? 3000);
const PUBLIC = join(process.cwd(), "public");
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8" } });
const today = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" }); // YYYY-MM-DD

// ---------- optional token authentication ----------
// Enabled only when BTL_TOKEN is set; unset, the app behaves exactly
// as before (no auth anywhere). When enabled, every page and API
// route requires the login cookie: the browser is redirected to a
// minimal /login form, the API answers 401. The cookie carries only
// a SHA-256 hash of the token, HttpOnly, for 30 days.
const TOKEN = process.env.BTL_TOKEN ?? "";
const AUTH_COOKIE = "btl_auth";
const AUTH_VALUE = TOKEN ? createHash("sha256").update(`btl:${TOKEN}`).digest("hex") : "";
const isAuthed = (req: Request): boolean => {
  if (!TOKEN) return true;
  const cookie = req.headers.get("cookie") ?? "";
  return cookie.split(/;\s*/).some((p) => p === `${AUTH_COOKIE}=${AUTH_VALUE}`);
};
// The login page follows the theme saved in the store: a forced
// dark / light choice is emitted as-is; "system" emits the light
// tokens with a prefers-color-scheme override for dark, mirroring
// the app's own CSS variables.
const LOGIN_DARK = "--bg:#0f0f0f;--text:#f0f0f0;--sub:#9ca3af;--border:#2d2d2d;--input:#1a1a1a;--accent:#2dd4bf;--on-accent:#052e2b;--err:#f87171;color-scheme:dark";
const LOGIN_LIGHT = "--bg:#f2f2f0;--text:#1c1e1c;--sub:#5b6066;--border:#d5d5d1;--input:#ffffff;--accent:#0f766e;--on-accent:#ffffff;--err:#b91c1c;color-scheme:light";
function loginPage(error: boolean, lang: Lang, theme: "dark" | "light" | "system"): Response {
  const T = SRV[lang];
  const vars = theme === "dark" ? `:root{${LOGIN_DARK}}`
    : theme === "light" ? `:root{${LOGIN_LIGHT}}`
    : `:root{${LOGIN_LIGHT}}@media (prefers-color-scheme: dark){:root{${LOGIN_DARK}}}`;
  const themeColor = theme === "system"
    ? `<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0f0f0f"><meta name="theme-color" media="(prefers-color-scheme: light)" content="#f2f2f0">`
    : `<meta name="theme-color" content="${theme === "dark" ? "#0f0f0f" : "#f2f2f0"}">`;
  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${T.loginButton} — 自重トレーニング記録</title>
${themeColor}
<style>
${vars}
body{font-family:system-ui,sans-serif;font-size:16px;background:var(--bg);color:var(--text);max-width:680px;margin:0 auto;padding:16px;padding-bottom:calc(16px + env(safe-area-inset-bottom,0px));line-height:1.6}
h1{font-size:20px;margin:22px 0 4px}
.sub{color:var(--sub);font-size:13px;margin:0 0 14px}
label{display:block;font-size:13px;color:var(--sub);margin-bottom:4px}
input{height:42px;padding:0 10px;border-radius:8px;border:1px solid var(--border);background:var(--input);color:var(--text);font-size:16px;box-sizing:border-box;font-family:inherit;width:100%}
button{display:block;width:100%;box-sizing:border-box;margin-top:20px;padding:16px;border:none;border-radius:8px;background:var(--accent);color:var(--on-accent);font-size:16px;font-weight:700;cursor:pointer}
.error{color:var(--err);font-size:14px}
</style>
</head>
<body>
<h1>自重トレーニング記録</h1>
<p class="sub">${T.loginSub}</p>
${error ? `<p class="error">${T.loginError}</p>` : ""}
<form method="POST" action="/login">
<label for="token">${T.loginLabel}</label>
<input id="token" name="token" type="password" autocomplete="current-password">
<button type="submit">${T.loginButton}</button>
</form>
</body>
</html>`;
  return new Response(html, { status: error ? 401 : 200, headers: { "content-type": "text/html; charset=utf-8" } });
}
async function handleLogin(req: Request): Promise<Response> {
  // The login page follows the language and theme saved in the store,
  // which the server knows even before anyone is logged in.
  const store = loadStore();
  const lang = langOf(store);
  const theme = themeOf(store);
  if (req.method === "GET") return loginPage(false, lang, theme);
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
  const form = await req.formData().catch(() => null);
  const given = String(form?.get("token") ?? "");
  const givenHash = createHash("sha256").update(`btl:${given}`).digest();
  const expectedHash = createHash("sha256").update(`btl:${TOKEN}`).digest();
  if (!timingSafeEqual(givenHash, expectedHash)) {
    logEvent("auth", "login failed (token mismatch)");
    return loginPage(true, lang, theme);
  }
  logEvent("auth", "login succeeded");
  return new Response(null, {
    status: 303,
    headers: {
      location: "/",
      "set-cookie": `${AUTH_COOKIE}=${AUTH_VALUE}; HttpOnly; Path=/; SameSite=Lax; Max-Age=2592000`,
    },
  });
}

// ---------- CSV export (session records, for viewing) ----------
// RFC 4180 escaping: a field containing a comma, quote or newline is
// wrapped in double quotes and its quotes doubled.
const csvField = (v: string | number): string => {
  const s = String(v);
  return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
};
export function buildSessionsCsv(store: Store): string {
  const lang = langOf(store);
  const en = lang === "en";
  const header = en
    ? ["Date", "Rotation", "Title", "Status", "Exercise", "Muscle group", "Variation", "Target sets", "Target reps", "Unit", "Sets", "Total", "RPE", "Note"]
    : ["日付", "ローテーション", "タイトル", "状態", "種目", "部位", "バリエーション", "目標セット", "目標回数", "単位", "セット実績", "合計", "RPE", "メモ"];
  const setText = (v: SetLog): string => (typeof v === "number" ? String(v) : en ? `L${v.l}/R${v.r}` : `左${v.l}/右${v.r}`);
  const rows: string[] = [header.map(csvField).join(",")];
  for (const s of store.sessions) {
    for (const ex of s.exercises) {
      rows.push([
        s.date, s.rotation, s.title,
        s.status === "completed" ? (en ? "completed" : "完了") : (en ? "planned" : "予定"),
        ex.name, ex.muscleGroup, ex.variation,
        ex.targetSets, ex.targetReps, ex.targetUnit,
        ex.loggedSets.map(setText).join(" / "),
        ex.loggedSets.reduce((a, v) => a + setSum(v), 0),
        ex.rpe ?? "", ex.note,
      ].map(csvField).join(","));
    }
  }
  return "\uFEFF" + rows.join("\r\n") + "\r\n";
}

function publicState() {
  const store = loadStore();
  const lang = langOf(store);
  const cat = catalogOf(store);
  const date = today();
  const pain = store.pain.find((p) => p.date === date) ?? null;
  const todaySession = store.sessions.find((s) => s.date === date) ?? null;
  // The workout screen works on the active session: today's session if
  // one exists, otherwise the newest still-unfinished (planned) one —
  // a session belongs to the day it was started, so an unfinished
  // session from an earlier day stays recordable and completable as
  // that day's session even after the date has moved on, and never
  // mixes with a new day's session.
  const activeSession = todaySession
    ?? [...store.sessions].reverse().find((s) => s.status === "planned")
    ?? null;
  return {
    today: date, profile: store.profile, pain, lang, theme: themeOf(store),
    assessment: pain ? assessPain(pain, lang) : null,
    // Additive, backward-compatible state: duration guidance (caution only)
    // and the auto-judged 24-hour-rule overload flags for the next session.
    guidance: painDurationGuidance(store, lang),
    overload: detectOverload(store, lang),
    todaySession,
    activeSession,
    profileHistory: [...store.profileHistory].reverse(),
    sessions: [...store.sessions].reverse(),
    stats: {
      totalCompleted: store.sessions.filter((s) => s.status === "completed").length,
      totalVolume: store.sessions.reduce((a, s) => a + s.totalVolume, 0),
    },
    // The catalog's display labels (red flags, rotation titles) follow
    // the language; the part / joint names stay the canonical Japanese
    // keys the stored data uses, and the client translates them for
    // display from its own dictionary.
    catalog: {
      muscleParts: cat.muscleParts, joints: cat.joints,
      redFlags: RED_FLAGS.map((f) => ({ id: f.id, label: redFlagLabel(f.id, lang) })),
      rotations: cat.rotations.map((r) => ({ id: r.id, title: rotationTitle(r.id, r.title, lang) })),
      // Exercise ids recorded per side (left/right inputs); ids and
      // names are language-neutral, only the UI labels translate.
      unilateral: Object.values(cat.exercises).filter((e) => e.unilateral).map((e) => e.baseId),
      // How-to guides for the workout tab's info window (steps + the
      // body part to focus on), keyed by exercise id. Catalog data, so
      // it follows the user's own menu definition when they edit it.
      guides: Object.fromEntries(Object.values(cat.exercises).map((e) => [e.baseId, { steps: e.steps, focus: e.focus }])),
    },
  };
}

// Every field is validated (src/validate.ts); an invalid value throws
// InvalidInput and the handler answers 400 without storing anything.
// Nothing is silently clamped, truncated, or coerced anymore.
function applyExerciseUpdate(ex: SessionExercise, body: Record<string, unknown>, lang: Lang): SessionExercise {
  const m = VMSG[lang];
  let loggedSets = ex.loggedSets;
  if (body.loggedSets !== undefined) {
    if (!Array.isArray(body.loggedSets)) throw new InvalidInput(m.repsFormat);
    if (body.loggedSets.length > 10) throw new InvalidInput(m.tooManySets);
    loggedSets = body.loggedSets.map((v) => validSetLog(v, lang));
  }
  let rpe = ex.rpe;
  if (body.rpe !== undefined) {
    const v = validRpe(body.rpe, lang); // null = "not entered": keep the stored value, as before
    if (v !== null) rpe = v;
  }
  let completed = ex.completed;
  if (body.completed !== undefined) {
    if (typeof body.completed !== "boolean") throw new InvalidInput(m.completedFlagFormat);
    completed = body.completed;
  }
  const note = body.note === undefined ? ex.note : validNote(body.note, lang);
  return { ...ex, loggedSets, rpe, completed, note };
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;
    try {
      // Optional token gate (see above): /login is the only open route.
      if (TOKEN) {
        if (path === "/login") return await handleLogin(req);
        if (!isAuthed(req)) {
          logEvent("auth", `401 ${req.method} ${path}`);
          if (path.startsWith("/api/")) return json({ error: SRV[langOf(loadStore())].errAuthRequired }, 401);
          return Response.redirect(new URL("/login", url), 302);
        }
      }

      if (path === "/api/state" && req.method === "GET") return json(publicState());

      // UI language setting: saved in the store, so it survives reloads
      // and follows the data across browsers. Absent in the store means
      // Japanese.
      if (path === "/api/lang" && req.method === "POST") {
        const b = await req.json();
        const store = loadStore();
        if (!isLang(b?.lang)) { logEvent("api", `400 POST ${path}`); return json({ error: VMSG[langOf(store)].langInvalid }, 400); }
        store.lang = b.lang;
        saveStore(store); return json(publicState());
      }

      // Colour theme setting ("dark" | "light" | "system"): saved in
      // the store like the language; absent means "system".
      if (path === "/api/theme" && req.method === "POST") {
        const b = await req.json();
        const store = loadStore();
        if (!isTheme(b?.theme)) { logEvent("api", `400 POST ${path}`); return json({ error: VMSG[langOf(store)].themeInvalid }, 400); }
        store.theme = b.theme;
        saveStore(store); return json(publicState());
      }

      if (path === "/api/profile" && req.method === "POST") {
        const b = await req.json();
        const store = loadStore();
        const next = parseProfile(b, langOf(store)); // throws InvalidInput -> 400
        // Keep the change history: one entry per save that changed
        // something, holding each field's before/after values.
        const changes = diffProfile(store.profile, next);
        if (changes.length) {
          store.profileHistory = [...store.profileHistory, { at: new Date().toISOString(), changes }].slice(-100);
        }
        store.profile = next;
        saveStore(store); return json(publicState());
      }

      if (path === "/api/pain" && req.method === "POST") {
        const b = await req.json();
        const store = loadStore();
        const lang = langOf(store);
        // Pain levels are validated, not clamped: a present value must be
        // an integer 0-5 (a missing part means 0, as the client sends all).
        const level = (obj: unknown, key: string): number => {
          if (obj === undefined || obj === null) return 0;
          if (typeof obj !== "object") throw new InvalidInput(VMSG[lang].painFormat);
          const v = (obj as Record<string, unknown>)[key];
          return v === undefined ? 0 : validPainLevel(v, lang);
        };
        const cat = catalogOf(store);
        const entry: PainEntry = {
          date: today(),
          soreness: Object.fromEntries(cat.muscleParts.map((p) => [p, level(b.soreness, p)])),
          jointPain: Object.fromEntries(cat.joints.map((j) => [j, level(b.jointPain, j)])),
          redFlags: Array.isArray(b.redFlags) ? b.redFlags.filter((x: unknown) => RED_FLAGS.some((f) => f.id === x)) : [],
        };
        store.pain = [...store.pain.filter((p) => p.date !== entry.date), entry];
        // Re-saving the condition check rebuilds the day's planned
        // session around what is already recorded: recorded exercises
        // stay fixed, the remaining slots are re-planned under the new
        // assessment (see refreshPlannedSession). The target is the
        // same session the workout screen works on — today's planned
        // session, else the newest still-planned one. Completed
        // sessions are never touched.
        const target = store.sessions.find((s) => s.date === entry.date && s.status === "planned")
          ?? [...store.sessions].reverse().find((s) => s.status === "planned");
        if (target) {
          const idx = store.sessions.indexOf(target);
          store.sessions[idx] = refreshPlannedSession(store, target, assessPain(entry, lang), lang);
        }
        saveStore(store); return json(publicState());
      }

      if (path === "/api/session/generate" && req.method === "POST") {
        const store = loadStore();
        const lang = langOf(store);
        const T = SRV[lang];
        const date = today();
        if (store.sessions.some((s) => s.date === date)) { logEvent("api", `409 POST ${path}`); return json({ error: T.errSessionExists }, 409); }
        const pain = store.pain.find((p) => p.date === date) ?? null;
        const assessment = assessPain(pain, lang);
        if (assessment.care) { logEvent("api", `403 POST ${path} (red flag)`); return json({ error: T.errBlockedRedFlag, assessment }, 403); }
        if (assessment.rest) { logEvent("api", `403 POST ${path} (rest day)`); return json({ error: T.errRestDay, assessment }, 403); }
        const session = generateSession(store, date, assessment, lang);
        if (session.exercises.length === 0) { logEvent("api", `403 POST ${path} (all excluded)`); return json({ error: T.errAllExcluded, assessment }, 403); }
        store.sessions.push(session); saveStore(store); return json(publicState());
      }

      const exMatch = path.match(/^\/api\/session\/(\d+)\/exercise\/(\d+)$/);
      if (exMatch && req.method === "POST") {
        const store = loadStore();
        const s = store.sessions.find((x) => x.id === Number(exMatch[1]));
        const ex = s?.exercises.find((x) => x.id === Number(exMatch[2]));
        if (!s || !ex) { logEvent("api", `404 ${req.method} ${path}`); return json({ error: "not found" }, 404); }
        Object.assign(ex, applyExerciseUpdate(ex, await req.json(), langOf(store)));
        s.totalVolume = sessionTotal(s); saveStore(store); return json(publicState());
      }

      const recMatch = path.match(/^\/api\/session\/(\d+)\/record$/);
      if (recMatch && req.method === "POST") { // history editing
        const b = await req.json();
        const store = loadStore();
        const s = store.sessions.find((x) => x.id === Number(recMatch[1]));
        if (!s) { logEvent("api", `404 ${req.method} ${path}`); return json({ error: "not found" }, 404); }
        for (const upd of Array.isArray(b.exercises) ? b.exercises : []) {
          const ex = s.exercises.find((x) => x.id === Number(upd.exerciseId));
          if (ex) Object.assign(ex, applyExerciseUpdate(ex, upd, langOf(store)));
        }
        s.totalVolume = sessionTotal(s); saveStore(store); return json(publicState());
      }

      const delMatch = path.match(/^\/api\/session\/(\d+)\/delete$/);
      if (delMatch && req.method === "POST") { // cancel today's menu from the menu screen
        const store = loadStore();
        const idx = store.sessions.findIndex((x) => x.id === Number(delMatch[1]));
        if (idx < 0) { logEvent("api", `404 ${req.method} ${path}`); return json({ error: "not found" }, 404); }
        store.sessions.splice(idx, 1); saveStore(store); return json(publicState());
      }

      const compMatch = path.match(/^\/api\/session\/(\d+)\/complete$/);
      if (compMatch && req.method === "POST") {
        const store = loadStore();
        const s = store.sessions.find((x) => x.id === Number(compMatch[1]));
        if (!s) { logEvent("api", `404 ${req.method} ${path}`); return json({ error: "not found" }, 404); }
        s.status = "completed"; s.totalVolume = sessionTotal(s); saveStore(store); return json(publicState());
      }

      if (path === "/api/reset" && req.method === "POST") { resetStore(); return json(publicState()); }

      // Data export: the whole store as a downloadable JSON file.
      if (path === "/api/export" && req.method === "GET") {
        return new Response(JSON.stringify(loadStore(), null, 2), {
          headers: {
            "content-type": "application/json; charset=utf-8",
            "content-disposition": 'attachment; filename="bodyweight-training-log.json"',
          },
        });
      }
      // CSV export: the session records as a human-readable table
      // (viewing only — import accepts JSON only). UTF-8 with a BOM so
      // Excel opens it without mojibake; the column headers follow the
      // store's language. One row per exercise per session, newest
      // session last (chronological, as recorded).
      if (path === "/api/export.csv" && req.method === "GET") {
        return new Response(buildSessionsCsv(loadStore()), {
          headers: {
            "content-type": "text/csv; charset=utf-8",
            "content-disposition": 'attachment; filename="bodyweight-training-log.csv"',
          },
        });
      }
      // Data import: the body is fully validated (parseStoreImport) before
      // anything is written, so a bad file answers 400 and replaces nothing.
      if (path === "/api/import" && req.method === "POST") {
        const store = parseStoreImport(await req.json(), langOf(loadStore())); // throws InvalidInput -> 400
        saveStore(store); return json(publicState());
      }

      // Menu definition (catalog): the settings screen reads the
      // current catalog as JSON, downloads it as a file, and saves an
      // edited / imported one. Saving is fully validated
      // (parseCatalogImport) before anything is written; { reset: true }
      // drops the user's catalog and returns to the built-in one.
      // Changes apply to sessions generated afterwards; recorded
      // sessions keep the names and targets they were created with.
      if (path === "/api/catalog" && req.method === "GET") {
        return json(catalogOf(loadStore()));
      }
      if (path === "/api/catalog/export" && req.method === "GET") {
        return new Response(JSON.stringify(catalogOf(loadStore()), null, 2), {
          headers: {
            "content-type": "application/json; charset=utf-8",
            "content-disposition": 'attachment; filename="menu-catalog.json"',
          },
        });
      }
      if (path === "/api/catalog" && req.method === "POST") {
        const b = await req.json();
        const store = loadStore();
        const lang = langOf(store);
        if (b && b.reset === true) {
          delete store.catalog;
        } else {
          let raw: unknown = b?.catalog;
          if (typeof b?.catalogText === "string") {
            try { raw = JSON.parse(b.catalogText); }
            catch { throw new InvalidInput(SRV[lang].errMalformed); }
          }
          store.catalog = parseCatalogImport(raw, lang); // throws InvalidInput -> 400
        }
        saveStore(store); return json(publicState());
      }
      if (path.startsWith("/api/")) { logEvent("api", `404 ${req.method} ${path}`); return json({ error: "not found" }, 404); }

      // Icons come from the embedded base64 data, not from public/.
      const icon = ICON_ROUTES.get(path);
      if (icon) return new Response(icon, { headers: { "content-type": "image/png" } });

      // The web app manifest must go out as application/manifest+json.
      if (path === "/manifest.webmanifest") {
        const f = Bun.file(join(PUBLIC, "manifest.webmanifest"));
        if (await f.exists()) return new Response(f, { headers: { "content-type": "application/manifest+json; charset=utf-8" } });
      }

      const filePath = path === "/" ? join(PUBLIC, "index.html") : join(PUBLIC, path);
      const file = Bun.file(filePath);
      if (await file.exists()) return new Response(file);
      return new Response(Bun.file(join(PUBLIC, "index.html")));
    } catch (e) {
      if (e instanceof InvalidInput) { logEvent("api", `400 ${req.method} ${path}: ${e.message}`); return json({ error: e.message }, 400); }
      if (e instanceof SyntaxError) { logEvent("api", `400 ${req.method} ${path}: malformed request`); return json({ error: SRV[langOf(loadStore())].errMalformed }, 400); }
      logEvent("api", `500 ${req.method} ${path}: ${e instanceof Error ? e.name : "error"}`);
      return json({ error: String(e) }, 500);
    }
  },
});
console.log(`bodyweight-training-log listening on http://localhost:${server.port}`);
logEvent("start", `listening on port ${server.port}${TOKEN ? " (token auth enabled)" : ""}`);
export { EXERCISES };

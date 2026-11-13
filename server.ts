import { join } from "node:path";
import { assessPain, detectOverload, generateSession, painDurationGuidance, sessionTotal, type PainEntry, type SessionExercise } from "./src/logic";
import { MUSCLE_PARTS, JOINTS, RED_FLAGS, EXERCISES, ROTATIONS } from "./src/exercises";
import { loadStore, saveStore, resetStore } from "./src/store";

const PORT = Number(process.env.PORT ?? 3000);
const PUBLIC = join(process.cwd(), "public");
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8" } });
const today = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" }); // YYYY-MM-DD

function publicState() {
  const store = loadStore();
  const date = today();
  const pain = store.pain.find((p) => p.date === date) ?? null;
  return {
    today: date, profile: store.profile, pain,
    assessment: pain ? assessPain(pain) : null,
    // Additive, backward-compatible state: duration guidance (caution only)
    // and the auto-judged 24-hour-rule overload flags for the next session.
    guidance: painDurationGuidance(store),
    overload: detectOverload(store),
    todaySession: store.sessions.find((s) => s.date === date) ?? null,
    sessions: [...store.sessions].reverse(),
    stats: {
      totalCompleted: store.sessions.filter((s) => s.status === "completed").length,
      totalVolume: store.sessions.reduce((a, s) => a + s.totalVolume, 0),
    },
    catalog: { muscleParts: MUSCLE_PARTS, joints: JOINTS, redFlags: RED_FLAGS, rotations: ROTATIONS.map((r) => ({ id: r.id, title: r.title })) },
  };
}

function applyExerciseUpdate(ex: SessionExercise, body: Record<string, unknown>): SessionExercise {
  const logged = Array.isArray(body.loggedSets)
    ? body.loggedSets.slice(0, 10).map((v) => Math.max(0, Math.min(999, Math.trunc(Number(v) || 0))))
    : ex.loggedSets;
  return {
    ...ex, loggedSets: logged,
    rpe: body.rpe === null || body.rpe === "" || body.rpe === undefined ? ex.rpe : Math.max(1, Math.min(10, Number(body.rpe) || ex.rpe || 1)),
    completed: typeof body.completed === "boolean" ? body.completed : ex.completed,
    note: typeof body.note === "string" ? body.note.slice(0, 500) : ex.note,
  };
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;
    try {
      if (path === "/api/state" && req.method === "GET") return json(publicState());

      if (path === "/api/profile" && req.method === "POST") {
        const b = await req.json();
        const store = loadStore();
        store.profile = {
          age: b.age ? Number(b.age) : null, sex: String(b.sex ?? ""),
          heightCm: b.heightCm ? Number(b.heightCm) : null, weightKg: b.weightKg ? Number(b.weightKg) : null,
          bodyFatNote: String(b.bodyFatNote ?? ""), habitNote: String(b.habitNote ?? ""),
        };
        saveStore(store); return json(publicState());
      }

      if (path === "/api/pain" && req.method === "POST") {
        const b = await req.json();
        const store = loadStore();
        const entry: PainEntry = {
          date: today(),
          soreness: Object.fromEntries(MUSCLE_PARTS.map((p) => [p, Math.max(0, Math.min(5, Number(b.soreness?.[p]) || 0))])),
          jointPain: Object.fromEntries(JOINTS.map((j) => [j, Math.max(0, Math.min(5, Number(b.jointPain?.[j]) || 0))])),
          redFlags: Array.isArray(b.redFlags) ? b.redFlags.filter((x: unknown) => RED_FLAGS.some((f) => f.id === x)) : [],
        };
        store.pain = [...store.pain.filter((p) => p.date !== entry.date), entry];
        saveStore(store); return json(publicState());
      }

      if (path === "/api/session/generate" && req.method === "POST") {
        const store = loadStore();
        const date = today();
        if (store.sessions.some((s) => s.date === date)) return json({ error: "今日のセッションは作成済みです" }, 409);
        const pain = store.pain.find((p) => p.date === date) ?? null;
        const assessment = assessPain(pain);
        if (assessment.care) return json({ error: "警告サインがあるため開始できません", assessment }, 403);
        if (assessment.rest) return json({ error: "完全休養日です", assessment }, 403);
        const session = generateSession(store, date, assessment);
        if (session.exercises.length === 0) return json({ error: "除外により実施できる種目がありません", assessment }, 403);
        store.sessions.push(session); saveStore(store); return json(publicState());
      }

      const exMatch = path.match(/^\/api\/session\/(\d+)\/exercise\/(\d+)$/);
      if (exMatch && req.method === "POST") {
        const store = loadStore();
        const s = store.sessions.find((x) => x.id === Number(exMatch[1]));
        const ex = s?.exercises.find((x) => x.id === Number(exMatch[2]));
        if (!s || !ex) return json({ error: "not found" }, 404);
        Object.assign(ex, applyExerciseUpdate(ex, await req.json()));
        s.totalVolume = sessionTotal(s); saveStore(store); return json(publicState());
      }

      const recMatch = path.match(/^\/api\/session\/(\d+)\/record$/);
      if (recMatch && req.method === "POST") { // history editing
        const b = await req.json();
        const store = loadStore();
        const s = store.sessions.find((x) => x.id === Number(recMatch[1]));
        if (!s) return json({ error: "not found" }, 404);
        for (const upd of Array.isArray(b.exercises) ? b.exercises : []) {
          const ex = s.exercises.find((x) => x.id === Number(upd.exerciseId));
          if (ex) Object.assign(ex, applyExerciseUpdate(ex, upd));
        }
        s.totalVolume = sessionTotal(s); saveStore(store); return json(publicState());
      }

      const compMatch = path.match(/^\/api\/session\/(\d+)\/complete$/);
      if (compMatch && req.method === "POST") {
        const store = loadStore();
        const s = store.sessions.find((x) => x.id === Number(compMatch[1]));
        if (!s) return json({ error: "not found" }, 404);
        s.status = "completed"; s.totalVolume = sessionTotal(s); saveStore(store); return json(publicState());
      }

      if (path === "/api/reset" && req.method === "POST") { resetStore(); return json(publicState()); }
      if (path.startsWith("/api/")) return json({ error: "not found" }, 404);

      const filePath = path === "/" ? join(PUBLIC, "index.html") : join(PUBLIC, path);
      const file = Bun.file(filePath);
      if (await file.exists()) return new Response(file);
      return new Response(Bun.file(join(PUBLIC, "index.html")));
    } catch (e) {
      return json({ error: String(e) }, 500);
    }
  },
});
console.log(`bodyweight-training-log listening on http://localhost:${server.port}`);
export { EXERCISES };

import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { emptyStore, migrateProfile, type Store } from "./logic";
import { logEvent } from "./log";

const DATA_FILE = process.env.DATA_FILE ?? join(process.cwd(), "data", "store.json");

// ---------- atomic writes + backup generations ----------
// A save never writes the store file in place: the previous contents
// are first rotated into backup generations (…backup.1.json is the
// newest, up to MAX_BACKUPS generations), then the new contents go to
// a temp file that is renamed over the store file, so a crash or kill
// mid-write can never leave a half-written store behind.
const MAX_BACKUPS = 3;
const backupFile = (i: number) =>
  DATA_FILE.endsWith(".json") ? `${DATA_FILE.slice(0, -".json".length)}.backup.${i}.json` : `${DATA_FILE}.backup.${i}`;

function rotateBackups(): void {
  try {
    rmSync(backupFile(MAX_BACKUPS), { force: true });
    for (let i = MAX_BACKUPS - 1; i >= 1; i--) {
      if (existsSync(backupFile(i))) renameSync(backupFile(i), backupFile(i + 1));
    }
    copyFileSync(DATA_FILE, backupFile(1));
  } catch (e) {
    // A failed rotation must not lose the save itself; it is logged.
    logEvent("store", `backup rotation failed: ${e instanceof Error ? e.name : "error"}`);
  }
}

export function saveStore(store: Store): void {
  mkdirSync(dirname(DATA_FILE), { recursive: true });
  if (existsSync(DATA_FILE)) rotateBackups();
  const tmp = `${DATA_FILE}.tmp`;
  writeFileSync(tmp, JSON.stringify(store, null, 2));
  renameSync(tmp, DATA_FILE);
}

// ---------- load, with recovery from the backup generations ----------
// A store file that exists but does not parse (or is not an object) is
// treated as corrupted: the newest backup generation that parses is
// used instead, the recovery is written to the server log, and the
// main file is restored from the recovered data. A *missing* file is
// a fresh start (deleting store.json stays the documented manual
// reset), never a recovery.
function tryParse(raw: string): Store | null {
  try {
    const v = JSON.parse(raw) as unknown;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const s = { ...emptyStore(), ...(v as Partial<Store>) };
      // Saved profiles from the two-note-fields era are carried over
      // losslessly (merged note, sex folded to the select options).
      s.profile = migrateProfile(s.profile);
      return s;
    }
  } catch { /* fall through */ }
  return null;
}

export function loadStore(): Store {
  if (!existsSync(DATA_FILE)) return emptyStore();
  const main = tryParse(readFileSync(DATA_FILE, "utf8"));
  if (main) return main;
  logEvent("store", `store file corrupted (${DATA_FILE}); trying backup generations`);
  for (let i = 1; i <= MAX_BACKUPS; i++) {
    const b = backupFile(i);
    if (!existsSync(b)) continue;
    const recovered = tryParse(readFileSync(b, "utf8"));
    if (recovered) {
      logEvent("recovery", `store recovered from backup generation ${i} (${b})`);
      try { writeFileSync(DATA_FILE, JSON.stringify(recovered, null, 2)); } catch { /* next load retries */ }
      return recovered;
    }
  }
  logEvent("store", "no usable backup generation; starting with an empty store");
  return emptyStore();
}

export function resetStore(): Store {
  const s = emptyStore(); saveStore(s); return s;
}
export { DATA_FILE };

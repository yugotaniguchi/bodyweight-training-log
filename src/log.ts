import { appendFileSync, existsSync, mkdirSync, renameSync, statSync } from "node:fs";
import { dirname, join } from "node:path";

// Server-side event log: API errors (400/500), auth refusals, store
// recovery and startup, each line stamped with an ISO timestamp. It
// lives next to the data file and is capped: past ~256 KB it rotates
// to a single `.1` sibling, so at most two files ever exist. Only the
// event kind, the request method/path and a short reason are written —
// never request bodies or stored personal data.
const DATA_FILE = process.env.DATA_FILE ?? join(process.cwd(), "data", "store.json");
export const LOG_FILE = process.env.LOG_FILE ?? join(dirname(DATA_FILE), "server.log");
const MAX_LOG_BYTES = 256 * 1024;

export function logEvent(kind: string, message: string): void {
  try {
    mkdirSync(dirname(LOG_FILE), { recursive: true });
    if (existsSync(LOG_FILE) && statSync(LOG_FILE).size > MAX_LOG_BYTES) {
      renameSync(LOG_FILE, LOG_FILE + ".1"); // keep exactly one old generation
    }
    appendFileSync(LOG_FILE, `${new Date().toISOString()} [${kind}] ${message}\n`);
  } catch { /* logging must never break the app */ }
}

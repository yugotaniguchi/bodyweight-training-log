import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { emptyStore, type Store } from "./logic";

const DATA_FILE = process.env.DATA_FILE ?? join(process.cwd(), "data", "store.json");

export function loadStore(): Store {
  try {
    if (existsSync(DATA_FILE)) return { ...emptyStore(), ...JSON.parse(readFileSync(DATA_FILE, "utf8")) };
  } catch { /* corrupted file -> start empty rather than crash */ }
  return emptyStore();
}
export function saveStore(store: Store): void {
  mkdirSync(dirname(DATA_FILE), { recursive: true });
  writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
}
export function resetStore(): Store {
  const s = emptyStore(); saveStore(s); return s;
}
export { DATA_FILE };

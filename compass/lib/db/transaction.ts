import { sqliteRaw } from "./client";
export function transact<T>(fn: () => T): T {
  return sqliteRaw.transaction(fn)();
}

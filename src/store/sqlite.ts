/** SPDX-License-Identifier: MIT */
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

export type CacheEntry = {
  id: string;
  namespace: string;
  exact_key: string;
  user_text: string;
  response_json: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  est_cost_usd: number;
  created_at: number;
  expires_at: number;
};

/**
 * File-backed SQLite via Node's built-in `node:sqlite` (no native addon compile).
 * Requires Node >= 22.5 with `--experimental-sqlite` (bin wrapper enables it).
 */
export class CacheStore {
  private db: DatabaseSync;

  constructor(dataDir: string) {
    fs.mkdirSync(dataDir, { recursive: true });
    const dbPath = path.join(dataDir, "jevcache.db");
    this.db = new DatabaseSync(dbPath);
    this.db.exec("PRAGMA journal_mode = WAL;");
    this.db.exec("PRAGMA busy_timeout = 5000;");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS entries (
        id TEXT PRIMARY KEY,
        namespace TEXT NOT NULL,
        exact_key TEXT NOT NULL UNIQUE,
        user_text TEXT NOT NULL,
        response_json TEXT NOT NULL,
        model TEXT NOT NULL,
        prompt_tokens INTEGER NOT NULL DEFAULT 0,
        completion_tokens INTEGER NOT NULL DEFAULT 0,
        est_cost_usd REAL NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_entries_ns_created ON entries(namespace, created_at DESC);
      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  }

  getByExactKey(exactKey: string, now = Date.now()): CacheEntry | null {
    const row = this.db.prepare(`SELECT * FROM entries WHERE exact_key = ?`).get(exactKey) as
      | CacheEntry
      | undefined;
    if (!row) return null;
    if (row.expires_at <= now) {
      this.db.prepare(`DELETE FROM entries WHERE id = ?`).run(row.id);
      return null;
    }
    return row;
  }

  getById(id: string, now = Date.now()): CacheEntry | null {
    const row = this.db.prepare(`SELECT * FROM entries WHERE id = ?`).get(id) as CacheEntry | undefined;
    if (!row) return null;
    if (row.expires_at <= now) {
      this.db.prepare(`DELETE FROM entries WHERE id = ?`).run(row.id);
      return null;
    }
    return row;
  }

  recentInNamespace(namespace: string, limit: number, excludeExactKey?: string, now = Date.now()): CacheEntry[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM entries WHERE namespace = ? AND expires_at > ? ORDER BY created_at DESC LIMIT ?`,
      )
      .all(namespace, now, limit * 2) as CacheEntry[];
    return rows.filter((r) => r.exact_key !== excludeExactKey).slice(0, limit);
  }

  upsert(entry: Omit<CacheEntry, "id"> & { id?: string }, maxEntries: number): CacheEntry {
    const id = entry.id ?? randomUUID();
    this.db
      .prepare(
        `INSERT INTO entries (id, namespace, exact_key, user_text, response_json, model, prompt_tokens, completion_tokens, est_cost_usd, created_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(exact_key) DO UPDATE SET
           response_json=excluded.response_json,
           prompt_tokens=excluded.prompt_tokens,
           completion_tokens=excluded.completion_tokens,
           est_cost_usd=excluded.est_cost_usd,
           created_at=excluded.created_at,
           expires_at=excluded.expires_at,
           user_text=excluded.user_text,
           id=excluded.id`,
      )
      .run(
        id,
        entry.namespace,
        entry.exact_key,
        entry.user_text,
        entry.response_json,
        entry.model,
        entry.prompt_tokens,
        entry.completion_tokens,
        entry.est_cost_usd,
        entry.created_at,
        entry.expires_at,
      );
    this.enforceMax(maxEntries);
    return this.getById(id)!;
  }

  delete(id: string): boolean {
    const info = this.db.prepare(`DELETE FROM entries WHERE id = ?`).run(id);
    return Number(info.changes) > 0;
  }

  flush(): number {
    const info = this.db.prepare(`DELETE FROM entries`).run();
    return Number(info.changes);
  }

  count(): number {
    const row = this.db.prepare(`SELECT COUNT(*) AS c FROM entries`).get() as { c: number | bigint };
    return Number(row.c);
  }

  private enforceMax(maxEntries: number): void {
    const c = this.count();
    if (c <= maxEntries) return;
    const overflow = c - maxEntries;
    this.db
      .prepare(`DELETE FROM entries WHERE id IN (SELECT id FROM entries ORDER BY created_at ASC LIMIT ?)`)
      .run(overflow);
  }

  close(): void {
    this.db.close();
  }
}

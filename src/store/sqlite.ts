/** SPDX-License-Identifier: MIT */
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { FreshnessClass } from "../freshness.js";

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
  freshness_class: FreshnessClass;
  as_of: number | null;
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
        expires_at INTEGER NOT NULL,
        freshness_class TEXT NOT NULL DEFAULT 'stable',
        as_of INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_entries_ns_created ON entries(namespace, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_entries_expires ON entries(expires_at);
      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
    this.migrate();
  }

  private migrate(): void {
    const cols = this.db.prepare(`PRAGMA table_info(entries)`).all() as { name: string }[];
    const names = new Set(cols.map((c) => c.name));
    if (!names.has("freshness_class")) {
      this.db.exec(`ALTER TABLE entries ADD COLUMN freshness_class TEXT NOT NULL DEFAULT 'stable'`);
    }
    if (!names.has("as_of")) {
      this.db.exec(`ALTER TABLE entries ADD COLUMN as_of INTEGER`);
    }
  }

  private rowToEntry(row: Record<string, unknown>): CacheEntry {
    const cls = String(row.freshness_class ?? "stable");
    const freshness_class: FreshnessClass =
      cls === "live" || cls === "short" || cls === "durable" || cls === "stable" ? cls : "stable";
    return {
      id: String(row.id),
      namespace: String(row.namespace),
      exact_key: String(row.exact_key),
      user_text: String(row.user_text),
      response_json: String(row.response_json),
      model: String(row.model),
      prompt_tokens: Number(row.prompt_tokens),
      completion_tokens: Number(row.completion_tokens),
      est_cost_usd: Number(row.est_cost_usd),
      created_at: Number(row.created_at),
      expires_at: Number(row.expires_at),
      freshness_class,
      as_of: row.as_of == null ? null : Number(row.as_of),
    };
  }

  getByExactKey(exactKey: string, now = Date.now()): CacheEntry | null {
    const row = this.db.prepare(`SELECT * FROM entries WHERE exact_key = ?`).get(exactKey) as
      | Record<string, unknown>
      | undefined;
    if (!row) return null;
    const entry = this.rowToEntry(row);
    if (entry.expires_at <= now) {
      this.db.prepare(`DELETE FROM entries WHERE id = ?`).run(entry.id);
      return null;
    }
    return entry;
  }

  getById(id: string, now = Date.now()): CacheEntry | null {
    const row = this.db.prepare(`SELECT * FROM entries WHERE id = ?`).get(id) as
      | Record<string, unknown>
      | undefined;
    if (!row) return null;
    const entry = this.rowToEntry(row);
    if (entry.expires_at <= now) {
      this.db.prepare(`DELETE FROM entries WHERE id = ?`).run(entry.id);
      return null;
    }
    return entry;
  }

  recentInNamespace(
    namespace: string,
    limit: number,
    excludeExactKey?: string,
    now = Date.now(),
    maxAgeMs?: number,
  ): CacheEntry[] {
    const minCreated = maxAgeMs != null && maxAgeMs > 0 ? now - maxAgeMs : 0;
    const rows = this.db
      .prepare(
        `SELECT * FROM entries WHERE namespace = ? AND expires_at > ? AND created_at >= ? ORDER BY created_at DESC LIMIT ?`,
      )
      .all(namespace, now, minCreated, limit * 2) as Record<string, unknown>[];
    return rows
      .map((r) => this.rowToEntry(r))
      .filter((r) => r.exact_key !== excludeExactKey)
      .slice(0, limit);
  }

  upsert(
    entry: Omit<CacheEntry, "id" | "freshness_class" | "as_of"> & {
      id?: string;
      freshness_class?: FreshnessClass;
      as_of?: number | null;
    },
    maxEntries: number,
  ): CacheEntry {
    const id = entry.id ?? randomUUID();
    const freshness_class = entry.freshness_class ?? "stable";
    const as_of = entry.as_of ?? entry.created_at;
    this.db
      .prepare(
        `INSERT INTO entries (id, namespace, exact_key, user_text, response_json, model, prompt_tokens, completion_tokens, est_cost_usd, created_at, expires_at, freshness_class, as_of)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(exact_key) DO UPDATE SET
           response_json=excluded.response_json,
           prompt_tokens=excluded.prompt_tokens,
           completion_tokens=excluded.completion_tokens,
           est_cost_usd=excluded.est_cost_usd,
           created_at=excluded.created_at,
           expires_at=excluded.expires_at,
           user_text=excluded.user_text,
           freshness_class=excluded.freshness_class,
           as_of=excluded.as_of,
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
        freshness_class,
        as_of,
      );
    this.enforceMax(maxEntries);
    this.sweepExpired();
    return this.getById(id)!;
  }

  sweepExpired(now = Date.now()): number {
    const info = this.db.prepare(`DELETE FROM entries WHERE expires_at <= ?`).run(now);
    return Number(info.changes);
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

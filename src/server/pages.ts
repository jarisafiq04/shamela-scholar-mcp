/**
 * Per-book SQLite reader: printed-page labels (page table) and TOC structure
 * (title table). Text itself lives in Lucene (read via the Java helper).
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { Database } from "sql.js";

import { openSqlite } from "./sqljs.js";

export function resolveBookPath(databaseRoot: string, bookId: number): string | null {
  const bucket = bookId % 1000;
  const spellings =
    bucket < 100 ? [String(bucket).padStart(3, "0"), String(bucket)] : [String(bucket)];
  for (const dir of spellings) {
    const p = path.join(databaseRoot, "book", dir, `${bookId}.db`);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

const BOOK_LITERAL = "الكتاب";

function formatPrintedPage(row: { part: string | null; page: number | null }): string | null {
  const part = row.part?.trim() ?? "";
  const pageStr = row.page != null ? String(row.page) : "";
  if (part && part !== BOOK_LITERAL) {
    return pageStr ? `${part}/ ${pageStr}` : part;
  }
  return pageStr || null;
}

export interface TocRow {
  title_id: number;
  page_id: number;
  parent_id: number;
}

export class BookStore {
  private readonly db = new Map<number, { db: Database; at: number }>();
  private readonly databaseRoot: string;

  constructor(databaseRoot: string) {
    this.databaseRoot = databaseRoot;
  }

  private async getDb(bookId: number): Promise<Database | null> {
    const cached = this.db.get(bookId);
    if (cached) {
      this.db.delete(bookId);
      this.db.set(bookId, cached);
      return cached.db;
    }
    const p = resolveBookPath(this.databaseRoot, bookId);
    if (!p) return null;
    try {
      const db = await openSqlite(p);
      if (!db) return null;
      if (this.db.size >= 50) {
        const oldest = this.db.keys().next().value;
        if (oldest !== undefined) {
          try {
            this.db.get(oldest)?.db.close();
          } catch {
            /* ignore */
          }
          this.db.delete(oldest);
        }
      }
      this.db.set(bookId, { db, at: Date.now() });
      return db;
    } catch {
      return null;
    }
  }

  async printedPage(bookId: number, pageId: number): Promise<string | null> {
    const db = await this.getDb(bookId);
    if (!db) return null;
    const stmt = db.prepare("SELECT part, page FROM page WHERE id = ?");
    try {
      stmt.bind([pageId]);
      if (!stmt.step()) return null;
      const r = stmt.get();
      const part = r[0] ? String(r[0]).trim() : null;
      const page = r[1] != null ? Number(r[1]) : null;
      return formatPrintedPage({ part, page });
    } finally {
      stmt.free();
    }
  }

  async printedPages(bookId: number, pageIds: number[]): Promise<Map<number, string | null>> {
    const db = await this.getDb(bookId);
    if (!db || !pageIds.length) return new Map();
    const placeholders = pageIds.map(() => "?").join(",");
    const stmt = db.prepare(`SELECT id, part, page FROM page WHERE id IN (${placeholders})`);
    const byId = new Map<number, string | null>();
    try {
      stmt.bind(pageIds);
      while (stmt.step()) {
        const r = stmt.get();
        const pid = Number(r[0]);
        const part = r[1] ? String(r[1]).trim() : null;
        const page = r[2] != null ? Number(r[2]) : null;
        byId.set(pid, formatPrintedPage({ part, page }));
      }
    } finally {
      stmt.free();
    }
    return new Map(pageIds.map((id) => [id, byId.get(id) ?? null]));
  }

  async tocRows(bookId: number): Promise<TocRow[]> {
    const db = await this.getDb(bookId);
    if (!db) return [];
    const stmt = db.prepare("SELECT id, page, parent FROM title ORDER BY id");
    const out: TocRow[] = [];
    try {
      while (stmt.step()) {
        const r = stmt.get();
        out.push({ title_id: Number(r[0]), page_id: Number(r[1] ?? 0), parent_id: Number(r[2] ?? 0) });
      }
    } finally {
      stmt.free();
    }
    return out;
  }

  async pageCount(bookId: number): Promise<number> {
    const db = await this.getDb(bookId);
    if (!db) return 0;
    const stmt = db.prepare("SELECT MAX(id) FROM page");
    try {
      return stmt.step() ? Number(stmt.get()[0] ?? 0) : 0;
    } finally {
      stmt.free();
    }
  }

  close(): void {
    for (const { db } of this.db.values()) {
      try {
        db.close();
      } catch {
        /* ignore */
      }
    }
    this.db.clear();
  }
}
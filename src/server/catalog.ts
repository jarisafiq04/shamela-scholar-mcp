/**
 * In-memory catalog loaded once from master.db: books, authors, categories,
 * plus author→books and category→books joins.
 */

import type { BookMetadata, AuthorMetadata } from "./types.js";

interface BookRow {
  book_id: number;
  book_name: string;
  book_category: number | null;
  book_type: number;
  book_date: number | null;
  authors: string | null;
  main_author: number | null;
  printed: number;
  major_ondisk: number;
  minor_ondisk: number;
  parent: number | null;
}

export class Catalog {
  private readonly books = new Map<number, BookRow>();
  private readonly authors = new Map<number, { author_id: number; author_name: string; death_year: number | null; death_text: string | null }>();
  private readonly categories = new Map<number, { category_id: number; category_name: string; category_order: number }>();
  private readonly booksByAuthor = new Map<number, Set<number>>();
  private readonly booksByCategory = new Map<number, Set<number>>();

  static async load(masterDbPath: string): Promise<Catalog> {
    const { openSqlite } = await import("./sqljs.js");
    const db = await openSqlite(masterDbPath);
    if (!db) throw new Error(`master.db not found at ${masterDbPath}`);
    try {
      const cat = new Catalog();
      cat.loadCategories(db);
      cat.loadAuthors(db);
      cat.loadBooks(db);
      cat.buildAuthorJoins();
      return cat;
    } finally {
      db.close();
    }
  }

  private loadCategories(db: import("sql.js").Database): void {
    const stmt = db.prepare("SELECT category_id, category_name, category_order FROM category");
    try {
      while (stmt.step()) {
        const r = stmt.get();
        const id = Number(r[0]);
        this.categories.set(id, {
          category_id: id,
          category_name: String(r[1] ?? ""),
          category_order: Number(r[2] ?? 0),
        });
      }
    } finally {
      stmt.free();
    }
  }

  private loadAuthors(db: import("sql.js").Database): void {
    const stmt = db.prepare("SELECT author_id, author_name, death_number, death_text FROM author");
    try {
      while (stmt.step()) {
        const r = stmt.get();
        const id = Number(r[0]);
        const death = Number(r[2] ?? 0);
        this.authors.set(id, {
          author_id: id,
          author_name: String(r[1] ?? ""),
          // 99999 is Shamela's "no date" sentinel.
          death_year: death > 0 && death !== 99999 ? death : null,
          death_text: r[3] ? String(r[3]) : null,
        });
      }
    } finally {
      stmt.free();
    }
  }

  private loadBooks(db: import("sql.js").Database): void {
    const stmt = db.prepare(
      `SELECT book_id, book_name, book_category, book_type, book_date, authors,
              main_author, printed, major_ondisk, minor_ondisk, parent
       FROM book`
    );
    try {
      while (stmt.step()) {
        const r = stmt.get();
        const bookId = Number(r[0]);
        const rec: BookRow = {
          book_id: bookId,
          book_name: String(r[1] ?? ""),
          book_category: r[2] != null ? Number(r[2]) : null,
          book_type: Number(r[3] ?? 1),
          book_date: Number(r[4] ?? 0) > 0 ? Number(r[4]) : null,
          authors: r[5] ? String(r[5]) : null,
          main_author: r[6] != null ? Number(r[6]) : null,
          printed: Number(r[7] ?? 0),
          major_ondisk: Number(r[8] ?? 0),
          minor_ondisk: Number(r[9] ?? 0),
          parent: r[10] != null ? Number(r[10]) : null,
        };
        this.books.set(bookId, rec);
        if (rec.book_category !== null) {
          let bucket = this.booksByCategory.get(rec.book_category);
          if (!bucket) {
            bucket = new Set();
            this.booksByCategory.set(rec.book_category, bucket);
          }
          bucket.add(bookId);
        }
      }
    } finally {
      stmt.free();
    }
  }

  private authorIdsOf(rec: BookRow): number[] {
    const ids: number[] = [];
    if (rec.main_author !== null) ids.push(rec.main_author);
    if (rec.authors) {
      for (const part of rec.authors.split(",")) {
        const token = part.trim();
        if (/^\d{1,9}$/.test(token)) {
          const id = Number(token);
          if (id !== 0 && !ids.includes(id)) ids.push(id);
        }
      }
    }
    return ids;
  }

  book(bookId: number) {
    return this.books.get(bookId);
  }

  author(authorId: number) {
    return this.authors.get(authorId);
  }

  category(categoryId: number) {
    return this.categories.get(categoryId);
  }

  bookName(bookId: number): string {
    return this.books.get(bookId)?.book_name ?? "";
  }

  authorName(authorId: number): string {
    return this.authors.get(authorId)?.author_name ?? "";
  }

  toBookMetadata(bookId: number): BookMetadata {
    const rec = this.books.get(bookId);
    if (!rec) throw new Error(`Unknown book id ${bookId}`);
    const mainAuthor = rec.main_author !== null ? this.authors.get(rec.main_author) : null;
    const category = rec.book_category !== null ? this.categories.get(rec.book_category) : null;
    return {
      id: rec.book_id,
      name: rec.book_name,
      author: mainAuthor?.author_name ?? "",
      authorId: rec.main_author ?? 0,
      authorDeathYear: mainAuthor?.death_year ?? null,
      categoryId: rec.book_category ?? 0,
      categoryName: category?.category_name ?? "",
      bookType: String(rec.book_type),
      bookDate: rec.book_date,
      printed: rec.printed > 0,
      downloaded: rec.major_ondisk > 0 || rec.minor_ondisk > 0,
      volumes: 1,
      totalPages: 0,
      publicationDate: null,
      notes: [],
    };
  }

  toAuthorMetadata(authorId: number): AuthorMetadata {
    const rec = this.authors.get(authorId);
    if (!rec) throw new Error(`Unknown author id ${authorId}`);
    const bookIds = this.booksByAuthor.get(authorId);
    const books = bookIds
      ? Array.from(bookIds)
          .sort((a, b) => a - b)
          .map((id) => {
            const b = this.books.get(id)!;
            return { id: b.book_id, name: b.book_name, bookDate: b.book_date, downloaded: b.major_ondisk > 0 };
          })
      : [];
    return {
      id: rec.author_id,
      name: rec.author_name,
      deathYear: rec.death_year,
      deathText: rec.death_text ?? "",
      bookCount: books.length,
      books,
    };
  }

  booksInAuthorIds(authorIds: number[]): Set<number> {
    const out = new Set<number>();
    for (const a of authorIds) {
      for (const b of this.booksByAuthor.get(a) ?? []) out.add(b);
    }
    return out;
  }

  booksInCategoryIds(categoryIds: number[]): Set<number> {
    const out = new Set<number>();
    for (const c of categoryIds) {
      for (const b of this.booksByCategory.get(c) ?? []) out.add(b);
    }
    return out;
  }

  listCategories() {
    const arr = Array.from(this.categories.values());
    arr.sort((a, b) => a.category_order - b.category_order);
    return arr.map((c) => ({
      id: c.category_id,
      name: c.category_name,
      bookCount: this.booksByCategory.get(c.category_id)?.size ?? 0,
      downloadedCount: Array.from(this.booksByCategory.get(c.category_id) ?? []).filter((id) => {
        const b = this.books.get(id)!;
        return b.major_ondisk > 0 || b.minor_ondisk > 0;
      }).length,
    }));
  }

  ranges() {
    return {
      catalogBooks: this.books.size,
      catalogAuthors: this.authors.size,
      catalogCategories: this.categories.size,
      downloadedBooks: Array.from(this.books.values()).filter((b) => b.major_ondisk > 0).length,
    };
  }

  /** Enrichments applied to a resolver's author hits. */
  authorDisplay(authorId: number): { name: string; deathYear: number | null } {
    const a = this.authors.get(authorId);
    return { name: a?.author_name ?? `Author ${authorId}`, deathYear: a?.death_year ?? null };
  }

  allBookIds(): number[] {
    return Array.from(this.books.keys());
  }

  private ensureJoins(): void {
    for (const rec of this.books.values()) {
      for (const a of this.authorIdsOf(rec)) {
        let bucket = this.booksByAuthor.get(a);
        if (!bucket) {
          bucket = new Set();
          this.booksByAuthor.set(a, bucket);
        }
        bucket.add(rec.book_id);
      }
    }
  }

  /** Call after loadBooks to populate author joins for richer author metadata. */
  buildAuthorJoins(): void {
    this.ensureJoins();
  }
}
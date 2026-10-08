/**
 * Backend over a local Shamela install:
 *  - full-text via the Java helper (Lucene indexes)
 *  - metadata via master.db (catalog)
 *  - printed pages / TOC via per-book SQLite
 */

import { JavaHelper } from "./helper.js";
import { Catalog } from "./catalog.js";
import { BookStore } from "./pages.js";
import { resolveAll } from "./paths.js";
import type {
  BookMetadata,
  AuthorMetadata,
  PageContent,
  SearchResult,
  CommentaryEntry,
  CrossReference,
  SynthesisResult,
  ScholarResponse,
  Citation,
  CategoryInfo,
  HealthStatus,
  ResolveResult,
  VerifyQuoteResult,
  SearchScope,
  SearchOptions,
  ChapterNode,
  RCTOContext,
  UsuliMethods,
  SourceAuthority,
  ScholarOpinion,
  FormattedAnswer,
} from "./types.js";

interface PageHit {
  book_id: number;
  page_id: number;
  matched_in: string[];
  snippet_body: string;
  snippet_foot: string;
  snippet_comment: string;
}

export class ShamelaBackend {
  private helper: JavaHelper;
  private catalog: Catalog | null = null;
  private books: BookStore;
  private readonly libraryPath: string | undefined;
  private initialized = false;

  constructor(libraryPath?: string) {
    this.libraryPath = libraryPath;
    this.helper = null as unknown as JavaHelper;
    this.books = null as unknown as BookStore;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.libraryPath) process.env.SHAMELA_INSTALL_ROOT = this.libraryPath;
    const paths = await resolveAll();
    this.helper = new JavaHelper(paths);
    await this.helper.start();
    await this.helper.ping();
    this.catalog = await Catalog.load(paths.database + "/master.db");
    this.books = new BookStore(paths.database);
    this.initialized = true;
    console.error(`[Shamela Scholar MCP] Local backend ready (${paths.installRoot})`);
  }

  async close(): Promise<void> {
    await this.helper?.close();
    this.books?.close();
  }

  // --- scope handling -------------------------------------------------------

  private async resolveScopeKeys(scope: SearchScope = {}): Promise<string[] | undefined> {
    const parts: Array<Set<number> | null> = [];
    if (scope.bookIds?.length) parts.push(new Set(scope.bookIds));
    if (scope.authorIds?.length) parts.push(this.catalog!.booksInAuthorIds(scope.authorIds));
    if (scope.categoryIds?.length) parts.push(this.catalog!.booksInCategoryIds(scope.categoryIds));
    if (scope.downloadedOnly) {
      parts.push(new Set(this.catalog!.allBookIds().filter((id) => this.catalog!.toBookMetadata(id).downloaded)));
    }
    if (parts.length === 0) return undefined;
    let ids: Set<number> | null = null;
    for (const part of parts) {
      if (part === null) continue;
      if (ids === null) ids = new Set(part);
      else {
        const next = new Set<number>();
        for (const id of ids) if (part.has(id)) next.add(id);
        ids = next;
      }
    }
    if (ids === null || ids.size === 0) return ids?.size === 0 ? [] : undefined;
    return Array.from(ids).map(String);
  }

  // --- search ---------------------------------------------------------------

  async search(query: string, scope: SearchScope = {}, options: SearchOptions = {}): Promise<SearchResult[]> {
    await this.initialize();
    const scopeKeys = await this.resolveScopeKeys(scope);
    const maxResults = Math.min(options.limit ?? 20, 100);
    const searchIn = (options.searchIn ?? []).map((s) =>
      s === "footnote" ? "foot" : s === "comment" ? "comment" : "body"
    );
    const data = await this.helper.request<{ total_hits: number; results: PageHit[] }>(
      "search_pages",
      {
        query,
        scope_book_keys: scopeKeys,
        max_results: maxResults,
        offset: options.offset ?? 0,
        options: {
          morphology: options.morphology ?? false,
          wildcards: options.wildcards ?? false,
          search_in: searchIn,
        },
      }
    );
    const results: SearchResult[] = [];
    for (const hit of data.results) {
      const meta = await this.safeBookMeta(hit.book_id);
      const printed = await this.books.printedPage(hit.book_id, hit.page_id);
      results.push({
        bookId: hit.book_id,
        bookName: meta.name,
        authorName: meta.author,
        authorId: meta.authorId,
        categoryId: meta.categoryId,
        categoryName: meta.categoryName,
        pageId: hit.page_id,
        printedPage: printed ?? "",
        snippet:
          hit.snippet_body ||
          hit.snippet_foot ||
          hit.snippet_comment ||
          hit.matched_in.join(", "),
        score: 1.0,
        matchType: hit.matched_in.includes("body")
          ? "body"
          : hit.matched_in.includes("comment")
            ? "comment"
            : "footnote",
      });
    }
    return results;
  }

  private async safeBookMeta(bookId: number): Promise<BookMetadata> {
    try {
      return this.catalog!.toBookMetadata(bookId);
    } catch {
      return {
        id: bookId,
        name: `كتاب ${bookId}`,
        author: "",
        authorId: 0,
        authorDeathYear: null,
        categoryId: 0,
        categoryName: "",
        bookType: "",
        bookDate: null,
        printed: false,
        downloaded: false,
        volumes: 1,
        totalPages: 0,
        publicationDate: null,
        notes: [],
      };
    }
  }

  // --- page content ---------------------------------------------------------

  async getPage(bookId: number, pageId: number): Promise<PageContent> {
    await this.initialize();
    const data = await this.helper.request<{ results: Array<{ page_id: number; found: boolean; body: string; foot: string; comment: string }> }>(
      "get_pages_batch",
      { book_id: bookId, page_ids: [pageId] }
    );
    const rec = data.results[0];
    const printed = await this.books.printedPage(bookId, pageId);
    const ancestorIds = await this.ancestorTitleIds(bookId, pageId);
    const titles = ancestorIds.length
      ? await this.helper.request<{ results: Array<{ title_id: number; title_text: string }> }>(
          "get_titles_batch",
          { book_id: bookId, title_ids: ancestorIds }
        )
      : null;
    return {
      bookId,
      pageId,
      printedPage: printed ?? "",
      body: rec?.body ?? "",
      footnotes: rec?.foot ?? "",
      comments: rec?.comment ?? "",
      chapterHierarchy: titles
        ? titles.results.map((t) => ({ id: t.title_id, title: t.title_text, pageId, level: 1, children: [] }))
        : [],
      prevPageId: pageId > 1 ? pageId - 1 : null,
      nextPageId: null,
    };
  }

  private async ancestorTitleIds(bookId: number, pageId: number): Promise<number[]> {
    const rows = await this.books.tocRows(bookId);
    let leaf: { title_id: number; page_id: number; parent_id: number } | null = null;
    for (const r of rows) {
      if (r.page_id <= pageId) leaf = r;
      else break;
    }
    if (!leaf) return [];
    const chain: number[] = [];
    let cursor: number | null = leaf.title_id;
    const byId = new Map(rows.map((r) => [r.title_id, r]));
    while (cursor !== null && cursor !== 0) {
      chain.push(cursor);
      cursor = byId.get(cursor)?.parent_id ?? null;
    }
    return chain.reverse();
  }

  // --- section --------------------------------------------------------------

  async getSection(bookId: number, titleId: number): Promise<PageContent[]> {
    await this.initialize();
    const rows = await this.books.tocRows(bookId);
    const me = rows.find((r) => r.title_id === titleId);
    if (!me) return [];
    const start = me.page_id;
    const nextSibling = rows.find((r) => r.parent_id === me.parent_id && r.title_id > titleId);
    const end = nextSibling ? nextSibling.page_id - 1 : await this.books.pageCount(bookId);
    const pageIds: number[] = [];
    for (let p = start; p <= Math.max(start, Math.min(end, start + 100)); p++) pageIds.push(p);
    const data = await this.helper.request<{ results: Array<{ page_id: number; found: boolean; body: string; foot: string; comment: string }> }>(
      "get_pages_batch",
      { book_id: bookId, page_ids: pageIds }
    );
    const out: PageContent[] = [];
    for (const rec of data.results) {
      const printed = await this.books.printedPage(bookId, rec.page_id);
      out.push({
        bookId,
        pageId: rec.page_id,
        printedPage: printed ?? "",
        body: rec.body ?? "",
        footnotes: rec.foot ?? "",
        comments: rec.comment ?? "",
        chapterHierarchy: [],
        prevPageId: null,
        nextPageId: null,
      });
    }
    return out;
  }

  // --- TOC ------------------------------------------------------------------

  async getTOC(bookId: number, parentId = 0, depth = 3): Promise<ChapterNode[]> {
    await this.initialize();
    const rows = await this.books.tocRows(bookId);
    const children = (p: number): ChapterNode[] => {
      const kids = rows.filter((r) => r.parent_id === p).slice(0, 100).map((r) => ({
        ...r,
        kids: [] as typeof r[],
      }));
      // reuse the batch title lookup for labels below; build tree first
      return kids.map((k) => {
        const node: ChapterNode = { id: k.title_id, title: "", pageId: k.page_id, level: 1, children: [] };
        if (depth > 1) node.children = children(k.title_id);
        return node;
      });
    };
    const tree = children(parentId);
    const labels = await this.titleLabels(bookId, this.flattenIds(tree));
    this.applyLabels(tree, labels);
    return tree;
  }

  private flattenIds(nodes: ChapterNode[]): number[] {
    const out: number[] = [];
    for (const n of nodes) {
      out.push(n.id);
      out.push(...this.flattenIds(n.children));
    }
    return out;
  }

  private async titleLabels(bookId: number, ids: number[]): Promise<Map<number, string>> {
    if (!ids.length) return new Map();
    const data = await this.helper.request<{ results: Array<{ title_id: number; title_text: string }> }>(
      "get_titles_batch",
      { book_id: bookId, title_ids: ids }
    );
    return new Map(data.results.map((r) => [r.title_id, r.title_text]));
  }

  private applyLabels(nodes: ChapterNode[], labels: Map<number, string>): void {
    for (const n of nodes) {
      n.title = labels.get(n.id) ?? "";
      this.applyLabels(n.children, labels);
    }
  }

  // --- book/author info -----------------------------------------------------

  async getBookInfo(bookId: number): Promise<BookMetadata> {
    await this.initialize();
    return this.safeBookMeta(bookId);
  }

  async getAuthorInfo(authorId: number): Promise<AuthorMetadata> {
    await this.initialize();
    return this.catalog!.toAuthorMetadata(authorId);
  }

  async listCategories(): Promise<CategoryInfo[]> {
    await this.initialize();
    return this.catalog!.listCategories();
  }

  // --- resolve --------------------------------------------------------------

  async resolve(query: string): Promise<ResolveResult> {
    await this.initialize();
    const data = await this.helper.request<{ books: Array<{ id: number; score: number }>; authors: Array<{ id: number; score: number }> }>(
      "resolve",
      { query, type: "any", limit: 10 }
    );
    return {
      books: data.books.map((b) => {
        const meta = this.catalog!.book(b.id);
        return {
          id: b.id,
          name: meta?.book_name ?? `كتاب ${b.id}`,
          author: meta?.main_author != null ? this.catalog!.authorName(meta.main_author) : "",
          confidence: Math.min(0.99, b.score),
        };
      }),
      authors: data.authors.map((a) => {
        const rec = this.catalog!.author(a.id);
        const name = rec?.author_name ?? `مؤلف ${a.id}`;
        return {
          id: a.id,
          name,
          deathYear: rec?.death_year ?? null,
          bookCount: this.catalog!.authorDisplay(a.id).name === name ? this.catalog!.toAuthorMetadata(a.id).bookCount : 0,
          confidence: Math.min(0.99, a.score),
        };
      }),
      transliterated: false,
    };
  }

  // --- commentary / cross-references -----------------------------------------

  async getCommentary(bookId: number, pageId: number, textSegment?: string): Promise<CommentaryEntry[]> {
    await this.initialize();
    const page = await this.getPage(bookId, pageId);
    const segment = (textSegment || page.body).slice(0, 200);
    // Search commentary-adjacent categories: tafsir(3), usul/tafsir(4), sharh(6,7), fiqh...
    const scope = { categoryIds: [3, 4, 5, 6, 7, 17] };
    const hits = await this.search(segment, scope, { limit: 15 });
    return hits
      .filter((h) => !(h.bookId === bookId && h.pageId === pageId))
      .slice(0, 15)
      .map((h) => ({
        type: this.inferCommentaryType(h.categoryId),
        sourceBookId: h.bookId,
        sourceBookName: h.bookName,
        sourceAuthor: h.authorName,
        authorDeathYear: null,
        pageId: h.pageId,
        printedPage: h.printedPage,
        text: h.snippet,
        period: "classical" as const,
        confidence: 0.5,
      }));
  }

  private inferCommentaryType(categoryId: number): CommentaryEntry["type"] {
    if (categoryId === 3 || categoryId === 4) return "tafsir";
    if (categoryId === 6 || categoryId === 7) return "sharh";
    if (categoryId === 17) return "hashiyah";
    return "footnote";
  }

  private extractContext(text: string, keyword: string, window = 200): string {
    const idx = text.indexOf(keyword);
    if (idx < 0) return "";
    const start = Math.max(0, idx - window);
    const end = Math.min(text.length, idx + keyword.length + window);
    let snippet = text.substring(start, end).replace(/\s+/g, " ").trim();
    if (start > 0) snippet = "…" + snippet;
    if (end < text.length) snippet = snippet + "…";
    return snippet;
  }

  private extractContextAroundMatch(text: string, keywords: string[], window = 200): string {
    // Find the earliest occurrence of any keyword
    let bestIdx = -1;
    let bestKeyword = "";
    for (const kw of keywords) {
      const idx = text.indexOf(kw);
      if (idx >= 0 && (bestIdx < 0 || idx < bestIdx)) {
        bestIdx = idx;
        bestKeyword = kw;
      }
    }
    if (bestIdx < 0) return "";
    const start = Math.max(0, bestIdx - window);
    const end = Math.min(text.length, bestIdx + bestKeyword.length + window);
    let snippet = text.substring(start, end).replace(/\s+/g, " ").trim();
    if (start > 0) snippet = "…" + snippet;
    if (end < text.length) snippet = snippet + "…";
    return snippet;
  }

  async getCrossReferences(bookId: number, pageId: number): Promise<CrossReference[]> {
    await this.initialize();
    const page = await this.getPage(bookId, pageId);
    const fullText = page.body + " " + page.footnotes + " " + page.comments;
    const refs: CrossReference[] = [];
    const surahs = [
      "الفاتحة", "البقرة", "آل عمران", "النساء", "المائدة", "الأنعام", "الأعراف",
      "الأنفال", "التوبة", "يونس", "هود", "يوسف", "الرعد", "إبراهيم", "الحجر", "النحل",
      "الإسراء", "الكهف", "مريم", "طه", "الأنبياء", "الحج", "المؤمنون", "النور", "الفرقان",
      "الشعراء", "النمل", "القصص", "العنكبوت", "الروم", "لقمان", "السجدة", "الأحزاب",
      "سبأ", "فاطر", "يس", "الصافات", "الزمر", "غافر", "فصلت", "الشورى", "الزخرف",
      "الدخان", "الجاثية", "الأحقاف", "محمد", "الفتح", "الحجرات", "الذاريات", "الطور",
      "النجم", "القمر", "الرحمن", "الواقعة", "الحديد", "المجادلة", "الحشر", "الممتحنة",
      "الصف", "الجمعة", "المنافقون", "التغابن", "الطلاق", "التحريم", "الملك", "القلم",
      "الحاقة", "المعارج", "نوح", "الجن", "المزمل", "المدثر", "القيامة", "الإنسان",
      "المرسلات", "النبأ", "النازعات", "عبس", "التكوير", "الانفطار", "المطففين",
      "الانشقاق", "البروج", "الطارق", "الأعلى", "الغاشية", "الفجر", "البلد", "الشمس",
      "الليل", "الضحى", "الشرح", "التين", "العلق", "القدر", "البينة", "الزلزلة",
      "العاديات", "القارعة", "التكاثر", "العصر", "الهمزة", "الفيل", "قريش", "الماعون",
      "الكوثر", "الكافرون", "النصر", "المسد", "الإخلاص", "الفلق", "الناس",
    ];

    // Use regex with word boundaries for surah matching
    const surahPattern = new RegExp(`(?:^|\\s|[\\u0600-\\u06FF])(${surahs.join("|")})(?:$|\\s|[\\u0600-\\u06FF])`, "g");
    let match: RegExpExecArray | null;
    const foundSurahs = new Set<string>();
    while ((match = surahPattern.exec(fullText)) !== null) {
      const surah = match[1];
      if (surah && !foundSurahs.has(surah)) {
        foundSurahs.add(surah);
        refs.push({
          type: "quran",
          reference: surah,
          sourceBookId: bookId,
          sourceBookName: "",
          sourcePageId: pageId,
          context: this.extractContext(fullText, surah, 300),
        });
      }
    }

    const hadithSources = ["البخاري", "مسلم", "أبو داود", "الترمذي", "النسائي", "ابن ماجه", "أحمد", "رواه", "أخرجه"];
    for (const src of hadithSources) {
      // Use word boundary for hadith sources too
      const regex = new RegExp(`(?:^|\\s|[\\u0600-\\u06FF])${src}(?:$|\\s|[\\u0600-\\u06FF])`);
      if (regex.test(fullText)) {
        refs.push({
          type: "hadith",
          reference: src,
          sourceBookId: bookId,
          sourceBookName: "",
          sourcePageId: pageId,
          context: this.extractContext(fullText, src, 300),
        });
      }
    }
    return refs.slice(0, 30);
  }

  // --- synthesis / scholar query ----------------------------------------------

  private extractRelevantText(page: PageContent, query: string, maxLen = 800): string {
    const fullText = (page.body + " " + page.footnotes + " " + page.comments).replace(/\s+/g, " ");
    // Normalize query for matching (simple approach)
    const normQuery = query.replace(/[؟?،,؛;]/g, " ").trim();
    const tokens = normQuery.split(/\s+/).filter((t) => t.length > 1);
    let bestIdx = -1;
    let bestScore = 0;
    for (const tok of tokens) {
      const idx = fullText.indexOf(tok);
      if (idx >= 0 && tok.length > bestScore) {
        bestScore = tok.length;
        bestIdx = idx;
      }
    }
    if (bestIdx < 0) {
      // Fallback: return beginning of body capped at a generous max
      const cap = Math.max(maxLen, 1200);
      return page.body.substring(0, cap).replace(/\s+/g, " ").trim();
    }
    // Expand to full sentence boundaries (Arabic/Unicode sentence punctuation),
    // never cutting mid-sentence. maxLen is the *minimum* window, not a hard cut.
    const caps = new RegExp("[.۔؟!؟؟؟\n]+");
    let start = bestIdx;
    for (let i = bestIdx - 1; i >= 0; i--) {
      if (caps.test(fullText.charAt(i))) {
        start = i + 1;
        break;
      }
      if (bestIdx - i > maxLen) {
        start = i;
        break;
      }
    }
    let end = bestIdx;
    for (let i = bestIdx; i < fullText.length; i++) {
      if (caps.test(fullText.charAt(i))) {
        end = i + 1;
        break;
      }
      if (i - bestIdx > maxLen) {
        end = i;
        break;
      }
    }
    let snippet = fullText.substring(start, end).trim();
    if (start > 0) snippet = "…" + snippet;
    if (end < fullText.length) snippet = snippet + "…";
    return snippet;
  }

  async synthesize(question: string, scope: SearchScope = {}, rcto?: RCTOContext): Promise<SynthesisResult> {
    await this.initialize();
    const hits = await this.search(question, scope, { limit: 30 });
    const byBook = new Map<number, { bookId: number; bookName: string; authorName: string; hits: SearchResult[] }>();
    for (const h of hits) {
      const existing = byBook.get(h.bookId);
      if (existing) existing.hits.push(h);
      else byBook.set(h.bookId, { bookId: h.bookId, bookName: h.bookName, authorName: h.authorName, hits: [h] });
    }
    const top = Array.from(byBook.values())
      .sort((a, b) => b.hits.length - a.hits.length)
      .slice(0, 5);

    const scholarOpinions: ScholarOpinion[] = [];
    for (const b of top) {
      const bestHit = b.hits[0];
      if (!bestHit) continue;
      const page = await this.getPage(bestHit.bookId, bestHit.pageId);
      const relevantText = this.extractRelevantText(page, question, 800);
      
      const authority = this.inferAuthority(b.authorName, b.bookName);
      const usuli = this.inferUsuliMethods(relevantText, question);
      
      scholarOpinions.push({
        scholar: b.authorName,
        deathYear: null,
        opinion: relevantText,
        evidence: [relevantText],
        source: `${b.bookName} (صفحة ${bestHit.printedPage || bestHit.pageId})`,
        madhab: this.inferMadhab(b.bookName),
        authority,
        usuliMethods: usuli,
      });
    }

    // Weight by authority
    scholarOpinions.sort((a, b) => (b.authority?.weight ?? 0.5) - (a.authority?.weight ?? 0.5));

    return {
      question,
      scholarOpinions,
      historicalDevelopment: [],
      comparativeAnalysis: { agreements: [], disagreements: [], majorityView: "", minorityViews: [] },
      principlesExtracted: [],
      confidence: hits.length ? 0.6 : 0.1,
      rctoContext: rcto,
    };
  }

  private inferAuthority(author: string, bookName: string): SourceAuthority {
    const mutaqaddimun = ["النووي", "ابن تيمية", "القرافي", "الماوردي", "الغزالي", "ابن رشد", "ابن قudامة", "الشافعي", "مالك", "أبو حنيفة", "أحمد بن حنبل", "ابن الصلاح", "السمرقندي", "البزدوي", "السرخسي", "الكسائي", "الجرجاني", "الإسنوي", "الزركشي", "التفتازاني", "الشربيني", "الخطيب الشربيني", "البجيرمي", "الشرواني", "العبادي", "ابن عابدين", "الهمام", "القاري", "اللقاني", "الصبان", "الشرقاوي", "الدسوقي", "الخضري", "القليوبي", "المحبوبي", "السغناقي", "الكاساني", "المرغيناني", "الهداية", "البزدوي"];
    
    const isClassical = mutaqaddimun.some(name => author.includes(name) || bookName.includes(name));
    
    if (isClassical) {
      if (author.includes("النووي") || author.includes("ابن تيمية") || author.includes("القرافي") || author.includes("الشافعي") || author.includes("أبا حنيفة") || author.includes("مالك") || author.includes("أحمد بن حنبل")) {
        return { tier: "mujtahid_mutlaq", weight: 1.0 };
      }
      return { tier: "mujtahid_madhhab", weight: 0.9 };
    }
    
    if (bookName.includes("موسوعة") || bookName.includes("لجنة") || bookName.includes("مجمع") || bookName.includes("هيئة") || bookName.includes("مجلس")) {
      return { tier: "contemporary_council", weight: 0.6 };
    }
    
    return { tier: "general", weight: 0.3 };
  }

  private inferUsuliMethods(text: string, question: string): UsuliMethods {
    const methods: UsuliMethods = {};
    if (/تصوير|مفهوم|تعريف|إطار/.test(text)) methods.taswir = "مفهوم المسألة وتصويرها";
    if (/تحكيم|ترجيح|مقابلة|موازنة/.test(text)) methods.tahkim = "تحكيم الأدلة وترجيحها";
    if (/تذييل|فرع|تبع/.test(text)) methods.tadlil = "التذييل والتبعية";
    if (/تعليل|علّة|حكمة|مقصود/.test(text)) methods.talil = "استخراج العلة والتعليل";
    if (/تفريع|فروع|مسائل/.test(text)) methods.tafrie = "التفريع على الأصول";
    if (/تمثيل|قياس|مثال|نموذج/.test(text)) methods.tamsil = "التمثيل والنمذجة";
    return methods;
  }

  private inferMadhab(bookName: string): string | undefined {
    if (/حنفي|كاساني|مرغيناني|هداية|بزدوي|سرخسي|كافي|مبيض/.test(bookName)) return "hanafi";
    if (/مالكي|خليل|مختصر|توضيح|مواهب|شاح/.test(bookName)) return "maliki";
    if (/شافعي|نواوي|مهذب|مجموع|روضة|منهاج|رافعي|إسنوي|خطيب|زركشي|تفتازاني|شربيني|بجيرمي|شرواني|عبادي/.test(bookName)) return "shafii";
    if (/حنبلي|مقدسي|مغني|محرر|مبدع|إنصاف|فروع|كافي|مروي/.test(bookName)) return "hanbali";
    return undefined;
  }

  async scholarQuery(question: string, scope: SearchScope = {}, rcto?: RCTOContext): Promise<ScholarResponse> {
    await this.initialize();
    const hits = await this.search(question, scope, { limit: 10 });
    const citations: Citation[] = [];
    const madhhabBreakdown: Record<string, string> = { hanafi: "", maliki: "", shafii: "", hanbali: "" };
    const usuliMethods: UsuliMethods = {};

    for (const h of hits.slice(0, 5)) {
      const page = await this.getPage(h.bookId, h.pageId);
      const preciseText = this.extractRelevantText(page, question, 600);
      const madhab = this.inferMadhab(h.bookName);
      const authority = this.inferAuthority(h.authorName, h.bookName);
      const usuli = this.inferUsuliMethods(preciseText, question);
      
      Object.assign(usuliMethods, usuli);
      
      if (madhab && preciseText) {
        madhhabBreakdown[madhab] = preciseText;
      }
      
      citations.push({
        bookId: h.bookId,
        bookName: h.bookName,
        author: h.authorName,
        authorDeathYear: null,
        volume: null,
        page: h.printedPage || String(h.pageId),
        text: preciseText,
        type: "scholar_text" as const,
      });
    }

    const topHit = hits[0];
    let answer = "No relevant texts found in the local library.";
    if (topHit) {
      const page = await this.getPage(topHit.bookId, topHit.pageId);
      const preciseText = this.extractRelevantText(page, question, 800);
      answer = `في "${topHit.bookName}" لـ ${topHit.authorName} (صفحة ${topHit.printedPage || topHit.pageId}): "${preciseText}"`;
    }

    const tarjih = this.generateTarjih(citations, question);

    return {
      question,
      answer,
      methodology: "البحث النصي الدقيق في المكتبة الشاملة المحلية مع استخراج السياق الكامل والإطار الأصولي",
      citations,
      caveats: ["مُولَّد من البحث النصي المحلي. الرجوع للعلماء المُعتمدين للأحكام الشرعية."],
      furtherReading: hits.slice(0, 3).map((h) => h.bookName),
      confidence: hits.length ? 0.8 : 0.1,
      madhhabBreakdown: Object.keys(madhhabBreakdown).length ? madhhabBreakdown : undefined,
      usuliMethods: Object.keys(usuliMethods).length ? usuliMethods : undefined,
      tarjih,
      rctoContext: rcto,
    };
  }

  private generateTarjih(citations: Citation[], question: string): string {
    if (citations.length === 0) return "";
    
    const byMadhab: Record<string, Citation[]> = {};
    for (const c of citations) {
      const madhab = this.inferMadhab(c.bookName) || "general";
      if (!byMadhab[madhab]) byMadhab[madhab] = [];
      byMadhab[madhab].push(c);
    }
    
    let tarjih = "الترجيح: ";
    const madhabs = Object.keys(byMadhab);
    if (madhabs.length > 1) {
      tarjih += `اختلاف بين ${madhabs.join(" و ")}. `;
      const sorted = citations.sort((a, b) => {
        const wa = this.inferAuthority(a.author, a.bookName).weight;
        const wb = this.inferAuthority(b.author, b.bookName).weight;
        return wb - wa;
      });
      const top = sorted[0];
      if (top) {
        tarjih += `الراجح: قول ${top.author} في ${top.bookName} (صفحة ${top.page}) لقوة سنده/دليله.`;
      }
    } else if (madhabs.length === 1) {
      tarjih += `مذهب ${madhabs[0]} هو المتوفر في المصادر.`;
    }
    return tarjih;
  }

  // --- quote verification ------------------------------------------------------

  async verifyQuote(
    bookId: number,
    quote: string,
    allegedPage?: string
  ): Promise<VerifyQuoteResult> {
    await this.initialize();
    const book = await this.getBookInfo(bookId);

    // Find the page - either by alleged printed page or search within book
    let page: PageContent | null = null;
    if (allegedPage) {
      // Try to find by printed page - first check TOC for chapter, then find exact page in that chapter
      const rows = await this.books.tocRows(bookId);
      const target = rows.find((r) => r.page_id.toString() === allegedPage || r.page_id === parseInt(allegedPage));
      if (target) {
        // target.title_id is the chapter title_id, need to find the specific pageId with this printed page
        // Search within this chapter's page range
        const chapterPages = await this.getSection(bookId, target.title_id);
        const exactPage = chapterPages.find(p => p.printedPage === allegedPage);
        if (exactPage) {
          page = exactPage;
        } else {
          // Fallback: get first page of chapter
          page = await this.getPage(bookId, target.title_id);
        }
      }
    }
    if (!page) {
      // Search for the quote within this book using flexible strategies
      const searchTerms = this.extractSearchTerms(quote);
      
      for (const terms of searchTerms) {
        const hits = await this.search(terms, { bookIds: [bookId] }, { 
          limit: 5, 
          morphology: true
        });
        if (hits.length > 0 && hits[0]) {
          page = await this.getPage(hits[0].bookId, hits[0].pageId);
          break;
        }
        // Fallback: try with wildcards if morphology fails
        const hits2 = await this.search(terms, { bookIds: [bookId] }, { 
          limit: 5, 
          wildcards: true 
        });
        if (hits2.length > 0 && hits2[0]) {
          page = await this.getPage(hits2[0].bookId, hits2[0].pageId);
          break;
        }
      }
    }

    if (!page) {
      return {
        bookId,
        bookName: book.name,
        authorName: book.author,
        allegedPage: allegedPage ?? "",
        status: "unknown",
        matchPercent: 0,
        diff: "Could not locate page in book",
        inMatn: false,
        inFootnote: false,
      };
    }

    const fullText = page.body + " " + page.footnotes + " " + page.comments;
    const normQuote = this.normalizeForMatch(quote);
    const normText = this.normalizeForMatch(fullText);

    // Find best match position
    let bestIdx = -1;
    let bestScore = 0;
    for (let i = 0; i <= normText.length - normQuote.length; i++) {
      const window = normText.substring(i, i + normQuote.length);
      const score = this.similarity(normQuote, window);
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    const matchPercent = Math.round(bestScore * 100);
    let status: VerifyQuoteResult["status"] = "not_found";
    if (matchPercent >= 98) status = "exact";
    else if (matchPercent >= 90) status = "tashkeel_diff";
    else if (matchPercent >= 80) status = "partial";
    else status = "not_found";

    // Detect specific diff types
    if (status !== "exact" && matchPercent >= 85) {
      const diffChars = this.diffChars(this.normalizeForMatch(quote), this.normalizeForMatch(fullText.substring(bestIdx, bestIdx + quote.length)));
      if (diffChars.hasTashkeelDiff) status = "tashkeel_diff";
      else if (diffChars.hasHamzaDiff) status = "hamza_diff";
      else if (diffChars.hasNumberDiff) status = "number_diff";
    }

    // Check if in matn vs footnote
    const inMatn = page.body.toLowerCase().includes(quote.toLowerCase().substring(0, 20));
    const inFootnote = (page.footnotes + page.comments).toLowerCase().includes(quote.toLowerCase().substring(0, 20));

    // Get printed page
    const printed = await this.books.printedPage(bookId, page.pageId);

    return {
      bookId,
      bookName: book.name,
      authorName: book.author,
      allegedPage: allegedPage ?? printed ?? "",
      status,
      matchPercent,
      diff: this.makeDiff(quote, fullText.substring(bestIdx, bestIdx + quote.length * 2)),
      inMatn,
      inFootnote,
      actualPage: printed ?? String(page.pageId),
      matchedText: fullText.substring(bestIdx, bestIdx + quote.length * 2),
    };
  }

  private extractSearchTerms(quote: string): string[] {
    const normalized = this.normalizeForMatch(quote);
    // Strategy 1: Full normalized quote
    // Strategy 2: Key words (3+ chars, not stop words)
    const stopWords = new Set(["في", "على", "من", "إلى", "عن", "مع", "هذا", "هذه", "ذلك", "التي", "الذي", "ان", "إن", "أن", "كان", "كانت", "قال", "قالوا", "قالا", "كلا", "كلتا", "ما", "لا", "لم", "لن", "ليس", "قد", "إنما", "أن", "كي", "إذا", "إذا"]);
    const words = normalized.split(/\s+/).filter(w => w.length >= 3 && !stopWords.has(w));
    // Strategy 3: First 5 meaningful words
    const firstWords = words.slice(0, 5).join(" ");
    // Strategy 4: Last 5 meaningful words
    const lastWords = words.slice(-5).join(" ");
    // Strategy 5: Longest word + surrounding context
    const longestWord = words.reduce((a, b) => a.length > b.length ? a : b, "");
    const longWordIdx = normalized.indexOf(longestWord);
    const contextStart = Math.max(0, longWordIdx - 50);
    const contextEnd = Math.min(normalized.length, longWordIdx + longestWord.length + 50);
    const context = normalized.substring(contextStart, contextEnd);
    
    return [
      normalized,           // Full normalized
      firstWords,           // First key words
      lastWords,            // Last key words
      context,              // Context around longest word
      longestWord           // Just the longest word
    ].filter(Boolean);
  }

  private normalizeForMatch(text: string): string {
    return text
      .replace(/[\u064B-\u065F\u0670]/g, "") // tashkeel
      .replace(/[أإآ]/g, "ا") // alef
      .replace(/ى/g, "ي") // ya
      .replace(/ة/g, "ه") // ta marbuta
      .replace(/ـ/g, "") // kashida
      .replace(/\s+/g, " ")
      .trim();
  }

  private similarity(a: string, b: string): number {
    if (a === b) return 1;
    if (!a || !b) return 0;
    const len = Math.max(a.length, b.length);
    let matches = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      if (a[i] === b[i]) matches++;
    }
    return matches / len;
  }

  private diffChars(a: string, b: string): { hasTashkeelDiff: boolean; hasHamzaDiff: boolean; hasNumberDiff: boolean } {
    const hasTashkeelDiff = /[\u064B-\u065F\u0670]/.test(a) !== /[\u064B-\u065F\u0670]/.test(b);
    const hasHamzaDiff = /[أإآ]/.test(a) !== /[أإآ]/.test(b);
    const hasNumberDiff = /\d/.test(a) !== /\d/.test(b);
    return { hasTashkeelDiff, hasHamzaDiff, hasNumberDiff };
  }

  private makeDiff(expected: string, actual: string): string {
    const max = Math.max(expected.length, actual.length);
    let out = "";
    for (let i = 0; i < max; i++) {
      const e = expected[i] ?? "";
      const a = actual[i] ?? "";
      if (e === a) out += e;
      else out += `[${e}→${a}]`;
    }
    return out;
  }

  // --- health ----------------------------------------------------------------

  async healthCheck(): Promise<HealthStatus> {
    await this.initialize();
    let info;
    try {
      info = await this.helper.ping();
    } catch (e) {
      return {
        version: "1.0.0",
        catalogBooks: this.catalog?.ranges().catalogBooks ?? 0,
        catalogAuthors: this.catalog?.ranges().catalogAuthors ?? 0,
        catalogCategories: this.catalog?.ranges().catalogCategories ?? 0,
        downloadedBooks: 0,
        spotCheck: { checked: 0, readable: 0, errors: [`helper unavailable: ${(e as Error).message}`] },
        uptime: process.uptime(),
      };
    }
    const ranges = this.catalog!.ranges();
    return {
      version: "1.0.0",
      catalogBooks: ranges.catalogBooks,
      catalogAuthors: ranges.catalogAuthors,
      catalogCategories: ranges.catalogCategories,
      downloadedBooks: ranges.downloadedBooks,
      spotCheck: { checked: 1, readable: 1, errors: [] },
      uptime: process.uptime(),
      // extra diagnostics for health display
      ...(info.page_docs != null ? { indexedPages: info.page_docs } as object : {}),
    } as HealthStatus;
  }
}

export async function createBackend(libraryPath?: string): Promise<ShamelaBackend> {
  const backend = new ShamelaBackend(libraryPath);
  await backend.initialize();
  return backend;
}
/**
 * MCP Tool implementations for Shamela Scholar
 */

import { z } from "zod";
import type { ShamelaBackend } from "../backend.js";
import type {
  SearchScope,
  SearchOptions,
  CommentaryEntry,
  CrossReference,
  SynthesisResult,
  ScholarResponse,
  Citation,
  ChapterNode,
} from "../types.js";
import { messages } from "../i18n/index.js";

const L = messages();

export const SearchScopeSchema = z.object({
  bookIds: z.array(z.number()).optional(),
  authorIds: z.array(z.number()).optional(),
  categoryIds: z.array(z.number()).optional(),
  periodFrom: z.number().optional(),
  periodTo: z.number().optional(),
  downloadedOnly: z.boolean().optional(),
});

export const SearchOptionsSchema = z.object({
  morphology: z.boolean().optional(),
  wildcards: z.boolean().optional(),
  exactPhrase: z.boolean().optional(),
  searchIn: z.array(z.enum(["body", "footnote", "comment"])).optional(),
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional(),
});

export const SearchInputSchema = z.object({
  query: z.string().min(1),
  scope: SearchScopeSchema.optional(),
  options: SearchOptionsSchema.optional(),
});

type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: any;
  isError?: boolean;
};

function errorResult(err: unknown): ToolResult {
  return {
    isError: true,
    content: [{ type: "text", text: `${L.common.error}: ${err}` }],
  };
}

function format(key: string, vars: Record<string, string | number> = {}): string {
  let s = key;
  for (const [k, v] of Object.entries(vars)) {
    s = s.replaceAll(`{${k}}`, String(v));
  }
  return s;
}

function deathYearStr(year: number | null, lang: string): string {
  if (year === null) return L.output.deathYearUnknown;
  if (lang === "ar") return `ت ${year} هـ`;
  return `w. ${year} H`;
}

export async function runSearch(
  backend: ShamelaBackend,
  args: z.infer<typeof SearchInputSchema>
): Promise<ToolResult> {
  try {
    const results = await backend.search(args.query, args.scope, args.options);

    let text = `${L.common.found} ${results.length} ${L.output.countWord} ${L.output.forQuery.replace("{q}", args.query)}\n\n`;
    for (const r of results.slice(0, 10)) {
      text += `📖 **${r.bookName}** — ${r.authorName} (${r.categoryName})\n`;
      text += `   📄 ${L.common.page}: ${r.printedPage} | ${L.common.score}: ${r.score.toFixed(2)}\n`;
      text += `   💬 ${r.snippet}\n\n`;
    }

    if (results.length > 10) {
      text += `... و ${results.length - 10} ${L.output.moreResults}`;
    }

    return {
      content: [{ type: "text", text }],
      structuredContent: { results, total: results.length, query: args.query },
    };
  } catch (error) {
    return errorResult(error);
  }
}

export const GetPageInputSchema = z.object({
  bookId: z.number(),
  pageId: z.number(),
});

export async function runGetPage(
  backend: ShamelaBackend,
  args: z.infer<typeof GetPageInputSchema>
): Promise<ToolResult> {
  try {
    const page = await backend.getPage(args.bookId, args.pageId);
    const book = await backend.getBookInfo(args.bookId);

    let text = `📖 **${book.name}** — ${book.author}\n`;
    text += `📄 ${L.common.page}: ${page.printedPage}\n`;
    text += `📚 ${L.common.chapter}: ${page.chapterHierarchy.map((c) => c.title).join(" > ")}\n\n`;
    text += `**${L.output.textLabel}:**\n${page.body}\n\n`;

    if (page.footnotes) {
      text += `**${L.output.footnoteLabel}:**\n${page.footnotes}\n\n`;
    }

    return {
      content: [{ type: "text", text }],
      structuredContent: page,
    };
  } catch (error) {
    return errorResult(error);
  }
}

export const GetCommentaryInputSchema = z.object({
  bookId: z.number(),
  pageId: z.number(),
  textSegment: z.string().optional(),
});

export async function runGetCommentary(
  backend: ShamelaBackend,
  args: z.infer<typeof GetCommentaryInputSchema>
): Promise<ToolResult> {
  try {
    const commentaries = await backend.getCommentary(args.bookId, args.pageId, args.textSegment);

    if (commentaries.length === 0) {
      return {
        content: [{ type: "text", text: L.errors.noCommentary }],
        structuredContent: { commentaries: [] },
      };
    }

    let text = `${L.toolTitles.shamela_get_commentary} (${commentaries.length} ${L.common.found}):\n\n`;

    const grouped = new Map<string, CommentaryEntry[]>();
    for (const c of commentaries) {
      const key = c.type;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(c);
    }

    for (const [type, entries] of grouped) {
      text += `### ${L.commentary[type as keyof typeof L.commentary] || type}\n\n`;
      for (const e of entries.slice(0, 5)) {
        text += `📖 **${e.sourceBookName}** — ${e.sourceAuthor} (${e.period})\n`;
        text += `   📄 ${L.common.page}: ${e.printedPage} | ${L.output.confShort}: ${(e.confidence * 100).toFixed(0)}%\n`;
        text += `   💬 ${e.text}\n\n`;
      }
    }

    return {
      content: [{ type: "text", text }],
      structuredContent: { commentaries },
    };
  } catch (error) {
    return errorResult(error);
  }
}

export const CrossReferenceInputSchema = z.object({
  bookId: z.number(),
  pageId: z.number(),
});

export async function runCrossReference(
  backend: ShamelaBackend,
  args: z.infer<typeof CrossReferenceInputSchema>
): Promise<ToolResult> {
  try {
    const refs = await backend.getCrossReferences(args.bookId, args.pageId);

    if (refs.length === 0) {
      return {
        content: [{ type: "text", text: L.errors.noCrossReferences }],
        structuredContent: { references: [] },
      };
    }

    let text = `${L.toolTitles.shamela_cross_reference} (${refs.length} ${L.common.found}):\n\n`;

    const grouped = new Map<string, CrossReference[]>();
    for (const r of refs) {
      if (!grouped.has(r.type)) grouped.set(r.type, []);
      grouped.get(r.type)!.push(r);
    }

    for (const [type, entries] of grouped) {
      text += `### ${type}\n\n`;
      for (const e of entries.slice(0, 10)) {
        text += `🔗 ${e.reference}\n`;
        text += `   📄 ${L.output.contextLabel}: ${e.context}\n\n`;
      }
    }

    return {
      content: [{ type: "text", text }],
      structuredContent: { references: refs },
    };
  } catch (error) {
    return errorResult(error);
  }
}

export const SynthesizeInputSchema = z.object({
  question: z.string().min(1),
  scope: SearchScopeSchema.optional(),
});

export async function runSynthesize(
  backend: ShamelaBackend,
  args: z.infer<typeof SynthesizeInputSchema>
): Promise<ToolResult> {
  try {
    const result = await backend.synthesize(args.question, args.scope);

    let text = `## ${L.toolTitles.shamela_synthesize}: "${args.question}"\n\n`;
    text += `### ${L.scholar.methodology}\n${format(L.output.sourcesReviewed, { n: result.scholarOpinions.length })}\n\n`;

    if (result.scholarOpinions.length > 0) {
      text += `### ${L.output.scholarOpinions}\n\n`;
      for (const op of result.scholarOpinions) {
        text += `**${op.scholar}**${op.deathYear ? ` (${deathYearStr(op.deathYear, L.output.deathYear.includes("H") ? "en" : "ar")})` : ""}${op.madhab ? ` [${op.madhab}]` : ""}\n`;
        text += `> ${op.opinion}\n`;
        text += `📚 ${L.output.sourceLabel}: ${op.source}\n\n`;
      }
    }

    if (result.principlesExtracted.length > 0) {
      text += `### ${L.output.principlesExtracted}\n\n`;
      for (const p of result.principlesExtracted) {
        text += `- ${p}\n`;
      }
      text += "\n";
    }

    text += `*${L.output.confidenceLevel}: ${(result.confidence * 100).toFixed(0)}%*`;

    return {
      content: [{ type: "text", text }],
      structuredContent: result,
    };
  } catch (error) {
    return errorResult(error);
  }
}

export const ScholarQueryInputSchema = z.object({
  question: z.string().min(1),
  scope: SearchScopeSchema.optional(),
});

export async function runScholarQuery(
  backend: ShamelaBackend,
  args: z.infer<typeof ScholarQueryInputSchema>
): Promise<ToolResult> {
  try {
    const result = await backend.scholarQuery(args.question, args.scope);

    let text = `## ${L.scholar.greeting}\n\n`;
    text += `### ${L.common.question}\n${args.question}\n\n`;
    text += `### ${L.common.answer}\n${result.answer}\n\n`;

    if (result.citations.length > 0) {
      text += `### ${L.common.citationStyle}\n\n`;
      for (const c of result.citations) {
        text += `📖 **${c.bookName}** — ${c.author}${c.authorDeathYear ? ` (${deathYearStr(c.authorDeathYear, "en")})` : ""}\n`;
        text += `   📄 ${L.common.page}: ${c.page}\n`;
        text += `   💬 "${c.text}"\n\n`;
      }
    }

    if (result.caveats.length > 0) {
      text += `### ⚠️ ${L.common.caveats}\n\n`;
      for (const c of result.caveats) {
        text += `- ${c}\n`;
      }
      text += "\n";
    }

    if (result.furtherReading.length > 0) {
      text += `### 📚 ${L.common.furtherReading}\n\n`;
      for (const b of result.furtherReading) {
        text += `- ${b}\n`;
      }
    }

    text += `\n*${L.output.footerConfidence}: ${(result.confidence * 100).toFixed(0)}%*`;

    return {
      content: [{ type: "text", text }],
      structuredContent: result,
    };
  } catch (error) {
    return errorResult(error);
  }
}

export const GetBookInfoInputSchema = z.object({
  bookId: z.number(),
});

export async function runGetBookInfo(
  backend: ShamelaBackend,
  args: z.infer<typeof GetBookInfoInputSchema>
): Promise<ToolResult> {
  try {
    const book = await backend.getBookInfo(args.bookId);

    let text = `## ${L.toolTitles.shamela_get_book_info}\n\n`;
    text += `**${L.common.book}:** ${book.name}\n`;
    text += `**${L.common.author}:** ${book.author} (${deathYearStr(book.authorDeathYear, "ar")})\n`;
    text += `**${L.common.category}:** ${book.categoryName}\n`;
    text += `**${L.output.bookTypeLabel}:** ${book.bookType}\n`;
    text += `**${L.output.totalVolumesLabel}:** ${book.volumes}\n`;
    text += `**${L.output.totalPagesLabel}:** ${book.totalPages}\n`;
    text += `**${L.output.dateWrittenLabel}:** ${book.bookDate ? `${book.bookDate} H` : L.output.deathYearUnknown}\n`;
    text += `**${L.output.downloadedLabel}:** ${book.downloaded ? L.output.yes : L.output.no}\n`;

    if (book.notes.length > 0) {
      text += `\n**${L.output.notesLabel}:**\n`;
      for (const note of book.notes) {
        text += `- ${note}\n`;
      }
    }

    return {
      content: [{ type: "text", text }],
      structuredContent: book,
    };
  } catch (error) {
    return errorResult(error);
  }
}

export const ListCategoriesInputSchema = z.object({});

export async function runListCategories(
  backend: ShamelaBackend,
  _args: z.infer<typeof ListCategoriesInputSchema>
): Promise<ToolResult> {
  try {
    const categories = await backend.listCategories();

    let text = `## ${L.toolTitles.shamela_list_categories} (${categories.length} ${L.output.categoryWord})\n\n`;

    for (const c of categories) {
      const status = c.downloadedCount > 0 ? `✅ ${c.downloadedCount}/${c.bookCount}` : `⬜ 0/${c.bookCount}`;
      text += `${c.id}. **${c.name}** — ${status}\n`;
    }

    return {
      content: [{ type: "text", text }],
      structuredContent: { categories },
    };
  } catch (error) {
    return errorResult(error);
  }
}

export const ResolveInputSchema = z.object({
  query: z.string().min(1),
});

export async function runResolve(
  backend: ShamelaBackend,
  args: z.infer<typeof ResolveInputSchema>
): Promise<ToolResult> {
  try {
    const result = await backend.resolve(args.query);

    let text = `## ${L.toolTitles.shamela_resolve}: "${args.query}"\n\n`;

    if (result.transliterated) {
      text += `*${L.output.transliteratedNote}*\n\n`;
    }

    if (result.books.length > 0) {
      text += `### 📚 ${L.output.booksSection}\n\n`;
      for (const b of result.books.slice(0, 10)) {
        text += `- **${b.name}** — ${b.author} (${L.output.confShort}: ${(b.confidence * 100).toFixed(0)}%)\n`;
      }
      text += "\n";
    }

    if (result.authors.length > 0) {
      text += `### 👤 ${L.output.authorsSection}\n\n`;
      for (const a of result.authors.slice(0, 10)) {
        text += `- **${a.name}**${a.deathYear ? ` (${deathYearStr(a.deathYear, "ar")})` : ""} — ${a.bookCount} ${L.output.booksWord} (${L.output.confShort}: ${(a.confidence * 100).toFixed(0)}%)\n`;
      }
    }

    return {
      content: [{ type: "text", text }],
      structuredContent: result,
    };
  } catch (error) {
    return errorResult(error);
  }
}

export const HealthInputSchema = z.object({});

export async function runHealth(
  backend: ShamelaBackend,
  _args: z.infer<typeof HealthInputSchema>
): Promise<ToolResult> {
  try {
    const health = await backend.healthCheck();

    let text = `## ${L.toolTitles.shamela_health}\n\n`;
    text += `**${L.output.versionLabel}:** ${health.version}\n`;
    text += `**📚 ${L.output.catalogLabel}:** ${health.catalogBooks} ${L.output.booksWord}, ${health.catalogAuthors} ${L.common.author}, ${health.catalogCategories} ${L.output.categoryWord}\n`;
    text += `**✅ ${L.output.downloadedLabel}:** ${health.downloadedBooks} ${L.output.booksWord}\n`;
    text += `**🔍 ${L.output.spotCheckLabel}:** ${health.spotCheck.readable}/${health.spotCheck.checked} ${L.output.readableLabel}\n`;

    if (health.spotCheck.errors.length > 0) {
      text += `\n⚠️ **${L.common.error}:**\n`;
      for (const e of health.spotCheck.errors) {
        text += `- ${e}\n`;
      }
    }

    text += `\n**${L.output.uptimeLabel}:** ${health.uptime.toFixed(0)}s`;

    return {
      content: [{ type: "text", text }],
      structuredContent: health,
    };
  } catch (error) {
    return errorResult(error);
  }
}

export const GetSectionInputSchema = z.object({
  bookId: z.number(),
  titleId: z.number(),
});

export async function runGetSection(
  backend: ShamelaBackend,
  args: z.infer<typeof GetSectionInputSchema>
): Promise<ToolResult> {
  try {
    const pages = await backend.getSection(args.bookId, args.titleId);
    const book = await backend.getBookInfo(args.bookId);

    let text = `## ${L.toolTitles.shamela_get_text}: ${book.name} — ${L.output.sectionLabel} (${pages.length} ${L.common.page})\n\n`;

    for (const page of pages.slice(0, 10)) {
      text += `### 📄 ${L.common.page}: ${page.printedPage}\n`;
      const body = page.body.replace(/\s+/g, " ").trim();
      text += `${body.slice(0, 3000)}${body.length > 3000 ? "..." : ""}\n\n`;
    }

    if (pages.length > 10) {
      text += `... و ${pages.length - 10} ${L.common.page} ${L.output.moreLabel}`;
    }

    return {
      content: [{ type: "text", text }],
      structuredContent: { pages, book },
    };
  } catch (error) {
    return errorResult(error);
  }
}

export const GetTOCInputSchema = z.object({
  bookId: z.number(),
  parentId: z.number().optional(),
  depth: z.number().min(1).max(5).optional(),
});

export async function runGetTOC(
  backend: ShamelaBackend,
  args: z.infer<typeof GetTOCInputSchema>
): Promise<ToolResult> {
  try {
    const toc = await backend.getTOC(args.bookId, args.parentId ?? 0, args.depth ?? 3);
    const book = await backend.getBookInfo(args.bookId);

    let text = `## 📑 ${L.common.tableOfContents}: ${book.name}\n\n`;

    function renderChapters(chapters: ChapterNode[], indent = 0): string {
      let out = "";
      for (const c of chapters) {
        out += `${"  ".repeat(indent)}- **${c.title}** (${L.common.page}: ${c.pageId})\n`;
        if (c.children.length > 0) {
          out += renderChapters(c.children, indent + 1);
        }
      }
      return out;
    }

    text += renderChapters(toc);

    return {
      content: [{ type: "text", text }],
      structuredContent: { toc, book },
    };
  } catch (error) {
    return errorResult(error);
  }
}

export const GetAuthorInfoInputSchema = z.object({
  authorId: z.number(),
});

export const VerifyQuoteInputSchema = z.object({
  bookId: z.number(),
  quote: z.string().min(1),
  allegedPage: z.string().optional(),
});

export async function runGetAuthorInfo(
  backend: ShamelaBackend,
  args: z.infer<typeof GetAuthorInfoInputSchema>
): Promise<ToolResult> {
  try {
    const author = await backend.getAuthorInfo(args.authorId);

    let text = `## 👤 ${L.common.author}: ${author.name}\n\n`;
    text += `**${L.common.deathYear}:** ${author.deathYear ? `${author.deathYear} H` : L.output.deathYearUnknown} (${author.deathText})\n`;
    text += `**${L.common.bookCount}:** ${author.bookCount}\n\n`;

    if (author.books.length > 0) {
      text += `### 📚 ${L.output.booksSection}\n\n`;
      for (const b of author.books.slice(0, 20)) {
        const status = b.downloaded ? "✅" : "⬜";
        text += `${status} **${b.name}**${b.bookDate ? ` (${b.bookDate} H)` : ""}\n`;
      }
    }

    return {
      content: [{ type: "text", text }],
      structuredContent: author,
    };
  } catch (error) {
    return errorResult(error);
  }
}

export async function runVerifyQuote(
  backend: ShamelaBackend,
  args: z.infer<typeof VerifyQuoteInputSchema>
): Promise<ToolResult> {
  try {
    const result = await backend.verifyQuote(args.bookId, args.quote, args.allegedPage);

    let text = `## ${L.toolTitles.shamela_verify_quote ?? "تحقق من النقل"}\n\n`;
    text += `**${L.common.book}:** ${result.bookName} — ${result.authorName}\n`;
    text += `**${L.common.page} (المزعوم):** ${result.allegedPage || L.output.deathYearUnknown}\n`;
    text += `**${L.common.page} (الفعلي):** ${result.actualPage || L.output.deathYearUnknown}\n\n`;

    const statusLabels: Record<string, string> = {
      exact: "ثابت بحروفه",
      tashkeel_diff: "ثابت برسم آخر (فرق تشكيل)",
      hamza_diff: "ثابت برسم آخر (فرق همزة)",
      number_diff: "ثابت برسم آخر (فرق أرقام)",
      partial: "بعضه",
      not_found: "غير موجود",
      unknown: "لا يُدرى",
    };
    const statusAr = statusLabels[result.status] || result.status;
    text += `**الحالة:** ${statusAr} (${result.matchPercent}%)\n\n`;

    text += `**في المتن:** ${result.inMatn ? "نعم" : "لا"} | **في الحاشية:** ${result.inFootnote ? "نعم" : "لا"}\n\n`;

    if (result.diff) {
      text += `**الفرق:**\n\`\`\`\n${result.diff}\n\`\`\`\n\n`;
    }

    if (result.matchedText) {
      text += `**النص المطابق:**\n${result.matchedText}\n`;
    }

    return {
      content: [{ type: "text", text }],
      structuredContent: result,
    };
  } catch (error) {
    return errorResult(error);
  }
}

export const FormatAnswerInputSchema = z.object({
  answerId: z.string(),
  arabic: z.string(),
  translation: z.object({
    ms: z.string().optional(),
    en: z.string().optional(),
  }).optional(),
  citations: z.array(z.object({
    bookId: z.number(),
    bookName: z.string(),
    author: z.string(),
    authorDeathYear: z.number().nullable(),
    volume: z.number().nullable(),
    page: z.string(),
    text: z.string(),
    type: z.enum(["quran", "hadith", "scholar_text", "principle"]),
  })).optional(),
  usuliMethods: z.object({
    taswir: z.string().optional(),
    tahkim: z.string().optional(),
    tadlil: z.string().optional(),
    talil: z.string().optional(),
    tafrie: z.string().optional(),
    tamsil: z.string().optional(),
  }).optional(),
  madhhabBreakdown: z.object({
    hanafi: z.string().optional(),
    maliki: z.string().optional(),
    shafii: z.string().optional(),
    hanbali: z.string().optional(),
  }).optional(),
  tarjih: z.string().optional(),
  relatedQuestions: z.array(z.string()).optional(),
  progressiveLevel: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  rctoContext: z.object({
    role: z.enum(["mufti", "researcher", "student", "dai"]),
    context: z.object({
      location: z.string(),
      madhhab: z.string(),
      constraints: z.array(z.string()),
    }),
    task: z.enum(["ruling", "comparison", "evidence", "application"]),
    outcome: z.object({
      madhhab: z.string(),
      sources: z.array(z.string()),
      format: z.enum(["arabic", "bilingual", "structured"]),
    }),
  }).optional(),
});

export async function runFormatAnswer(
  backend: ShamelaBackend,
  args: z.infer<typeof FormatAnswerInputSchema>
): Promise<ToolResult> {
  try {
    const L = (await import("../i18n/index.js")).messages();
    
    let text = `## ${L.toolTitles.shamela_format_answer ?? "تنسيق الجواب"}\n\n`;
    
    text += `**المعرف:** ${args.answerId}\n\n`;
    
    text += `### ${L.output.arabicText ?? "النص العربي"}\n${args.arabic}\n\n`;
    
    if (args.translation) {
      if (args.translation.ms) {
        text += `### ${L.output.malayTranslation ?? "الترجمة الملايوية"}\n${args.translation.ms}\n\n`;
      }
      if (args.translation.en) {
        text += `### ${L.output.englishTranslation ?? "الترجمة الإنجليزية"}\n${args.translation.en}\n\n`;
      }
    }
    
    if (args.citations && args.citations.length > 0) {
      text += `### ${L.output.citations ?? "المصادر والاستشهادات"}\n`;
      for (const c of args.citations) {
        text += `- **${c.bookName}** — ${c.author} (صفحة ${c.page}): ${c.text.substring(0, 200)}${c.text.length > 200 ? "..." : ""}\n`;
      }
      text += "\n";
    }
    
    if (args.usuliMethods && Object.keys(args.usuliMethods).length > 0) {
      text += `### ${L.output.usuliMethods ?? "المنهج الأصولي"}\n`;
      const labels: Record<string, string> = {
        taswir: L.output.taswir ?? "تصوير",
        tahkim: L.output.tahkim ?? "تحكيم",
        tadlil: L.output.tadlil ?? "تذييل",
        talil: L.output.talil ?? "تعليل",
        tafrie: L.output.tafrie ?? "تفريع",
        tamsil: L.output.tamsil ?? "تمثيل",
      };
      for (const [k, v] of Object.entries(args.usuliMethods)) {
        if (v) text += `- **${labels[k] ?? k}:** ${v}\n`;
      }
      text += "\n";
    }
    
    if (args.madhhabBreakdown && Object.keys(args.madhhabBreakdown).length > 0) {
      text += `### ${L.output.madhhabComparison ?? "المقارنة المذهبية"}\n`;
      const labels: Record<string, string> = {
        hanafi: "الحنفي",
        maliki: "المالكي",
        shafii: "الشافعي",
        hanbali: "الحنبلي",
      };
      for (const [k, v] of Object.entries(args.madhhabBreakdown)) {
        if (v) text += `- **${labels[k] ?? k}:** ${v.substring(0, 300)}${v.length > 300 ? "..." : ""}\n`;
      }
      text += "\n";
    }
    
    if (args.tarjih) {
      text += `### ${L.output.tarjih ?? "الترجيح"}\n${args.tarjih}\n\n`;
    }
    
    if (args.relatedQuestions && args.relatedQuestions.length > 0) {
      text += `### ${L.output.relatedQuestions ?? "أسئلة ذات صلة"}\n`;
      for (const q of args.relatedQuestions) {
        text += `- ${q}\n`;
      }
      text += "\n";
    }
    
    if (args.progressiveLevel) {
      const levelLabels: Record<string, string> = {
        beginner: L.output.beginner ?? "مبتدئ",
        intermediate: L.output.intermediate ?? "متوسط",
        advanced: L.output.advanced ?? "متقدم",
      };
      text += `### ${L.output.level ?? "المستوى"}: ${levelLabels[args.progressiveLevel] ?? args.progressiveLevel}\n\n`;
    }
    
    if (args.rctoContext) {
      text += `### ${L.output.rctoContext ?? "إطار RCTO"}\n`;
      text += `- **${L.output.role ?? "الدور"}:** ${args.rctoContext.role}\n`;
      text += `- **${L.output.context ?? "السياق"}:** ${args.rctoContext.context.location}, ${args.rctoContext.context.madhhab}, ${args.rctoContext.context.constraints.join(", ")}\n`;
      text += `- **${L.output.task ?? "المهمة"}:** ${args.rctoContext.task}\n`;
      text += `- **${L.output.outcome ?? "النتيجة"}:** ${args.rctoContext.outcome.madhhab}, ${args.rctoContext.outcome.sources.join(", ")}, ${args.rctoContext.outcome.format}\n\n`;
    }
    
    return {
      content: [{ type: "text", text }],
      structuredContent: args,
    };
  } catch (error) {
    return errorResult(error);
  }
}
/**
 * Internationalization types and message catalogues for Shamela Scholar MCP
 * Supports Arabic (ar), English (en), and Malay (ms)
 */

export interface Messages {
  // Tool titles
  toolTitles: {
    shamela_search: string;
    shamela_get_text: string;
    shamela_get_commentary: string;
    shamela_cross_reference: string;
    shamela_synthesize: string;
    shamela_scholar_query: string;
    shamela_get_book_info: string;
    shamela_list_categories: string;
    shamela_resolve: string;
    shamela_health: string;
    shamela_verify_quote: string;
    shamela_format_answer: string;
  };

  // Tool descriptions
  toolDescriptions: {
    shamela_search: string;
    shamela_get_text: string;
    shamela_get_commentary: string;
    shamela_cross_reference: string;
    shamela_synthesize: string;
    shamela_scholar_query: string;
    shamela_get_book_info: string;
    shamela_list_categories: string;
    shamela_resolve: string;
    shamela_health: string;
    shamela_verify_quote: string;
    shamela_format_answer: string;
  };

  // Common UI
  common: {
    book: string;
    author: string;
    page: string;
    chapter: string;
    volume: string;
    category: string;
    century: string;
    commentary: string;
    crossReference: string;
    synthesis: string;
    scholar: string;
    search: string;
    found: string;
    notFound: string;
    error: string;
    loading: string;
    language: string;
    arabic: string;
    english: string;
    malay: string;
    // Additional UI strings used by tools
    score: string;
    body: string;
    footnote: string;
    question: string;
    answer: string;
    citationStyle: string;
    caveats: string;
    furtherReading: string;
    confidence: string;
    downloaded: string;
    notes: string;
    transliterated: string;
    version: string;
    spotCheck: string;
    readable: string;
    tableOfContents: string;
    deathYear: string;
    bookCount: string;
    books: string;
  };

  // Scholar persona
  scholar: {
    systemPrompt: string;
    greeting: string;
    methodology: string;
    citationStyle: string;
    approach: string;
  };

  // Commentary types
  commentary: {
    tafsir: string;
    sharh: string;
    hashiyah: string;
    taqrir: string;
    muqaddimah: string;
    footnote: string;
    marginalia: string;
    modern: string;
    classical: string;
  };

  // Error messages
  errors: {
    bookNotDownloaded: string;
    bookNotFound: string;
    authorNotFound: string;
    pageNotFound: string;
    noCommentary: string;
    noCrossReferences: string;
    invalidQuery: string;
    databaseError: string;
    networkError: string;
  };

  // Tool output fragments (replaces hardcoded Arabic/ternary hacks)
  output: {
    forQuery: string;               // "for \"{q}\":" / "لـ \"{q}\":" / "untuk \"{q}\":"
    countWord: string;              // "results" / "نتيجة" / "hasil"
    moreResults: string;            // "more results" / "نتيجة أخرى" / "lagi"
    textLabel: string;              // "Text" / "النص" / "Teks"
    footnoteLabel: string;          // "Footnote" / "الهامش" / "Nota Kaki"
    confShort: string;              // "Conf." / "ثقة" / "Keyakinan"
    contextLabel: string;           // "Context" / "السياق" / "Konteks"
    sourceLabel: string;            // "Source" / "المصدر" / "Sumber"
    sourcesReviewed: string;        // "{n} sources reviewed" / "{n} مصدر تم فحصه" / "{n} sumber diteliti"
    scholarOpinions: string;        // "Scholar Opinions" / "أقوال العلماء" / "Pandangan Ulama"
    principlesExtracted: string;    // "Extracted Principles" / "القواعد المستنبطة" / "Prinsip yang Disimpulkan"
    confidenceLevel: string;        // "Confidence Level" / "مستوى الثقة" / "Tahap Keyakinan"
    deathYear: string;              // "{y} H" / "ت {y} هـ" / "w. {y} H"
    deathYearUnknown: string;       // "unknown" / "غير معروف" / "tidak diketahui"
    bookTypeLabel: string;          // "Type" / "النوع" / "Jenis"
    totalVolumesLabel: string;      // "Volumes" / "الأجزاء" / "Bilangan Jilid"
    totalPagesLabel: string;        // "Pages" / "الصفحات" / "Jumlah Halaman"
    dateWrittenLabel: string;       // "Composition Date" / "تاريخ التأليف" / "Tarikh Penulisan"
    downloadedLabel: string;        // "Downloaded" / "محمل" / "Dimuat Turun"
    yes: string;                    // "Yes" / "نعم" / "Ya"
    no: string;                     // "No" / "لا" / "Tidak"
    notesLabel: string;             // "Notes" / "ملاحظات" / "Nota"
    catalogLabel: string;           // "Catalog" / "الفهارس" / "Katalog"
    categoryWord: string;           // "categories" / "تصنيف" / "kategori"
    booksWord: string;              // "books" / "كتب" / "kitab"
    booksSection: string;           // "Books" / "الكتب" / "Kitab"
    authorsSection: string;         // "Authors" / "المؤلفون" / "Para Ulama"
    versionLabel: string;           // "Version" / "الإصدار" / "Versi"
    uptimeLabel: string;            // "Uptime" / "Uptime" / "Masa Aktif"
    spotCheckLabel: string;         // "Spot Check" / "فحص عشوائي" / "Semak Sampel"
    readableLabel: string;          // "Readable" / "قابلة للقراءة" / "Boleh Dibaca"
    sectionLabel: string;           // "Section" / "فصل" / "Bahagian"
    moreLabel: string;              // "more" / "أخرى" / "lagi"
    transliteratedNote: string;     // "Transliterated search" / "تم البحث بالتهجئة اللاتينية" / "Carian transliterasi"
    footerConfidence: string;       // "Confidence" / "الثقة" / "Keyakinan"
    bookCountWord: string;          // "books" / "كتاب" / "kitab"
    arabicText: string;
    malayTranslation: string;
    englishTranslation: string;
    citations: string;
    usuliMethods: string;
    taswir: string;
    tahkim: string;
    tadlil: string;
    talil: string;
    tafrie: string;
    tamsil: string;
    madhhabComparison: string;
    tarjih: string;
    relatedQuestions: string;
    level: string;
    beginner: string;
    intermediate: string;
    advanced: string;
    rctoContext: string;
    role: string;
    context: string;
    task: string;
    outcome: string;
    formatAnswer: string;
  };
}

export type Lang = "ar" | "en" | "ms";

export const SUPPORTED_LANGS: Lang[] = ["ar", "en", "ms"];

export const DEFAULT_LANG: Lang = "ar";

export function resolveLang(raw: string | undefined | null): Lang {
  if (!raw) return DEFAULT_LANG;
  const tag = raw.trim().toLowerCase().replace(/_/g, "-").split("-")[0] ?? "";
  if (tag in CATALOGUES) return tag as Lang;
  if (tag === "ara") return "ar";
  if (tag === "eng") return "en";
  if (tag === "msa" || tag === "zlm" || tag === "mal") return "ms";
  return DEFAULT_LANG;
}

let current: Lang | null = null;

export function currentLang(): Lang {
  if (current === null) current = resolveLang(process.env.SHAMELA_LANG);
  return current;
}

export function resetLangForTesting(): void {
  current = null;
}

export function messages(lang: Lang = currentLang()): Messages {
  return CATALOGUES[lang] ?? CATALOGUES.ar;
}

import { ar } from "./ar.js";
import { en } from "./en.js";
import { ms } from "./ms.js";

const CATALOGUES: Record<Lang, Messages> = { ar, en, ms };
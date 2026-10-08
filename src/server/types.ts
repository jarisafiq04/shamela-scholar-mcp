/**
 * Type definitions for Shamela Scholar MCP
 */

export interface ShamelaConfig {
  libraryPath?: string;
  language?: "ar" | "en" | "ms";
}

export interface BookMetadata {
  id: number;
  name: string;
  author: string;
  authorId: number;
  authorDeathYear: number | null;
  categoryId: number;
  categoryName: string;
  bookType: string;
  bookDate: number | null;
  printed: boolean;
  downloaded: boolean;
  volumes: number;
  totalPages: number;
  publicationDate: string | null;
  notes: string[];
}

export interface AuthorMetadata {
  id: number;
  name: string;
  deathYear: number | null;
  deathText: string;
  bookCount: number;
  books: Array<{
    id: number;
    name: string;
    bookDate: number | null;
    downloaded: boolean;
  }>;
}

export interface PageContent {
  bookId: number;
  pageId: number;
  printedPage: string;
  body: string;
  footnotes: string;
  comments: string;
  chapterHierarchy: ChapterNode[];
  prevPageId: number | null;
  nextPageId: number | null;
}

export interface ChapterNode {
  id: number;
  title: string;
  pageId: number;
  level: number;
  children: ChapterNode[];
}

export interface SearchResult {
  bookId: number;
  bookName: string;
  authorName: string;
  authorId: number;
  categoryId: number;
  categoryName: string;
  pageId: number;
  printedPage: string;
  snippet: string;
  score: number;
  matchType: "body" | "footnote" | "comment" | "title";
}

export interface CommentaryEntry {
  type: "tafsir" | "sharh" | "hashiyah" | "taqrir" | "muqaddimah" | "footnote" | "marginalia";
  sourceBookId: number;
  sourceBookName: string;
  sourceAuthor: string;
  authorDeathYear: number | null;
  pageId: number;
  printedPage: string;
  text: string;
  period: "classical" | "medieval" | "early_modern" | "modern";
  confidence: number;
}

export interface CrossReference {
  type: "quran" | "hadith" | "scholar_opinion" | "book_reference" | "rebuttal" | "agreement";
  reference: string;
  sourceBookId: number;
  sourceBookName: string;
  sourcePageId: number;
  targetBookId?: number;
  targetBookName?: string;
  targetPageId?: number;
  context: string;
}

export interface SynthesisResult {
  question: string;
  scholarOpinions: ScholarOpinion[];
  historicalDevelopment: Array<{
    century: number;
    keyFigures: string[];
    evolution: string;
  }>;
  comparativeAnalysis: {
    agreements: string[];
    disagreements: string[];
    majorityView: string;
    minorityViews: string[];
  };
  principlesExtracted: string[];
  confidence: number;
  rctoContext?: RCTOContext;
}

export interface ScholarResponse {
  question: string;
  answer: string;
  methodology: string;
  citations: Citation[];
  caveats: string[];
  furtherReading: string[];
  confidence: number;
  madhhabBreakdown?: {
    hanafi?: string;
    maliki?: string;
    shafii?: string;
    hanbali?: string;
  };
  usuliMethods?: UsuliMethods;
  tarjih?: string;
  rctoContext?: RCTOContext;
}

export interface Citation {
  bookId: number;
  bookName: string;
  author: string;
  authorDeathYear: number | null;
  volume: number | null;
  page: string;
  text: string;
  type: "quran" | "hadith" | "scholar_text" | "principle";
}

export interface CategoryInfo {
  id: number;
  name: string;
  bookCount: number;
  downloadedCount: number;
}

export interface HealthStatus {
  version: string;
  catalogBooks: number;
  catalogAuthors: number;
  catalogCategories: number;
  downloadedBooks: number;
  spotCheck: {
    checked: number;
    readable: number;
    errors: string[];
  };
  uptime: number;
}

export interface ResolveResult {
  books: Array<{
    id: number;
    name: string;
    author: string;
    confidence: number;
  }>;
  authors: Array<{
    id: number;
    name: string;
    deathYear: number | null;
    bookCount: number;
    confidence: number;
  }>;
  transliterated: boolean;
}

export interface VerifyQuoteResult {
  bookId: number;
  bookName: string;
  authorName: string;
  allegedPage: string;
  status: "exact" | "tashkeel_diff" | "hamza_diff" | "number_diff" | "partial" | "not_found" | "unknown";
  matchPercent: number;
  diff: string;
  inMatn: boolean;
  inFootnote: boolean;
  actualPage?: string;
  matchedText?: string;
}

export type SearchScope = {
  bookIds?: number[];
  authorIds?: number[];
  categoryIds?: number[];
  periodFrom?: number;
  periodTo?: number;
  downloadedOnly?: boolean;
};

export interface SearchOptions {
  morphology?: boolean;
  wildcards?: boolean;
  exactPhrase?: boolean;
  searchIn?: ("body" | "footnote" | "comment")[];
  limit?: number;
  offset?: number;
}

export interface RCTOContext {
  role: "mufti" | "researcher" | "student" | "dai";
  context: {
    location: string;
    madhhab: string;
    constraints: string[];
  };
  task: "ruling" | "comparison" | "evidence" | "application";
  outcome: {
    madhhab: string;
    sources: string[];
    format: "arabic" | "bilingual" | "structured";
  };
}

export interface UsuliMethods {
  taswir?: string;
  tahkim?: string;
  tadlil?: string;
  talil?: string;
  tafrie?: string;
  tamsil?: string;
}

export interface SourceAuthority {
  tier: "mujtahid_mutlaq" | "mujtahid_madhhab" | "muqayyid" | "classical_muftad" | "contemporary_council" | "contemporary_mufti" | "general";
  weight: number;
}

export interface FormattedAnswer {
  answerId: string;
  arabic: string;
  translation: {
    ms?: string;
    en?: string;
  };
  citations: Citation[];
  usuliMethods: UsuliMethods;
  madhhabBreakdown: {
    hanafi?: string;
    maliki?: string;
    shafii?: string;
    hanbali?: string;
  };
  tarjih: string;
  relatedQuestions: string[];
  progressiveLevel: "beginner" | "intermediate" | "advanced";
  rctoContext?: RCTOContext;
}

export interface ScholarOpinion {
  scholar: string;
  deathYear: number | null;
  opinion: string;
  evidence: string[];
  source: string;
  madhab?: string;
  authority?: SourceAuthority;
  usuliMethods?: UsuliMethods;
}
/**
 * English message catalogue
 */
import type { Messages } from "./index.js";

export const en: Messages = {
  toolTitles: {
    shamela_search: "Search Shamela Library",
    shamela_get_text: "Get Full Text",
    shamela_get_commentary: "Get Commentaries",
    shamela_cross_reference: "Cross References",
    shamela_synthesize: "Synthesize & Infer",
    shamela_scholar_query: "Ask the Scholar",
    shamela_get_book_info: "Book Information",
    shamela_list_categories: "List Categories",
    shamela_resolve: "Resolve Reference",
    shamela_health: "Health Check",
    shamela_verify_quote: "Verify Quote",
    shamela_format_answer: "Format Answer",
  },

  toolDescriptions: {
    shamela_search:
      "Search the locally downloaded Shamela library texts. Supports Arabic morphology (root expansion via AlKhalil), wildcards, and exact phrases. Returns results with snippets and full bibliographic information.",
    shamela_get_text:
      "Retrieve full text of a page, chapter, or book with context (chapter hierarchy, printed page number, footnotes).",
    shamela_get_commentary:
      "Fetch commentaries and annotations for a specific text: tafsir for verses, sharh for hadith, hawashi for fiqh, taqrir for usul. Identifies commentary type, source, and historical layer.",
    shamela_cross_reference:
      "Find cross-references: cited Quranic verses, narrated hadiths, opinions of other scholars, books on the topic, rebuttals and refutations. Builds an interconnected knowledge graph.",
    shamela_synthesize:
      "Synthesize information from multiple sources: gather scholar opinions on an issue, trace idea evolution across centuries, compare madhabs, extract universal principles from particulars.",
    shamela_scholar_query:
      "Pose a question to the Scholar persona: answers as a master scholar combining transmission and reason, citing Quran, Sunnah, Salaf opinions, and recognized imams, observing usul and linguistic principles.",
    shamela_get_book_info:
      "Complete bibliographic information: author, death year, category, book type, composition date, volume count, download status, publication notes.",
    shamela_list_categories:
      "List all 41 Shamela categories with book counts and local download counts.",
    shamela_resolve:
      "Convert partial name (book or author) to precise IDs with confidence scores. Accepts Arabic and Latin script.",
    shamela_health:
      "Server self-diagnostics: version, catalog stats, downloaded books, spot-check page readability.",
    shamela_verify_quote:
      "Verify a quoted text against its alleged Shamela source. Returns: exact match / diacritic difference / hamza difference / number difference / partial / not found / unknown. Also shows whether in matn vs footnote, actual page, and character-level diff.",
    shamela_format_answer:
      "Format a scholarly answer with structured output: Arabic text, translation (Malay/English), citations with page numbers, usuli methodology (taswir, tahkim, tadlil, talil, tafrie, tamsil), madhhab comparison (Hanafi, Maliki, Shafi'i, Hanbali), tarjih (preference reasoning), related questions, progressive level (beginner/intermediate/advanced), and RCTO framework (role, context, task, outcome).",
  },

  common: {
    book: "Book",
    author: "Author",
    page: "Page",
    chapter: "Chapter",
    volume: "Volume",
    category: "Category",
    century: "Century",
    commentary: "Commentary",
    crossReference: "Cross-Reference",
    synthesis: "Synthesis",
    scholar: "Scholar",
    search: "Search",
    found: "Found",
    notFound: "Not Found",
    error: "Error",
    loading: "Loading",
    language: "Language",
    arabic: "Arabic",
    english: "English",
    malay: "Malay",
    // Additional UI strings used by tools
    score: "Score",
    body: "Text",
    footnote: "Footnote",
    question: "Question",
    answer: "Answer",
    citationStyle: "Citation Style",
    caveats: "Caveats",
    furtherReading: "Further Reading",
    confidence: "Confidence",
    downloaded: "Downloaded",
    notes: "Notes",
    transliterated: "Transliterated",
    version: "Version",
    spotCheck: "Spot Check",
    readable: "Readable",
    tableOfContents: "Table of Contents",
    deathYear: "Death Year",
    bookCount: "Book Count",
    books: "Books",
  },

  scholar: {
    systemPrompt:
      "You are an encyclopedic Islamic scholar and expert software engineer. You combine deep traditional Islamic knowledge (tafsir, hadith, fiqh, usul, language, history) with modern technical precision. You answer in English with Arabic and Malay support. Your methodology: authentic transmission first, then sound reasoning, considering maqasid and context. You cite: Quran, Sunnah, then Salaf opinions, then recognized imams, noting grading (sahih/hasan/daif/mursal) where possible. You cite precisely: book, volume, page, line. You distinguish transmitted text from personal ijtihad. You acknowledge valid differences and cite evidences. You don't issue fatwas beyond your knowledge, saying 'This is known to scholars of X' or 'This requires further investigation.'",
    greeting:
      "Alhamdulillah wa salatu wa salam ala Rasulillah. I am a servant of the sacred and technical sciences, asking Allah to make me beneficial. Ask me: tafsir of a verse, sharh of a hadith, fiqh issue, usul principle, text verification, scholar biography, or any Islamic science question.",
    methodology:
      "Methodology: 1) Define the exact point of inquiry 2) Transmit relevant texts with chains 3) Preponderate by evidence not preference 4) State the strongest view with its proof 5) Note any respected dissent 6) Conclude with humility and taqwa",
    citationStyle:
      "Citation format: \"Book Title\" (vol/page): \"quoted text\" — Author (d. Year AH). Example: \"Al-Insaf\" (3/124): \"Fasting is a shield...\" — Al-Muwaffaq Ibn Qudamah (d. 682 AH)",
    approach:
      "Scholar-engineer approach: precision in transmission, clarity in exposition, comprehensiveness in evidence, humility in judgment, interdisciplinary connection, leveraging technical tools for research and verification.",
  },

  commentary: {
    tafsir: "Tafsir (Quran Exegesis)",
    sharh: "Sharh (Commentary/Explanation)",
    hashiyah: "Hashiyah (Marginal Gloss)",
    taqrir: "Taqrir (Report/Verification)",
    muqaddimah: "Muqaddimah (Introduction/Preamble)",
    footnote: "Footnote",
    marginalia: "Marginalia",
    modern: "Modern",
    classical: "Classical",
  },

  errors: {
    bookNotDownloaded:
      "Book not downloaded locally. Please download it from within the Shamela application first.",
    bookNotFound: "Book not found in catalog.",
    authorNotFound: "Author not found in catalog.",
    pageNotFound: "Page not found.",
    noCommentary: "No commentary recorded for this text in downloaded books.",
    noCrossReferences: "No cross-references recorded.",
    invalidQuery: "Invalid query.",
    databaseError: "Database error.",
    networkError: "Network error.",
  },

  output: {
    forQuery: 'for "{q}":',
    countWord: "results",
    moreResults: "more results",
    textLabel: "Text",
    footnoteLabel: "Footnote",
    confShort: "Conf.",
    contextLabel: "Context",
    sourceLabel: "Source",
    sourcesReviewed: "{n} sources reviewed",
    scholarOpinions: "Scholar Opinions",
    principlesExtracted: "Extracted Principles",
    confidenceLevel: "Confidence Level",
    deathYear: "w. {y} H",
    deathYearUnknown: "unknown",
    bookTypeLabel: "Type",
    totalVolumesLabel: "Volumes",
    totalPagesLabel: "Pages",
    dateWrittenLabel: "Composition Date",
    downloadedLabel: "Downloaded",
    yes: "Yes",
    no: "No",
    notesLabel: "Notes",
    catalogLabel: "Catalog",
    categoryWord: "categories",
    booksWord: "books",
    booksSection: "Books",
    authorsSection: "Authors",
    versionLabel: "Version",
    uptimeLabel: "Uptime",
    spotCheckLabel: "Spot Check",
    readableLabel: "Readable",
    sectionLabel: "Section",
    moreLabel: "more",
    transliteratedNote: "Transliterated search",
    footerConfidence: "Confidence",
    bookCountWord: "books",
    arabicText: "Arabic Text",
    malayTranslation: "Malay Translation",
    englishTranslation: "English Translation",
    citations: "Citations & Sources",
    usuliMethods: "Usuli Methodology",
    taswir: "Taswir (Conceptualization)",
    tahkim: "Tahkim (Arbitration)",
    tadlil: "Tadlil (Subsidiary Reasoning)",
    talil: "Talil (Ratio Legis)",
    tafrie: "Tafrie (Branching)",
    tamsil: "Tamsil (Analogical Modeling)",
    madhhabComparison: "Madhhab Comparison",
    tarjih: "Tarjih (Preference)",
    relatedQuestions: "Related Questions",
    level: "Level",
    beginner: "Beginner",
    intermediate: "Intermediate",
    advanced: "Advanced",
    rctoContext: "RCTO Framework",
    role: "Role",
    context: "Context",
    task: "Task",
    outcome: "Outcome",
    formatAnswer: "Format Answer",
  },
};
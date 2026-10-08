/**
 * Malay (Bahasa Melayu) message catalogue
 */
import type { Messages } from "./index.js";

export const ms: Messages = {
  toolTitles: {
    shamela_search: "Cari Perpustakaan Shamela",
    shamela_get_text: "Dapatkan Teks Penuh",
    shamela_get_commentary: "Dapatkan Syarah & Tafsir",
    shamela_cross_reference: "Rujukan Silang",
    shamela_synthesize: "Sintesis & Penarikan Kesimpulan",
    shamela_scholar_query: "Tanya Pakar",
    shamela_get_book_info: "Maklumat Buku",
    shamela_list_categories: "Senarai Kategori",
    shamela_resolve: "Tentukan Rujukan",
    shamela_health: "Semak Kesihatan",
    shamela_verify_quote: "Sahkan Petikan",
    shamela_format_answer: "Format Jawapan",
  },

  toolDescriptions: {
    shamela_search:
      "Cari teks dalam perpustakaan Shamela yang dimuat turun secara tempatan. Sokong morfologi Arab (pengembangan akar melalui AlKhalil), wildcard, dan frasa tepat. Pulangkan keputusan dengan petikan dan maklumat bibliografi penuh.",
    shamela_get_text:
      "Mendapatkan teks penuh halaman, bab, atau buku dengan konteks (hierarki bab, nombor halaman bercetak, nota kaki).",
    shamela_get_commentary:
      "Mendapatkan syarah dan anotasi untuk teks tertentu: tafsir untuk ayat, syarh untuk hadis, hawasyi untuk fiqh, taqrir untuk usul. Mengenal pasti jenis syarah, sumber, dan lapisan sejarah.",
    shamela_cross_reference:
      "Cari rujukan silang: ayat Al-Quran yang dikutip, hadis yang diriwayatkan, pendapat ulama lain, buku tentang topik, bantahan dan tanggapan. Membina graf pengetahuan yang berkaitan.",
    shamela_synthesize:
      "Mensintesis maklumat dari pelbagai sumber: mengumpulkan pendapat ulama mengenai isu, menjejak evolusi idea merentas abad, membandingkan mazhab, mengekstrak prinsip universal dari perkara-perkara khusus.",
    shamela_scholar_query:
      "Ajukan soalan kepada persona Pakar: menjawab sebagai ulama yang menggabungkan naql (narasi) dan aql (akal), merujuk Al-Quran, Sunnah, pendapat Salaf, dan imam-imam yang disegani, mematuhi prinsip usul dan linguistik.",
    shamela_get_book_info:
      "Maklumat bibliografi lengkap: penulis, tahun wafat, kategori, jenis buku, tarikh penulisan, bilangan jilid, status muat turun, nota penerbitan.",
    shamela_list_categories:
      "Senarai semua 41 kategori Shamela dengan kiraan buku dan kiraan muat turun tempatan.",
    shamela_resolve:
      "Tukar nama separa (buku atau penulis) kepada ID yang tepat dengan skor keyakinan. Menerima skrip Arab dan Latin.",
    shamela_health:
      "Diagnostik kendiri pelayan: versi, statistik katalog, buku yang dimuat turun, semak rawak kebolehan baca halaman.",
    shamela_verify_quote:
      "Sahkan teks petikan terhadap sumber Shamela yang diklaim. Pulangkan: padanan tepat / perbezaan tanda baca / perbezaan hamzah / perbezaan nombor / sebahagian / tidak dijumpai / tidak diketahui. Tunjuk sama ada dalam matan atau Nota Kaki, muka surat sebenar, dan perbezaan aksara.",
    shamela_format_answer:
      "Format jawapan syarie dengan output berstruktur: teks Arab, terjemahan (Melayu/Inggeris), sitasi dengan nombor halaman, metodologi usuli (taswir, tahkim, tadlil, talil, tafrie, tamsil), perbandingan mazhab (Hanafi, Maliki, Shafi'i, Hanbali), tarjih (penjelasan keutamaan), soalan berkaitan, tahap progresif (pemula/sederhana/lanjutan), dan kerangka RCTO (peranan, konteks, tugas, hasil).",
  },

  common: {
    book: "Buku",
    author: "Penulis",
    page: "Muka Surat",
    chapter: "Bab",
    volume: "Jilid",
    category: "Kategori",
    century: "Abad",
    commentary: "Syarah/Tafsir",
    crossReference: "Rujukan Silang",
    synthesis: "Sintesis",
    scholar: "Pakar/Alim",
    search: "Carian",
    found: "Ditemui",
    notFound: "Tidak Ditemui",
    error: "Ralat",
    loading: "Sedang Memuatkan",
    language: "Bahasa",
    arabic: "Arab",
    english: "Inggeris",
    malay: "Melayu",
    // Additional UI strings used by tools
    score: "Skor",
    body: "Teks",
    footnote: "Nota Kaki",
    question: "Soalan",
    answer: "Jawapan",
    citationStyle: "Gaya Rujukan",
    caveats: "Amaraan",
    furtherReading: "Bacaan Lanjut",
    confidence: "Keyakinan",
    downloaded: "Dimuat Turun",
    notes: "Nota",
    transliterated: "Tereja",
    version: "Versi",
    spotCheck: "Semak Rawak",
    readable: "Boleh Dibaca",
    tableOfContents: "Jadual Kandungan",
    deathYear: "Tahun Wafat",
    bookCount: "Bilangan Buku",
    books: "Buku",
  },

  scholar: {
    systemPrompt:
      "Anda adalah seorang alim Islam yang ensklopedia dan jurutera perisian pakar. Anda menggabungkan ilmu Islam tradisional yang mendalam (tafsir, hadis, fiqh, usul, bahasa, sejarah) dengan ketepatan teknikal moden. Anda menjawab dalam Bahasa Melayu dengan sokongan Arab dan Inggeris. Metodologi anda: naql sahih dahulu, kemudian aql yang jelas, dengan mempertimbangkan maqasid dan konteks. Anda merujuk: Al-Quran, Sunnah, kemudian pendapat Salaf, kemudian imam-imam yang disegani, dengan menyatakan tahap (sahih/hasan/daif/mursal) jika boleh. Anda merujuk dengan tepat: buku, jilid, muka surat, baris. Anda membezakan antara teks yang dinukil dan ijtihad peribadi. Anda mengakui perbezaan pendapat yang sah dan menyebutkan dalil. Anda tidak memberi fatwa di luar ilmu anda, berkata: 'Ini diketahui oleh ulama bidang X' atau 'Ini memerlukan penyelidikan lanjut.'",
    greeting:
      "Alhamdulillah wa salatu wa salam ala Rasulillah. Saya hamba ilmu syarie dan teknikal, memohon kepada Allah agar saya bermanfaat. Silakan tanyakan: tafsir ayat, syarh hadis, maslah fiqh, kaedah usul, pengesahan teks, biografi alim, atau soalan mana-mana sains syariah.",
    methodology:
      "Metodologi: 1) Tentukan tepat perkara yang ditanya 2) Naql teks berkaitan dengan sanadnya 3) Tarjih dengan dalil bukan hawa 4) Nyatakan pendapat yang rajih dengan dalilnya 5) Maklumkan khilaf yang disegani jika ada 6) Penutup dengan kerendahan hati dan taqwa",
    citationStyle:
      "Format rujukan: \"Tajuk Buku\" (jilid/muka surat): \"teks dikutip\" — Penulis (wafat Tahun H). Contoh: \"Al-Insaf\" (3/124): \"Puasa itu perisai...\" — Al-Muwaffaq Ibn Qudamah (w 682 H)",
    approach:
      "Pendekatan alim-jurutera: ketepatan dalam naql, kejelasan dalam bayan, meluas dalam istidlal, kerendahan dalam hukuman, penyambungan antarabidaman, memanfaatkan alat teknikal untuk penyelidikan dan tahqiq.",
  },

  commentary: {
    tafsir: "Tafsir (Penafsiran Al-Quran)",
    sharh: "Syarah (Penjelasan/Komentar)",
    hashiyah: "Hawasyi (Catatan Pinggir)",
    taqrir: "Taqrir (Laporan/Pengesahan)",
    muqaddimah: "Muqaddimah (Pendahuluan)",
    footnote: "Nota Kaki",
    marginalia: "Catatan Pinggir",
    modern: "Moden",
    classical: "Klasik",
  },

  errors: {
    bookNotDownloaded:
      "Buku tidak dimuat turun secara tempatan. Sila muat turun terlebih dahulu dari dalam aplikasi Shamela.",
    bookNotFound: "Buku tidak dijumpai dalam katalog.",
    authorNotFound: "Penulis tidak dijumpai dalam katalog.",
    pageNotFound: "Muka surat tidak dijumpai.",
    noCommentary: "Tiada syarah terekod untuk teks ini dalam buku yang dimuat turun.",
    noCrossReferences: "Tiada rujukan silang terekod.",
    invalidQuery: "Kueri tidak sah.",
    databaseError: "Ralat pangkalan data.",
    networkError: "Ralat rangkaian.",
  },

  output: {
    forQuery: 'untuk "{q}":',
    countWord: "hasil",
    moreResults: "lagi",
    textLabel: "Teks",
    footnoteLabel: "Nota Kaki",
    confShort: "Keyakinan",
    contextLabel: "Konteks",
    sourceLabel: "Sumber",
    sourcesReviewed: "{n} sumber diteliti",
    scholarOpinions: "Pandangan Ulama",
    principlesExtracted: "Prinsip yang Disimpulkan",
    confidenceLevel: "Tahap Keyakinan",
    deathYear: "w. {y} H",
    deathYearUnknown: "tidak diketahui",
    bookTypeLabel: "Jenis",
    totalVolumesLabel: "Bilangan Jilid",
    totalPagesLabel: "Jumlah Halaman",
    dateWrittenLabel: "Tarikh Penulisan",
    downloadedLabel: "Dimuat Turun",
    yes: "Ya",
    no: "Tidak",
    notesLabel: "Nota",
    catalogLabel: "Katalog",
    categoryWord: "kategori",
    booksWord: "kitab",
    booksSection: "Kitab",
    authorsSection: "Para Ulama",
    versionLabel: "Versi",
    uptimeLabel: "Masa Aktif",
    spotCheckLabel: "Semak Sampel",
    readableLabel: "Boleh Dibaca",
    sectionLabel: "Bahagian",
    moreLabel: "lagi",
    transliteratedNote: "Carian transliterasi",
    footerConfidence: "Keyakinan",
    bookCountWord: "kitab",
    arabicText: "Teks Arab",
    malayTranslation: "Terjemahan Melayu",
    englishTranslation: "Terjemahan Inggeris",
    citations: "Sumber & Rujukan",
    usuliMethods: "Metodologi Usuli",
    taswir: "Taswir (Konseptualisasi)",
    tahkim: "Tahkim (Penghakiman)",
    tadlil: "Tadlil (Penghujahan Subsidiari)",
    talil: "Talil (Penjelasan Illat)",
    tafrie: "Tafrie (Pencawangan)",
    tamsil: "Tamsil (Pemodelan Analogik)",
    madhhabComparison: "Perbandingan Mazhab",
    tarjih: "Tarjih (Keutamaan)",
    relatedQuestions: "Soalan Berkaitan",
    level: "Tahap",
    beginner: "Pemula",
    intermediate: "Sederhana",
    advanced: "Lanjutan",
    rctoContext: "Kerangka RCTO",
    role: "Peranan",
    context: "Konteks",
    task: "Tugas",
    outcome: "Hasil",
    formatAnswer: "Format Jawapan",
  },
};
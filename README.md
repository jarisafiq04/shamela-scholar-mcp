# Shamela Scholar MCP

A Model Context Protocol (MCP) server for the **Maktabah al-Shamela** Islamic library with **trilingual support** (Arabic, English, Malay) and **scholarly commentary capabilities**.

## Features

### 🌐 Trilingual Support
- **Arabic** (العربية) - Default, language of the library
- **English** - Full interface and scholarly responses
- **Malay** (Bahasa Melayu) - Complete localization for Southeast Asian users

### 📚 Core Tools (13 tools)

| Tool | Description |
|------|-------------|
| `shamela_search` | Search downloaded library with Arabic morphology support |
| `shamela_get_text` | Get full page text with chapter hierarchy |
| `shamela_get_section` | Get full chapter/section by title ID |
| `shamela_get_toc` | Get book's table of contents |
| `shamela_get_commentary` | Fetch commentaries (tafsir, sharh, hawashi, etc.) for a text |
| `shamela_cross_reference` | Find Quranic verses, hadiths, scholar opinions in a text |
| `shamela_synthesize` | Synthesize multiple sources on a topic |
| `shamela_scholar_query` | Ask the Scholar persona (expert Islamic scholar + software engineer) |
| `shamela_get_book_info` | Complete bibliographic metadata |
| `shamela_get_author_info` | Author biography and works |
| `shamela_list_categories` | List all 41 Shamela categories with download stats |
| `shamela_resolve` | Resolve partial names to exact book/author IDs |
| `shamela_health` | Server diagnostics and library health check |

### 🎓 Scholar Persona
The `shamela_scholar_query` tool provides responses from an **expert Islamic scholar** who:
- Combines traditional Islamic knowledge (tafsir, hadith, fiqh, usul, language, history) with technical precision
- Follows classical methodology: *naql* (transmission) first, then *aql* (reasoning)
- Cites precisely: book, volume, page, line
- Distinguishes transmitted text from personal *ijtihad*
- Acknowledges valid scholarly differences (*khilaf*)
- Never issues fatwas beyond knowledge scope

### 🔗 Cross-Reference Detection
Automatically extracts:
- **Quranic references** (surah:ayah or surah names)
- **Hadith references** (رواه البخاري، مسلم، etc.)
- **Scholar opinions** (قال الإمام، مذهب الشافعي، etc.)

### 📖 Commentary Types Supported
- **Tafsir** (تفسير) - Quranic exegesis
- **Sharh** (شرح) - Hadith/fiqh commentaries
- **Hashiyah** (حاشية) - Marginal glosses
- **Taqrir** (تقرير) - Verification reports
- **Muqaddimah** (مقدمة) - Introductions/preambles

## Installation

### Prerequisites
- Node.js 20+
- **Shamela 4 installed locally** with books downloaded

### Setup

1. **Clone and build:**
```bash
git clone <this-repo>
cd shamela-scholar-mcp
npm install
npm run build
```

2. **Set environment variable:**
```bash
# Linux/macOS
export SHAMELA_INSTALL_ROOT=/home/user/shamela4

# Windows (PowerShell)
$env:SHAMELA_INSTALL_ROOT="C:\shamela4"

# Windows (cmd)
set SHAMELA_INSTALL_ROOT=C:\shamela4
```

3. **Optional: Set language:**
```bash
export SHAMELA_LANG=ar   # Arabic (default)
export SHAMELA_LANG=en   # English
export SHAMELA_LANG=ms   # Malay
```

## Usage with Claude Desktop

Add to your Claude Desktop configuration (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "shamela-scholar": {
      "command": "node",
      "args": ["/full/path/to/shamela-scholar-mcp/dist/index.js"],
      "env": {
        "SHAMELA_INSTALL_ROOT": "/home/user/shamela4",
        "SHAMELA_LANG": "ar"
      }
    }
  }
}
```

## Example Queries

### Search for a concept
```
"Search for 'الصيام' in the fiqh category"
```

### Get commentary on a verse
```
"Get tafsir commentaries for page 15 of book 123"
```

### Cross-references
```
"Find all Quran and hadith references in this page"
```

### Synthesize a topic
```
"Synthesize scholar opinions on 'الوقف' from downloaded books"
```

### Ask the Scholar
```
"ما حكم صلاة الوتر؟ وما أدلة المذاهب الأربعة؟"
"What is the ruling on witr prayer? What are the evidences from the four madhabs?"
"Apakah hukum solat witr? Apakah dalil dari empat mazhab?"
```

### Get book info
```
"Show me information about book 'الإحكام في أصول الأحكام'"
```

## Language Support

The server respects `SHAMELA_LANG`:
- `ar` / `ara` / `arabic` → Arabic
- `en` / `eng` / `english` → English
- `ms` / `msa` / `zlm` / `malay` → Malay

## Architecture

```
shamela-scholar-mcp/
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── server/
│   │   ├── backend.ts        # SQLite database wrapper
│   │   ├── types.ts          # TypeScript interfaces
│   │   ├── i18n/             # Trilingual catalogues
│   │   │   ├── index.ts      # Language resolution
│   │   │   ├── ar.ts         # Arabic
│   │   │   ├── en.ts         # English
│   │   │   └── ms.ts         # Malay
│   │   └── tools/            # MCP tool implementations
└── dist/                     # Compiled output
```

## How It Works

1. **Direct SQLite Access** - Reads `master.db` and per-book `.db` files directly using `sql.js`
2. **No External Dependencies** - No Java, no Lucene, no network calls
3. **Read-Only** - Never writes to Shamela databases
4. **Morphology-Aware Search** - Basic token matching (extendable with AlKhalil)

## Limitations

- **Basic search only** - No full Arabic morphology (AlKhalil) without Java helper
- **Local only** - Requires books downloaded in Shamela desktop app
- **No streaming** - Large sections may be truncated
- **Scholar persona is AI** - Not a substitute for qualified scholars

## Extending

### Add a new language
1. Create `src/server/i18n/xx.ts` following `ar.ts` pattern
2. Add to `CATALOGUES` in `src/server/i18n/index.ts`
3. Add language code to `SUPPORTED_LANGS` and `resolveLang()`

### Add new tools
1. Add schema and handler in `src/server/tools/index.ts`
2. Register in `src/index.ts`

## License

MIT - Free for educational and research use.

## Credits

- **Shamela Library** - Maktabah al-Shamela team
- **sql.js** - SQLite in WebAssembly
- **MCP SDK** - Model Context Protocol TypeScript SDK

---

**Note:** This is an independent project not affiliated with the official Shamela team. The scholar persona provides AI-generated responses based on textual search - always consult qualified scholars for religious rulings.
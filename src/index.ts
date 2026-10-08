/**
 * Shamela Scholar MCP Server
 * Main entry point that registers all tools with the MCP SDK
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createBackend, type ShamelaBackend } from "./server/backend.js";
import { currentLang, messages } from "./server/i18n/index.js";
import {
  runSearch,
  runGetPage,
  runGetCommentary,
  runCrossReference,
  runSynthesize,
  runScholarQuery,
  runGetBookInfo,
  runListCategories,
  runResolve,
  runHealth,
  runGetSection,
  runGetTOC,
  runGetAuthorInfo,
  runVerifyQuote,
  runFormatAnswer,
  SearchInputSchema,
  GetPageInputSchema,
  GetCommentaryInputSchema,
  CrossReferenceInputSchema,
  SynthesizeInputSchema,
  ScholarQueryInputSchema,
  GetBookInfoInputSchema,
  ListCategoriesInputSchema,
  ResolveInputSchema,
  HealthInputSchema,
  GetSectionInputSchema,
  GetTOCInputSchema,
  GetAuthorInfoInputSchema,
  VerifyQuoteInputSchema,
  FormatAnswerInputSchema,
} from "./server/tools/index.js";

const L = messages();

async function main() {
  const lang = currentLang();
  console.error(`[Shamela Scholar MCP] Starting in ${lang} mode...`);

  const libraryPath = process.env.SHAMELA_INSTALL_ROOT;
  if (!libraryPath) {
    console.error("[Shamela Scholar MCP] Error: SHAMELA_INSTALL_ROOT environment variable not set");
    console.error("Please set it to your Shamela installation path (e.g., /home/user/shamela/shamela)");
    process.exit(1);
  }

  const backend = await createBackend(libraryPath);

  const server = new McpServer({
    name: "shamela-scholar",
    version: "1.0.0",
  });

  // Register all tools
  server.registerTool(
    "shamela_search",
    {
      title: L.toolTitles.shamela_search,
      description: L.toolDescriptions.shamela_search,
      inputSchema: SearchInputSchema.shape,
    },
    async (args) => runSearch(backend, args)
  );

  server.registerTool(
    "shamela_get_text",
    {
      title: L.toolTitles.shamela_get_text,
      description: L.toolDescriptions.shamela_get_text,
      inputSchema: GetPageInputSchema.shape,
    },
    async (args) => runGetPage(backend, args)
  );

  server.registerTool(
    "shamela_get_section",
    {
      title: `${L.toolTitles.shamela_get_text} (فصل/Section)`,
      description: "Fetch full chapter/section by title ID",
      inputSchema: GetSectionInputSchema.shape,
    },
    async (args) => runGetSection(backend, args)
  );

  server.registerTool(
    "shamela_get_toc",
    {
      title: "فهرس الكتاب / Table of Contents",
      description: "Get book's table of contents",
      inputSchema: GetTOCInputSchema.shape,
    },
    async (args) => runGetTOC(backend, args)
  );

  server.registerTool(
    "shamela_get_commentary",
    {
      title: L.toolTitles.shamela_get_commentary,
      description: L.toolDescriptions.shamela_get_commentary,
      inputSchema: GetCommentaryInputSchema.shape,
    },
    async (args) => runGetCommentary(backend, args)
  );

  server.registerTool(
    "shamela_cross_reference",
    {
      title: L.toolTitles.shamela_cross_reference,
      description: L.toolDescriptions.shamela_cross_reference,
      inputSchema: CrossReferenceInputSchema.shape,
    },
    async (args) => runCrossReference(backend, args)
  );

  server.registerTool(
    "shamela_synthesize",
    {
      title: L.toolTitles.shamela_synthesize,
      description: L.toolDescriptions.shamela_synthesize,
      inputSchema: SynthesizeInputSchema.shape,
    },
    async (args) => runSynthesize(backend, args)
  );

  server.registerTool(
    "shamela_scholar_query",
    {
      title: L.toolTitles.shamela_scholar_query,
      description: L.toolDescriptions.shamela_scholar_query,
      inputSchema: ScholarQueryInputSchema.shape,
    },
    async (args) => runScholarQuery(backend, args)
  );

  server.registerTool(
    "shamela_get_book_info",
    {
      title: L.toolTitles.shamela_get_book_info,
      description: L.toolDescriptions.shamela_get_book_info,
      inputSchema: GetBookInfoInputSchema.shape,
    },
    async (args) => runGetBookInfo(backend, args)
  );

  server.registerTool(
    "shamela_get_author_info",
    {
      title: "معلومات المؤلف / Author Info",
      description: "Get author metadata and their books",
      inputSchema: GetAuthorInfoInputSchema.shape,
    },
    async (args) => runGetAuthorInfo(backend, args)
  );

  server.registerTool(
    "shamela_list_categories",
    {
      title: L.toolTitles.shamela_list_categories,
      description: L.toolDescriptions.shamela_list_categories,
      inputSchema: ListCategoriesInputSchema.shape,
    },
    async (args) => runListCategories(backend, args)
  );

  server.registerTool(
    "shamela_resolve",
    {
      title: L.toolTitles.shamela_resolve,
      description: L.toolDescriptions.shamela_resolve,
      inputSchema: ResolveInputSchema.shape,
    },
    async (args) => runResolve(backend, args)
  );

  server.registerTool(
    "shamela_health",
    {
      title: L.toolTitles.shamela_health,
      description: L.toolDescriptions.shamela_health,
      inputSchema: HealthInputSchema.shape,
    },
    async (args) => runHealth(backend, args)
  );

  server.registerTool(
    "shamela_verify_quote",
    {
      title: L.toolTitles.shamela_verify_quote,
      description: L.toolDescriptions.shamela_verify_quote,
      inputSchema: VerifyQuoteInputSchema.shape,
    },
    async (args) => runVerifyQuote(backend, args)
  );

  server.registerTool(
    "shamela_format_answer",
    {
      title: L.toolTitles.shamela_format_answer,
      description: L.toolDescriptions.shamela_format_answer,
      inputSchema: FormatAnswerInputSchema.shape,
    },
    async (args) => runFormatAnswer(backend, args)
  );

  // Resources for quick access (disabled for now - API may differ)
  // server.registerResource(
  //   "shamela://scholar-prompt",
  //   {
  //     title: "Scholar System Prompt",
  //     description: "The system prompt defining the scholar persona",
  //     mimeType: "text/plain",
  //   },
  //   async () => ({
  //     contents: [
  //       {
  //         uri: "shamela://scholar-prompt",
  //         text: L.scholar.systemPrompt,
  //       },
  //     ],
  //   })
  // );

  // Connect via stdio
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("[Shamela Scholar MCP] Server running on stdio");

  // Handle shutdown
  process.on("SIGINT", async () => {
    console.error("\n[Shamela Scholar MCP] Shutting down...");
    await backend.close();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("[Shamela Scholar MCP] Fatal error:", error);
  process.exit(1);
});
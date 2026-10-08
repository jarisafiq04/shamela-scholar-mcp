#!/usr/bin/env node
/**
 * Stress test for shamela-scholar + arabic-manuscript-verify MCPs
 * Run: SHAMELA_INSTALL_ROOT=/home/jaris/shamela/shamela node stress-test.mjs
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const SHAMELA_ROOT = process.env.SHAMELA_INSTALL_ROOT || "/home/jaris/shamela/shamela";

async function spawnServer(name, command, args, env = {}) {
    const transport = new StdioClientTransport({
        command,
        args,
        env: { ...process.env, ...env, SHAMELA_INSTALL_ROOT: SHAMELA_ROOT }
    });
    const client = new Client({ name, version: "1.0" }, { capabilities: {} });
    await client.connect(transport);
    return { client, transport };
}

async function stressShamela() {
    console.log("\n========== STRESS TEST: shamela-scholar ==========");
    const { client, transport } = await spawnServer("stress", "node", ["dist/index.js"], { SHAMELA_LANG: "ar" });
    const start = Date.now();
    let passed = 0, failed = 0;

    const tests = [
        // 1. Basic search
        async () => {
            const r = await client.callTool({ name: "shamela_search", arguments: { query: "الصلاة", limit: 5 } });
            const text = r.content[0].text;
            if (!text.includes("نتيجة") && !text.includes("result")) throw new Error("no hits");
            console.log("  ✓ search");
        },
        // 2. Search with scope
        async () => {
            const r = await client.callTool({ name: "shamela_search", arguments: { query: "حديث", bookIds: [1], limit: 3 } });
            if (!r.content[0].text.includes("حديث")) throw new Error("scope failed");
            console.log("  ✓ scoped search");
        },
        // 3. Get page
        async () => {
            const r = await client.callTool({ name: "shamela_get_text", arguments: { bookId: 1, pageId: 1 } });
            if (r.content[0].text.length < 100) throw new Error("page too short");
            console.log("  ✓ get_text: " + r.content[0].text.length + " chars");
        },
        // 4. Get section (multi-page)
        async () => {
            const r = await client.callTool({ name: "shamela_get_section", arguments: { bookId: 1, titleId: 1 } });
            const pages = r.structuredContent.pages;
            if (!pages || pages.length < 1) throw new Error("no section pages");
            console.log("  ✓ get_section: " + pages.length + " pages");
        },
        // 5. TOC
        async () => {
            const r = await client.callTool({ name: "shamela_get_toc", arguments: { bookId: 1, depth: 2 } });
            if (!r.content[0].text.includes("فهرس")) throw new Error("toc failed");
            console.log("  ✓ get_toc");
        },
        // 6. Cross reference
        async () => {
            const r = await client.callTool({ name: "shamela_cross_reference", arguments: { bookId: 1, pageId: 1, textSegment: "قال النبي" } });
            console.log("  ✓ cross_reference");
        },
        // 7. Scholar query (heavy)
        async () => {
            const r = await client.callTool({ name: "shamela_scholar_query", arguments: { question: "حكم تارك الصلاة عند العلماء" } });
            const text = r.content[0].text;
            if (!text.includes("صفحة") && !text.includes("page")) throw new Error("no citations");
            console.log("  ✓ scholar_query: " + (text.match(/صفحة|page/gi) || []).length + " refs");
        },
        // 8. Synthesize (heavy)
        async () => {
            const r = await client.callTool({ name: "shamela_synthesize", arguments: { question: "أقوال العلماء في تارك الصلاة", limit: 3 } });
            if (!r.content[0].text.includes("أقوال")) throw new Error("synthesize failed");
            console.log("  ✓ synthesize");
        },
        // 9. Commentary
        async () => {
            const r = await client.callTool({ name: "shamela_get_commentary", arguments: { bookId: 1, pageId: 1, textSegment: "الصلاة" } });
            console.log("  ✓ get_commentary");
        },
        // 10. Book info
        async () => {
            const r = await client.callTool({ name: "shamela_get_book_info", arguments: { bookId: 1 } });
            if (!r.structuredContent.name) throw new Error("no book name");
            console.log("  ✓ get_book_info: " + r.structuredContent.name);
        },
        // 11. Author info
        async () => {
            const r = await client.callTool({ name: "shamela_get_author_info", arguments: { authorId: 1 } });
            console.log("  ✓ get_author_info");
        },
        // 12. List categories
        async () => {
            const r = await client.callTool({ name: "shamela_list_categories", arguments: {} });
            const cats = r.structuredContent.categories;
            if (!cats || cats.length < 40) throw new Error("categories missing");
            console.log("  ✓ list_categories: " + cats.length);
        },
        // 13. Resolve
        async () => {
            const r = await client.callTool({ name: "shamela_resolve", arguments: { query: "النووي" } });
            if (!r.structuredContent.books.length && !r.structuredContent.authors.length) throw new Error("resolve empty");
            console.log("  ✓ resolve");
        },
        // 14. Health
        async () => {
            const r = await client.callTool({ name: "shamela_health", arguments: {} });
            const h = r.structuredContent;
            const books = h.downloadedBooks || h.booksDownloaded || h.catalogBooks || 0;
            if (books < 1000) throw new Error("health low books: " + books);
            console.log("  ✓ health: " + books + " books");
        },
        // 15. Verify quote (NEW)
        async () => {
            const r = await client.callTool({ name: "shamela_verify_quote", arguments: { bookId: 1, quote: "الصلاة", allegedPage: "10/ 6" } });
            if (!r.content[0].text.includes("الحالة")) throw new Error("verify failed");
            console.log("  ✓ verify_quote");
        },
    ];

    for (const t of tests) {
        try { await t(); passed++; }
        catch (e) { console.log("  ✗ " + e.message); failed++; }
    }

    await transport.close();
    console.log(`\nshamela-scholar: ${passed}/${tests.length} passed (${Date.now() - start}ms)`);
    return failed;
}

async function stressArchive() {
    console.log("\n========== STRESS TEST: arabic-manuscript-verify ==========");
    const { client, transport } = await spawnServer("stress-archive", "uv", ["run", "--directory", "/home/jaris/arabic-manuscript-verify", "python", "-m", "arabic_manuscript_verify"]);
    const start = Date.now();
    let passed = 0, failed = 0;

    const tests = [
        // 1. Fuzzy locate
        async () => {
            const r = await client.callTool({ name: "archive_fuzzy_locate", arguments: { item_id: "Assau_Taghdis", quote: "اعلم أن الدلائل القطعية العقلية إذا قامت على ثبوت شيء" } });
            const d = JSON.parse(r.content[0].text);
            const m = d.best_match || d;
            if (!m.leaf || m.score < 0.7) throw new Error("fuzzy locate failed: " + JSON.stringify(d).slice(0,200));
            console.log("  ✓ fuzzy_locate: leaf " + m.leaf + ", score " + m.score);
        },
        // 2. Search inside
        async () => {
            const r = await client.callTool({ name: "archive_search_inside", arguments: { item_id: "Assau_Taghdis", query: "الصلاة", max_results: 3 } });
            console.log("  ✓ search_inside");
        },
        // 3. Page image URL
        async () => {
            const r = await client.callTool({ name: "archive_page_image", arguments: { item_id: "Assau_Taghdis", leaf: 12 } });
            if (!r.content[0].text.includes("jpg")) throw new Error("image URL failed");
            console.log("  ✓ page_image");
        },
        // 4. Bridge: verify Shamela quote
        async () => {
            const r = await client.callTool({ name: "archive_verify_shamela_quote", arguments: { shamela_book_id: 1, quote: "اعلم أن الدلائل القطعية العقلية" } });
            const d = JSON.parse(r.content[0].text);
            if (!d.verification || !d.verification.best_match) throw new Error("bridge failed");
            console.log("  ✓ verify_shamela_quote: leaf " + d.verification.best_match.leaf + ", confidence " + d.verification.best_match.confidence);
        },
    ];

    for (const t of tests) {
        try { await t(); passed++; }
        catch (e) { console.log("  ✗ " + e.message); failed++; }
    }

    await transport.close();
    console.log(`\narabic-manuscript-verify: ${passed}/${tests.length} passed (${Date.now() - start}ms)`);
    return failed;
}

async function main() {
    console.log("Starting stress test...");
    console.log("SHAMELA_INSTALL_ROOT:", SHAMELA_ROOT);

    const f1 = await stressShamela();
    const f2 = await stressArchive();

    const totalFails = f1 + f2;
    console.log("\n========== SUMMARY ==========");
    console.log("Total failures:", totalFails);
    process.exit(totalFails > 0 ? 1 : 0);
}

main().catch(e => { console.error("FATAL:", e); process.exit(1); });
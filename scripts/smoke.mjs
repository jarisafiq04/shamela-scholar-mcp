/**
 * Smoke test: boots the real backend against the local Shamela install and
 * exercises every public tool-facing method. Run: node scripts/smoke.mjs
 */

import { createBackend } from "../dist/server/backend.js";

const backend = await createBackend(process.env.SHAMELA_INSTALL_ROOT);

const health = await backend.healthCheck();
console.log("health:", JSON.stringify(health, null, 2));

const cats = await backend.listCategories();
console.log("\ncategories:", cats.length, "first:", JSON.stringify(cats[0]));

const books = cat => cats.find(c => c.id === cat);
const downloaded = cats.filter(c => c.downloadedCount > 0);
console.log("\ncategories with downloaded books:", downloaded.map(c => `${c.id}:${c.name}=${c.downloadedCount}`).join(", "));
const targetCat = downloaded[0];
if (!targetCat) throw new Error("no downloaded books found");

// Find a downloaded book id
const scope = { categoryIds: [targetCat.id] };
const hits = await backend.search("الله", { downloadedOnly: true }, { limit: 5 });
console.log("\nsearch('الله', downloadedOnly):", hits.length, "hits");
if (hits.length) {
  console.log("  first:", JSON.stringify(hits[0]));
  const { bookId, pageId } = hits[0];
  const page = await backend.getPage(bookId, pageId);
  console.log("getPage:", bookId, pageId, "printed=", page.printedPage, "body len=", page.body.length, "hier=", page.chapterHierarchy.length);
  const toc = await backend.getTOC(bookId);
  console.log("getTOC:", toc.length, "root chapters");
  if (toc.length) console.log("  first:", JSON.stringify(toc[0]).slice(0, 200));
  const book = await backend.getBookInfo(bookId);
  console.log("getBookInfo:", book.name, "| author:", book.author, "| cat:", book.categoryName);
  const refs = await backend.getCrossReferences(bookId, pageId);
  console.log("cross-refs:", refs.length);
  const commentary = await backend.getCommentary(bookId, pageId);
  console.log("commentary:", commentary.length);
}

const res = await backend.resolve("صحيح البخار");
console.log("\nresolve('صحيح البخار'):", res.books.length, "books");

if (res.books.length) {
  const authorBooks = res.books[0];
  console.log("  first book:", authorBooks.name);
}
const authors = res.authors.slice(0, 2);
for (const a of authors) {
  const info = await backend.getAuthorInfo(a.id);
  console.log("getAuthorInfo:", info.name, "books:", info.bookCount);
}

const synth = await backend.synthesize("النية");
console.log("\nsynthesize('النية'):", synth.scholarOpinions.length, "opinions");

const scholar = await backend.scholarQuery("فضل الصدقة");
console.log("scholarQuery:", scholar.citations.length, "citations, conf=", scholar.confidence);

await backend.close();
console.log("\nSMOKE TEST OK");
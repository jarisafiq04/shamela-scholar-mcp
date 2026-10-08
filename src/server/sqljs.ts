/**
 * sql.js (SQLite → WebAssembly) wrapper. Reads a copy of file bytes, strictly
 * read-only against the user's library.
 */

import { createRequire } from "node:module";
import * as fs from "node:fs";

import initSqlJs, { type SqlJsStatic, type Database } from "sql.js";

const require = createRequire(import.meta.url);

let sqlPromise: Promise<SqlJsStatic> | null = null;

function ensureSql(): Promise<SqlJsStatic> {
  if (!sqlPromise) {
    const wasmPath = require.resolve("sql.js/dist/sql-wasm.wasm");
    const wasm = fs.readFileSync(wasmPath);
    const buf = new Uint8Array(wasm);
    const ab = new ArrayBuffer(buf.byteLength);
    new Uint8Array(ab).set(buf);
    sqlPromise = initSqlJs({ wasmBinary: ab });
  }
  return sqlPromise;
}

export async function openSqlite(filePath: string): Promise<Database | null> {
  if (!fs.existsSync(filePath)) return null;
  const SQL = await ensureSql();
  return new SQL.Database(fs.readFileSync(filePath));
}
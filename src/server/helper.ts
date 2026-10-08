/**
 * JavaHelper — manages the long-lived Java subprocess that reads Shamela's
 * Lucene indexes. Talks newline-delimited JSON on stdin/stdout.
 */

import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";
import * as path from "node:path";

import type { ShamelaPaths } from "./paths.js";

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (err: Error) => void;
}

interface HelperResponse {
  id: string;
  ok: boolean;
  data?: unknown;
  error?: { code?: string; message?: string };
}

export class HelperError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "HelperError";
  }
}

export interface HelperInfo {
  pong: true;
  java_version: string;
  page_docs?: number;
  book_docs?: number;
  author_docs?: number;
}

export class JavaHelper extends EventEmitter {
  private readonly paths: ShamelaPaths;
  private readonly jvmArgs: string[];
  private child: ChildProcessWithoutNullStreams | null = null;
  private buffer = "";
  private pending = new Map<string, PendingRequest>();
  private crashCount = 0;
  private startupFailure: string | null = null;
  private dead = false;
  private starting: Promise<void> | null = null;

  constructor(paths: ShamelaPaths, jvmArgs: string[] = []) {
    super();
    this.paths = paths;
    this.jvmArgs = jvmArgs;
  }

  async start(): Promise<void> {
    if (this.dead) throw new HelperError("HELPER_DEAD", "helper crashed too many times");
    if (this.child && !this.child.killed) return;
    if (this.starting) return this.starting;

    const promise = new Promise<void>((resolve, reject) => {
      const classpath = [...this.paths.jars, this.paths.helperJar].join(path.delimiter);
      const args = [
        "--enable-native-access=ALL-UNNAMED",
        "--add-modules=jdk.incubator.vector",
        ...this.jvmArgs,
        "-cp",
        classpath,
        "ws.shamela.mcp.Main",
        this.paths.installRoot,
      ];
      try {
        const child = spawn(this.paths.jre, args, {
          stdio: ["pipe", "pipe", "pipe"],
          windowsHide: true,
        });
        this.child = child;
        this.buffer = "";

        child.stdout.setEncoding("utf8");
        child.stdout.on("data", (chunk: string) => this.handleStdout(chunk));

        child.stderr.setEncoding("utf8");
        child.stderr.on("data", (chunk: string) => {
          process.stderr.write(`[helper] ${chunk}`);
          if (chunk.includes("UnsupportedClassVersionError")) {
            this.startupFailure = "Old bundled JRE cannot run the helper. Update Shamela.";
          }
        });

        child.once("error", (err) => reject(err));
        child.once("exit", (code, signal) => this.handleExit(code, signal));
        resolve();
      } catch (err) {
        reject(err as Error);
      }
    });

    this.starting = promise;
    try {
      await promise;
    } finally {
      this.starting = null;
    }
  }

  private handleStdout(chunk: string): void {
    this.buffer += chunk;
    let nl: number;
    while ((nl = this.buffer.indexOf("\n")) >= 0) {
      const line = this.buffer.slice(0, nl).trim();
      this.buffer = this.buffer.slice(nl + 1);
      if (!line) continue;
      this.handleLine(line);
    }
  }

  private handleLine(line: string): void {
    let parsed: HelperResponse;
    try {
      parsed = JSON.parse(line) as HelperResponse;
    } catch {
      process.stderr.write(`[helper stdout-malformed] ${line}\n`);
      return;
    }
    if (parsed.id === "startup" || parsed.id === "ready") {
      if (parsed.ok === false) {
        this.startupFailure = parsed.error?.message ?? "unknown startup failure";
        process.stderr.write(`[helper startup] ${this.startupFailure}\n`);
      } else {
        this.startupFailure = null;
      }
      return;
    }
    const pending = this.pending.get(parsed.id);
    if (!pending) return;
    this.pending.delete(parsed.id);
    if (parsed.ok) {
      pending.resolve(parsed.data ?? null);
    } else {
      pending.reject(new HelperError(parsed.error?.code ?? "HELPER_ERROR", parsed.error?.message ?? "Unknown helper error"));
    }
  }

  private handleExit(code: number | null, signal: NodeJS.Signals | null): void {
    const child = this.child;
    this.child = null;
    const reason = signal ? `signal=${signal}` : `code=${code}`;
    const isExpected = child?.killed ?? false;

    if (!isExpected) {
      this.crashCount += 1;
      this.emit("crash", { reason, crashCount: this.crashCount });
      if (this.crashCount > 1) this.dead = true;
    }
    const err = this.startupFailure
      ? new HelperError("INDEX_NOT_READY", this.startupFailure)
      : new HelperError(this.dead ? "HELPER_DEAD" : "HELPER_DIED", `helper exited (${reason})`);
    for (const pending of this.pending.values()) pending.reject(err);
    this.pending.clear();
  }

  request<T = unknown>(cmd: string, args: unknown = {}, timeoutMs = 60_000): Promise<T> {
    return this.start().then(() => {
      const child = this.child;
      if (!child || child.killed) throw new HelperError("HELPER_DEAD", "helper not running");

      const id = randomUUID();
      const payload = JSON.stringify({ id, cmd, args }) + "\n";

      return new Promise<T>((resolve, reject) => {
        this.pending.set(id, { resolve: (v) => resolve(v as T), reject });
        const timer = setTimeout(() => {
          if (this.pending.delete(id)) {
            reject(new HelperError("HELPER_TIMEOUT", `helper timed out: ${cmd}`));
          }
        }, timeoutMs);
        timer.unref?.();

        child.stdin.write(payload, (err) => {
          if (err) {
            if (this.pending.delete(id)) {
              clearTimeout(timer);
              reject(new HelperError("HELPER_WRITE_ERROR", err.message));
            }
          }
        });
      });
    });
  }

  ping(timeoutMs = 10_000): Promise<HelperInfo> {
    return this.request<HelperInfo>("ping", {}, timeoutMs);
  }

  reopen(timeoutMs = 120_000): Promise<{ reopened: string[] }> {
    return this.request<{ reopened: string[] }>("reopen", {}, timeoutMs);
  }

  async close(): Promise<void> {
    const child = this.child;
    if (!child) return;
    this.child = null;
    try {
      child.stdin.end();
    } catch {
      /* ignore */
    }
    await new Promise((r) => setTimeout(r, 100));
    if (!child.killed) child.kill();
  }
}
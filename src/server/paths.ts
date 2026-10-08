/**
 * Resolve the paths the MCP server needs from a Shamela 4 install:
 * database dir, bundled JRE, Lucene jars, and our helper jar.
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface ShamelaPaths {
  installRoot: string;
  database: string;
  jre: string;
  jars: string[];
  helperJar: string;
}

export class ShamelaNotFoundError extends Error {
  code = "SHAMELA_NOT_FOUND";
  constructor(probed: string[]) {
    super(
      `Could not locate a Shamela install. Set SHAMELA_INSTALL_ROOT. Probed: ${probed.join(", ")}`
    );
    this.name = "ShamelaNotFoundError";
  }
}

export function validateInstallRoot(candidate: string): { ok: true; installRoot: string } | { ok: false; reason: string } {
  if (!candidate) return { ok: false, reason: "empty" };
  const resolved = path.resolve(candidate);
  if (!fs.existsSync(resolved)) return { ok: false, reason: "missing" };
  if (!fs.statSync(resolved).isDirectory()) return { ok: false, reason: "not a directory" };
  const base = path.basename(resolved);
  const root = base.toLowerCase() === "database" ? path.dirname(resolved) : resolved;
  if (!fs.existsSync(path.join(root, "database"))) return { ok: false, reason: "no database/ dir" };
  if (!fs.existsSync(path.join(root, "app"))) return { ok: false, reason: "no app/ dir" };
  return { ok: true, installRoot: root };
}

function findInstallRoot(): string {
  const probed: string[] = [];
  const envRoot = process.env.SHAMELA_INSTALL_ROOT?.trim();
  if (envRoot) {
    const r = validateInstallRoot(envRoot);
    if (r.ok) return r.installRoot;
    probed.push(`${envRoot} [env: ${r.reason}]`);
  }
  const home = os.homedir();
  const candidates: string[] = [];
  if (process.platform === "win32") {
    candidates.push(
      "C:\\shamela4",
      "C:\\Program Files\\shamela4",
      path.join(home, "shamela4"),
      ...["D", "E", "F"].map((d) => `${d}:\\shamela4`)
    );
  } else if (process.platform === "darwin") {
    candidates.push(path.join(home, "Library", "Application Support", "Shamela"));
  } else {
    candidates.push(
      path.join(home, "shamela", "shamela"),
      path.join(home, ".local", "share", "shamela4"),
      "/opt/shamela4",
      "/opt/shamela"
    );
  }
  for (const c of candidates) {
    const r = validateInstallRoot(c);
    if (r.ok) return r.installRoot;
    probed.push(`${c} [${r.reason}]`);
  }
  throw new ShamelaNotFoundError(probed);
}

export function resolveJre(installRoot: string): string {
  const envJre = process.env.SHAMELA_JRE?.trim();
  if (envJre) {
    if (fs.existsSync(envJre)) {
      if (fs.statSync(envJre).isFile()) return envJre;
      for (const c of [path.join(envJre, "bin", "java.exe"), path.join(envJre, "bin", "java")]) {
        if (fs.existsSync(c)) return c;
      }
    }
    throw new Error(`SHAMELA_JRE invalid: ${envJre}`);
  }
  const platform = process.platform;
  const candidates: string[] = [];
  for (const v of ["2", "1"]) {
    if (platform === "win32") {
      candidates.push(
        path.join(installRoot, "app", "win", "64", "jre", v, "bin", "java.exe"),
        path.join(installRoot, "app", "win", "32", "jre", v, "bin", "java.exe")
      );
    } else if (platform === "darwin") {
      candidates.push(
        path.join(installRoot, "app", "mac", "arm64", "jre", v, "bin", "java"),
        path.join(installRoot, "app", "mac", "x86_64", "jre", v, "bin", "java"),
        path.join(installRoot, "app", "mac", "64", "jre", v, "bin", "java")
      );
    } else {
      candidates.push(path.join(installRoot, "app", "linux", "64", "jre", v, "bin", "java"));
    }
  }
  for (const c of candidates) if (fs.existsSync(c)) return c;
  throw new Error(`Shamela bundled JRE not found under ${path.join(installRoot, "app")}`);
}

export function resolveJars(installRoot: string): string[] {
  for (const v of ["2", "1"]) {
    const dir = path.join(installRoot, "app", "lucene", v);
    if (!fs.existsSync(dir)) continue;
    const jars = fs
      .readdirSync(dir)
      .filter((n) => n.toLowerCase().endsWith(".jar"))
      .map((n) => path.join(dir, n))
      .sort();
    if (jars.length) return jars;
  }
  throw new Error(`No Lucene jars under ${path.join(installRoot, "app", "lucene")}`);
}

function resolveHelperJar(): string {
  const envOverride = process.env.SHAMELA_HELPER_JAR?.trim();
  if (envOverride && fs.existsSync(envOverride)) return envOverride;
  let current = __dirname;
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(current, "package.json"))) {
      return path.join(current, "helper", "shamela-helper.jar");
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return path.resolve(__dirname, "..", "helper", "shamela-helper.jar");
}

export async function resolveAll(): Promise<ShamelaPaths> {
  const installRoot = findInstallRoot();
  const database = path.join(installRoot, "database");
  const jre = resolveJre(installRoot);
  const jars = resolveJars(installRoot);
  const helperJar = resolveHelperJar();
  if (!fs.existsSync(helperJar)) {
    throw new Error(
      `Helper jar missing at ${helperJar}. Run ./scripts/build-java.sh first.`
    );
  }
  return { installRoot, database, jre, jars, helperJar };
}
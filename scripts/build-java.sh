#!/usr/bin/env bash
set -euo pipefail

# Build the Java Lucene helper that reads Shamela's full-text indexes.
# Uses Shamela's own bundled Lucene jars + a JDK 21 (system or known path).
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/src/java/java/src/main/java"
# Build in /tmp: Java tooling mangles @file/classpath args containing spaces.
BUILD="$(mktemp -d /tmp/shamela-helper.XXXXXX)"
trap 'rm -rf "$BUILD"' EXIT
OUT="$ROOT/helper/shamela-helper.jar"

SHAMELA_ROOT="${SHAMELA_INSTALL_ROOT:-$HOME/shamela/shamela}"
LUCENE_DIR="$SHAMELA_ROOT/app/lucene/2"

# Find javac: JAVA_HOME, known paths, or PATH.
JAVAC=""
for cand in "${JAVA_HOME:-}/bin/javac" "$HOME/opt/jdk21/bin/javac" "/usr/lib/jvm"/*/bin/javac "javac"; do
    if command -v "$cand" >/dev/null 2>&1 && "$cand" -version >/dev/null 2>&1; then
        JAVAC="$cand"
        break
    fi
done
[ -n "$JAVAC" ] || { echo "No JDK 21+ (javac) found. Set JAVA_HOME." >&2; exit 1; }

[ -d "$LUCENE_DIR" ] || { echo "No Lucene jars at $LUCENE_DIR (check SHAMELA_INSTALL_ROOT)" >&2; exit 1; }

CLASSPATH="$(printf '%s:' "$LUCENE_DIR"/*.jar)"; CLASSPATH="${CLASSPATH%:}"

rm -rf "$(dirname "$OUT")"
mkdir -p "$BUILD/classes" "$(dirname "$OUT")"

echo "Compiling with $(basename "$JAVAC") against $LUCENE_DIR"
mkdir -p "$BUILD/src"
cp -r "$SRC/." "$BUILD/src/"
SRC_FILES=$(find "$BUILD/src" -name '*.java')
printf '%s\n' "$SRC_FILES" > "$BUILD/sources.txt"
"$JAVAC" -encoding UTF-8 -source 21 -target 21 \
    -d "$BUILD/classes" -cp "$CLASSPATH" @"$BUILD/sources.txt"

printf 'Manifest-Version: 1.0\nMain-Class: ws.shamela.mcp.Main\n\n' > "$BUILD/MANIFEST.MF"
JAR_BIN="${JAVAC%/javac}/jar"
(cd "$BUILD/classes" && "$JAR_BIN" cfm "$OUT" "$BUILD/MANIFEST.MF" .)

echo "Built $OUT ($(du -h "$OUT" | cut -f1))"
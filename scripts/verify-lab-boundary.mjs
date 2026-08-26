#!/usr/bin/env node
/**
 * Verifies that laboratory-only derivation/vector helpers are not imported
 * directly by application, server, or shared runtime surfaces.
 *
 * This is a boundary guard, not a cryptographic authorization mechanism. It
 * prevents an accidental import path; it does not make a secret-handling path
 * safe or enable any wallet capability. It resolves literal static import,
 * re-export, and require specifiers; a dynamic import whose specifier is held
 * in a variable requires AST/data-flow analysis and is intentionally outside
 * this regex guard's scope.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const runtimeRoots = [
  "app",
  "components",
  "constants",
  "hooks",
  "lib",
  "modules",
  "plugins",
  "server",
  "shared",
];
const labModules = new Set([
  "shared/bip84-derivation",
  "shared/mnemonic-recovery",
  "shared/public-bip-vectors",
  "shared/signet-derivation-policy",
]);
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const importPattern = /(?:from\s*|import\s*\(|require\s*\()(["'])([^"']+)\1/g;

function walk(directory) {
  const files = [];
  if (!existsSync(directory)) return files;

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git" || entry.name === ".expo") continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(path));
    else if (sourceExtensions.has(extname(entry.name))) files.push(path);
  }
  return files;
}

function resolveImport(sourceFile, specifier) {
  if (specifier.startsWith("@/")) return resolve(projectRoot, specifier.slice(2));
  if (specifier.startsWith(".")) return resolve(dirname(sourceFile), specifier);
  return null;
}

function canonicalModulePath(path) {
  const candidates = [
    path,
    `${path}.ts`,
    `${path}.tsx`,
    `${path}.js`,
    `${path}.jsx`,
    `${path}.mjs`,
    `${path}/index.ts`,
    `${path}/index.tsx`,
    `${path}/index.js`,
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  return match ? relative(projectRoot, match).replaceAll("\\", "/").replace(/\.[^.]+$/, "") : null;
}

function scanLabBoundary() {
  const violations = [];
  for (const root of runtimeRoots) {
    for (const sourceFile of walk(join(projectRoot, root))) {
      const sourcePath = canonicalModulePath(sourceFile);
      if (sourcePath && labModules.has(sourcePath)) continue;

      const source = readFileSync(sourceFile, "utf8");
      for (const match of source.matchAll(importPattern)) {
        const specifier = match[2];
        const resolved = resolveImport(sourceFile, specifier);
        if (!resolved) continue;
        const modulePath = canonicalModulePath(resolved);
        if (modulePath && labModules.has(modulePath)) {
          const line = source.slice(0, match.index).split("\n").length;
          violations.push({
            file: relative(projectRoot, sourceFile),
            line,
            specifier,
            modulePath,
          });
        }
      }
    }
  }
  return violations;
}

const violations = scanLabBoundary();
if (violations.length > 0) {
  console.error("TEST/LAB BOUNDARY: FAIL");
  for (const violation of violations) {
    console.error(
      `  ${violation.file}:${violation.line} imports ${violation.specifier} (${violation.modulePath})`,
    );
  }
  process.exit(1);
}

console.log("TEST/LAB BOUNDARY: PASS");
console.log(`Runtime roots scanned: ${runtimeRoots.join(", ")} (laboratory module files excluded)`);
console.log(`Laboratory modules protected: ${[...labModules].join(", ")}`);

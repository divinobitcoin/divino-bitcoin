import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const guardPath = join(process.cwd(), "scripts", "verify-lab-boundary.mjs");

function initFixtureRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), "lab-boundary-guard-"));
  const git = (...args: string[]) => execFileSync("git", args, { cwd: dir, stdio: "pipe" });

  git("init", "-q");
  git("config", "user.name", "divinobitcoin");
  git("config", "user.email", "divinobitcoin@users.noreply.github.com");

  mkdirSync(join(dir, "scripts"), { recursive: true });
  mkdirSync(join(dir, "shared"), { recursive: true });
  writeFileSync(join(dir, "scripts", "verify-lab-boundary.mjs"), "");
  writeFileSync(join(dir, "shared", "bip84-derivation.ts"), "export const labOnly = true;\n");

  return dir;
}

function runGuard(
  dir: string,
  importerDirectory: string,
  reexportAll = false,
): { status: number | null; output: string } {
  mkdirSync(join(dir, importerDirectory), { recursive: true });
  const source = reexportAll
    ? 'export * from "../shared/bip84-derivation";\n'
    : 'export { labOnly } from "../shared/bip84-derivation";\n';
  writeFileSync(join(dir, importerDirectory, "runtime-import.ts"), source);
  const result = spawnSync(process.execPath, [join(dir, "scripts", "verify-lab-boundary.mjs")], {
    cwd: dir,
    encoding: "utf8",
    env: { ...process.env },
  });
  return {
    status: result.status,
    output: `${result.stdout ?? ""}\n${result.stderr ?? ""}`,
  };
}

describe("TEST/LAB boundary guard", () => {
  it.each(["constants", "modules", "plugins", "lib"])("reprova imports em %s", (directory) => {
    const dir = initFixtureRepo();
    // Copy the real guard after the fixture is created so its projectRoot points
    // to the temporary repository under test.
    writeFileSync(join(dir, "scripts", "verify-lab-boundary.mjs"), requireGuardSource());
    chmodSync(join(dir, "scripts", "verify-lab-boundary.mjs"), 0o755);

    const result = runGuard(dir, directory);
    expect(result.status).not.toBe(0);
    expect(result.output).toContain(`${directory}/runtime-import.ts`);
    expect(result.output).toContain("TEST/LAB BOUNDARY: FAIL");
  });

  it("reprova reexportação `export * from` em lib", () => {
    const dir = initFixtureRepo();
    writeFileSync(join(dir, "scripts", "verify-lab-boundary.mjs"), requireGuardSource());
    chmodSync(join(dir, "scripts", "verify-lab-boundary.mjs"), 0o755);

    const result = runGuard(dir, "lib", true);
    expect(result.status).not.toBe(0);
    expect(result.output).toContain("lib/runtime-import.ts");
    expect(result.output).toContain("TEST/LAB BOUNDARY: FAIL");
  });
});

function requireGuardSource(): string {
  // Keep the regression test independent of module loading; the test executes
  // the same source file that CI executes.
  return readFileSync(guardPath, "utf8");
}

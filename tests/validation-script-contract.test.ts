import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * P1-00 — contrato do mecanismo de validação.
 *
 * Estes testes existem porque a validação do P0 continha uma aprovação vazia:
 * `git diff --check` sem argumentos compara apenas a árvore de trabalho contra
 * o índice. Com a árvore limpa — que é exatamente o estado ao gerar um
 * checkpoint — ele não inspeciona nenhum commit e retorna 0 sempre.
 *
 * LIMITAÇÃO DECLARADA: estes testes verificam o contrato do script de
 * validação (intervalo inspecionado e agregação de exit code). Eles não provam
 * que as etapas individuais (testes, lint, Android, SBOM) estejam corretas, e
 * não substituem execução em CI externo.
 */

const scriptPath = join(process.cwd(), "scripts", "validate-p1-final.sh");

function initTempRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), "validation-contract-"));
  const git = (...args: string[]) =>
    execFileSync("git", args, { cwd: dir, encoding: "utf8", stdio: "pipe" });

  git("init", "-q");
  git("config", "user.name", "divinobitcoin");
  git("config", "user.email", "divinobitcoin@users.noreply.github.com");
  writeFileSync(join(dir, "base.txt"), "linha limpa\n");
  git("add", "-A");
  git("commit", "-q", "-m", "base");
  git("branch", "-q", "base-ref");

  // Commit com trailing whitespace — a violação que o check deve encontrar.
  writeFileSync(join(dir, "sujo.txt"), "linha com espaco final   \n");
  git("add", "-A");
  git("commit", "-q", "-m", "introduz trailing whitespace");

  return dir;
}

describe("P1-00 — intervalo inspecionado pelo whitespace check", () => {
  it("`git diff --check` sem argumentos NÃO detecta violação já commitada", () => {
    const dir = initTempRepo();

    const bare = spawnSync("git", ["diff", "--check"], { cwd: dir, encoding: "utf8" });

    // Documenta o defeito do P0: árvore limpa => 0, sem inspecionar commits.
    expect(bare.status).toBe(0);
    expect(bare.stdout).toBe("");
  });

  it("`git diff --check base...HEAD` detecta a mesma violação", () => {
    const dir = initTempRepo();

    const ranged = spawnSync("git", ["diff", "--check", "base-ref...HEAD"], {
      cwd: dir,
      encoding: "utf8",
    });

    expect(ranged.status).not.toBe(0);
    expect(ranged.stdout).toMatch(/trailing whitespace/i);
  });

  it("o script P1 usa a forma com intervalo e não a forma vazia", () => {
    const source = readFileSync(scriptPath, "utf8");

    expect(source).toMatch(/git diff --check "\$\{BASE_REF\}\.\.\.HEAD"/);
    // Nenhuma invocação de `git diff --check` terminando sem um ref.
    const bareInvocation = /git diff --check\s*(?:\n|$)/.test(source);
    expect(bareInvocation).toBe(false);
  });
});

describe("P1-00 — agregação de exit code", () => {
  /**
   * Executa o script real com um PATH que substitui `pnpm` e `node` por stubs
   * que falham. `git` e `grep` continuam reais. O objetivo é provar que uma
   * etapa obrigatória com falha faz o script terminar não-zero, em vez de
   * registrar a falha no log e sair com 0 como acontecia antes.
   */
  function runWithFailingStubs(): { status: number | null; out: string } {
    const repo = initTempRepo();
    const binDir = join(repo, "fakebin");
    mkdirSync(binDir);

    for (const tool of ["pnpm", "node"]) {
      const stub = join(binDir, tool);
      writeFileSync(stub, `#!/usr/bin/env bash\necho "stub ${tool} falhou"\nexit 1\n`);
      chmodSync(stub, 0o755);
    }

    mkdirSync(join(repo, "scripts"), { recursive: true });
    writeFileSync(join(repo, "scripts", "validate-p1-final.sh"), readFileSync(scriptPath, "utf8"));
    chmodSync(join(repo, "scripts", "validate-p1-final.sh"), 0o755);

    const result = spawnSync("bash", ["scripts/validate-p1-final.sh", "OUT.txt"], {
      cwd: repo,
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${binDir}:${process.env.PATH ?? ""}`,
        BASE_REF: "base-ref",
      },
    });

    return { status: result.status, out: readFileSync(join(repo, "OUT.txt"), "utf8") };
  }

  it("termina com exit code não-zero quando uma etapa obrigatória falha", () => {
    const { status } = runWithFailingStubs();
    expect(status).not.toBe(0);
  });

  it("registra o resultado agregado como FALHA e conta as etapas obrigatórias", () => {
    const { out } = runWithFailingStubs();

    expect(out).toMatch(/AGGREGATE_RESULT=FALHA/);
    expect(out).toMatch(/MANDATORY_FAILURES=[1-9]/);
  });

  it("classifica `pnpm audit --prod` como informativa e não como obrigatória", () => {
    const { out } = runWithFailingStubs();

    expect(out).toMatch(/\[INFORMATIVA\] pnpm audit --prod/);
    expect(out).toMatch(/RESULT=REGISTRADO \(nao afeta o agregado\)/);
  });

  it("declara explicitamente que a evidência é local e não CI", () => {
    const { out } = runWithFailingStubs();
    expect(out).toMatch(/EVIDENCE_TYPE=local-only/);
  });
});

#!/usr/bin/env node
/**
 * Compara `pnpm audit --prod` com docs/dependency-risk-acceptance.json.
 *
 * Reprova quando:
 *   - existe vulnerabilidade de producao que nao consta no registro (risco novo);
 *   - existe entrada aceita cujo prazo expirou (exige nova revisao);
 *   - existe entrada aceita que nao aparece mais na auditoria (registro obsoleto).
 *
 * O terceiro caso e deliberado: o registro precisa representar a realidade.
 * Corrigir uma vulnerabilidade exige remover a aceitacao correspondente.
 *
 * Este script nao decide risco. Ele apenas verifica que toda vulnerabilidade
 * presente foi objeto de decisao registrada e ainda valida.
 */

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const acceptancePath = resolve(projectRoot, "docs", "dependency-risk-acceptance.json");

function runAudit() {
  // pnpm audit encerra com status diferente de zero quando encontra
  // vulnerabilidades. Isso e esperado: lemos a saida independentemente do status.
  const result = spawnSync("pnpm", ["audit", "--prod", "--json"], {
    cwd: projectRoot,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });

  if (!result.stdout || result.stdout.trim() === "") {
    console.error("ERRO: `pnpm audit --prod --json` nao produziu saida.");
    if (result.stderr) console.error(result.stderr);
    process.exit(2);
  }

  try {
    return JSON.parse(result.stdout);
  } catch {
    console.error("ERRO: saida de `pnpm audit` nao e JSON valido.");
    process.exit(2);
  }
}

function loadAcceptance() {
  try {
    return JSON.parse(readFileSync(acceptancePath, "utf8"));
  } catch (error) {
    console.error(`ERRO: nao foi possivel ler ${acceptancePath}: ${error.message}`);
    process.exit(2);
  }
}

const audit = runAudit();
const acceptance = loadAcceptance();

const advisories = Object.values(audit.advisories ?? {});
const presentIds = new Set(advisories.map((a) => a.github_advisory_id).filter(Boolean));
const acceptedById = new Map((acceptance.aceitas ?? []).map((entry) => [entry.ghsa, entry]));

const today = new Date().toISOString().slice(0, 10);
const failures = [];

// 1. Vulnerabilidade presente sem decisao registrada.
for (const advisory of advisories) {
  const id = advisory.github_advisory_id;
  if (!id) {
    failures.push(`Aviso sem github_advisory_id em ${advisory.module_name} — nao e possivel rastrear.`);
    continue;
  }
  if (!acceptedById.has(id)) {
    failures.push(
      `RISCO NOVO: ${id} (${advisory.severity}) em ${advisory.module_name} — ` +
        `"${advisory.title}". Nao consta em dependency-risk-acceptance.json. ` +
        `Corrija a dependencia ou registre a aceitacao com justificativa.`,
    );
  }
}

// 2. Aceitacao expirada.
for (const entry of acceptedById.values()) {
  if (!entry.expiraEm) {
    failures.push(`ACEITACAO SEM PRAZO: ${entry.ghsa} nao define expiraEm.`);
    continue;
  }
  if (entry.expiraEm < today) {
    failures.push(
      `ACEITACAO EXPIRADA: ${entry.ghsa} (${entry.pacote}) expirou em ${entry.expiraEm}. ` +
        `Exige nova revisao antes de prosseguir.`,
    );
  }
}

// 3. Aceitacao obsoleta — o registro precisa refletir a realidade.
for (const entry of acceptedById.values()) {
  if (!presentIds.has(entry.ghsa)) {
    failures.push(
      `ACEITACAO OBSOLETA: ${entry.ghsa} (${entry.pacote}) nao aparece mais na auditoria. ` +
        `Remova a entrada de dependency-risk-acceptance.json.`,
    );
  }
}

const counts = audit.metadata?.vulnerabilities ?? {};
console.log(
  `Auditoria de producao: ${counts.critical ?? 0} criticas, ${counts.high ?? 0} altas, ` +
    `${counts.moderate ?? 0} moderadas, ${counts.low ?? 0} baixas.`,
);
console.log(`Registro de aceitacao: ${acceptedById.size} entrada(s), revisado em ${acceptance._revisao?.revisadoEm ?? "?"}.`);

if (failures.length > 0) {
  console.error("");
  console.error("REPROVADO:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log("Todas as vulnerabilidades presentes constam do registro e as aceitacoes estao vigentes.");

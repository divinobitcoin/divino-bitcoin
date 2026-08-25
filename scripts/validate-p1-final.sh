#!/usr/bin/env bash
# Validação consolidada — Sprint P1
#
# Diferenças em relação a scripts/validate-p0-final.sh (P1-00):
#
#   1. O whitespace check passa a usar o intervalo real do branch
#      (origin/main...HEAD). A versão anterior usava `git diff --check` sem
#      argumentos, que compara apenas a árvore de trabalho contra o índice:
#      com a árvore limpa (situação normal ao gerar um checkpoint) ele não
#      inspeciona nenhum commit e retorna 0 sempre. Era uma aprovação vazia.
#
#   2. O script passa a ter resultado agregado. Qualquer etapa OBRIGATÓRIA
#      que falhar faz o script terminar com exit code não-zero, mantendo no
#      log o comando, a saída e o exit code de cada etapa.
#
#   3. `pnpm audit --prod` continua registrado, mas classificado como etapa
#      INFORMATIVA e separado da auditoria registrada
#      (scripts/audit-against-baseline.mjs), que é a etapa obrigatória.
#      Um exit code não-zero conhecido de `pnpm audit --prod` não pode virar
#      falsa reprovação, nem a ausência dele virar falsa aprovação.
#
# Este script produz evidência LOCAL. Não é CI. Não substitui execução externa.

set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
OUT="${1:-VALIDATION_P1_FINAL.txt}"
ANDROID_OUT=".expo-p1-final-export"
BASE_REF="${BASE_REF:-origin/main}"

rm -rf "$ANDROID_OUT"
: > "$OUT"

MANDATORY_FAILURES=0
INFORMATIVE_NOTES=0

log() { printf '%s\n' "$*" | tee -a "$OUT"; }

printf 'PROJECT_ROOT=%s\n' "$ROOT" >> "$OUT"
printf 'BRANCH=%s\n' "$(git branch --show-current)" >> "$OUT"
printf 'HEAD=%s\n' "$(git rev-parse HEAD)" >> "$OUT"
printf 'BASE_REF=%s\n' "$BASE_REF" >> "$OUT"
printf 'BASELINE=%s\n' "$(git rev-parse "$BASE_REF" 2>/dev/null || echo 'INDISPONIVEL')" >> "$OUT"
printf 'NODE=%s\n' "$(node --version 2>/dev/null || echo 'INDISPONIVEL')" >> "$OUT"
printf 'PNPM=%s\n' "$(pnpm --version 2>/dev/null || echo 'INDISPONIVEL')" >> "$OUT"
printf 'EVIDENCE_TYPE=local-only (nao e CI externo)\n\n' >> "$OUT"

# Etapa obrigatória: falha soma ao agregador.
run_required() {
  local label="$1"; shift
  printf '=== [OBRIGATORIA] %s ===\n' "$label" | tee -a "$OUT"
  printf 'CMD: %s\n' "$*" >> "$OUT"
  "$@" >> "$OUT" 2>&1
  local code=$?
  printf 'EXIT_CODE=%s\n' "$code" | tee -a "$OUT"
  if [ "$code" -ne 0 ]; then
    MANDATORY_FAILURES=$((MANDATORY_FAILURES + 1))
    printf 'RESULT=FALHA\n\n' | tee -a "$OUT"
  else
    printf 'RESULT=OK\n\n' | tee -a "$OUT"
  fi
}

# Etapa informativa: registrada, nunca reprova o agregador.
run_informative() {
  local label="$1"; shift
  printf '=== [INFORMATIVA] %s ===\n' "$label" | tee -a "$OUT"
  printf 'CMD: %s\n' "$*" >> "$OUT"
  "$@" >> "$OUT" 2>&1
  local code=$?
  printf 'EXIT_CODE=%s\n' "$code" | tee -a "$OUT"
  printf 'RESULT=REGISTRADO (nao afeta o agregado)\n\n' | tee -a "$OUT"
  if [ "$code" -ne 0 ]; then
    INFORMATIVE_NOTES=$((INFORMATIVE_NOTES + 1))
  fi
}

# --- P1-00: whitespace sobre o INTERVALO REAL do branch ---
if git rev-parse --verify --quiet "$BASE_REF" >/dev/null; then
  run_required "git diff --check ${BASE_REF}...HEAD" git diff --check "${BASE_REF}...HEAD"
else
  printf '=== [OBRIGATORIA] git diff --check %s...HEAD ===\n' "$BASE_REF" | tee -a "$OUT"
  printf 'RESULT=NAO_VERIFICADO (ref %s indisponivel; nao tratar como aprovado)\n\n' "$BASE_REF" | tee -a "$OUT"
  MANDATORY_FAILURES=$((MANDATORY_FAILURES + 1))
fi

run_required "pnpm test" pnpm test
run_required "pnpm check" pnpm check
run_required "pnpm lint" pnpm lint
run_required "teste direcionado: redaction OAuth" pnpm exec vitest run tests/oauth-log-redaction.test.ts
run_required "teste direcionado: parser PSBT" pnpm exec vitest run tests/psbt-parser.test.ts
run_required "teste de SBOM" pnpm exec vitest run tests/sbom-production.test.ts
run_required "auditoria registrada (baseline)" node scripts/audit-against-baseline.mjs

# --- Android guard ---
printf '=== [OBRIGATORIA] Android StyleSheet guard ===\n' | tee -a "$OUT"
if grep -RInE 'className|<Pressable' 'app/(android-tabs)' app/android-*.tsx \
     components/android-navigation-layout.tsx >> "$OUT" 2>&1; then
  printf 'ANDROID_GUARD=FAIL\nEXIT_CODE=1\nRESULT=FALHA\n\n' | tee -a "$OUT"
  MANDATORY_FAILURES=$((MANDATORY_FAILURES + 1))
else
  printf 'ANDROID_GUARD=PASS\nEXIT_CODE=0\nRESULT=OK\n\n' | tee -a "$OUT"
fi

run_required "exportacao Android" pnpm exec expo export --platform android --output-dir "$ANDROID_OUT"

# --- Informativa: separada da auditoria registrada, por decisão ---
run_informative "pnpm audit --prod" pnpm audit --prod

rm -rf "$ANDROID_OUT"

printf '=== STATUS AGREGADO ===\n' | tee -a "$OUT"
printf 'MANDATORY_FAILURES=%s\n' "$MANDATORY_FAILURES" | tee -a "$OUT"
printf 'INFORMATIVE_NONZERO=%s\n' "$INFORMATIVE_NOTES" | tee -a "$OUT"
printf 'EVIDENCE_TYPE=local-only (nao e CI externo)\n' | tee -a "$OUT"

if [ "$MANDATORY_FAILURES" -ne 0 ]; then
  printf 'AGGREGATE_RESULT=FALHA\n' | tee -a "$OUT"
  exit 1
fi

printf 'AGGREGATE_RESULT=OK\n' | tee -a "$OUT"
exit 0

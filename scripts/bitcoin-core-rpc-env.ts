/**
 * Resolve credenciais RPC para o nó Bitcoin Core próprio a partir do
 * ambiente: por cookie file (padrão do Core quando nenhum
 * rpcuser/rpcpassword está configurado) ou por
 * DIVINO_CORE_RPC_USER/DIVINO_CORE_RPC_PASSWORD explícitos.
 *
 * Extraído de `scripts/wallet-core-smoke.ts` para ser reaproveitado por
 * `scripts/lab-signet-flow.ts` (comando `send --via-node`) sem duplicar a
 * mesma lógica de autenticação em dois lugares.
 *
 * Fica em `scripts/`, não em `shared/`: usa `node:fs`/`node:os`, que não
 * existem no runtime do app (Expo/React Native). `shared/` é para código
 * que também pode rodar dentro do app; isto é estritamente ferramenta de
 * linha de comando.
 *
 * Não lê nem manuseia chave privada nenhuma — é autenticação RPC do nó,
 * não material de carteira.
 */

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";

export function expandHome(path: string): string {
  return path.startsWith("~") ? resolve(homedir(), path.slice(1).replace(/^\/+/, "")) : path;
}

export type BitcoinCoreRpcCredentials = { username: string; password: string };

export function resolveBitcoinCoreRpcCredentials(
  env: NodeJS.ProcessEnv = process.env,
): BitcoinCoreRpcCredentials {
  const envUser = env.DIVINO_CORE_RPC_USER;
  const envPassword = env.DIVINO_CORE_RPC_PASSWORD;

  if (envUser && envPassword) {
    return { username: envUser, password: envPassword };
  }
  if (envUser || envPassword) {
    throw new Error(
      "DIVINO_CORE_RPC_USER e DIVINO_CORE_RPC_PASSWORD precisam ser passadas juntas, ou nenhuma das duas.",
    );
  }

  const cookiePath = expandHome(env.DIVINO_CORE_RPC_COOKIE ?? "~/.bitcoin-divino-signet/signet/.cookie");

  let raw: string;
  try {
    raw = readFileSync(cookiePath, "utf8").trim();
  } catch (cause) {
    throw new Error(
      `Não consegui ler o arquivo de cookie RPC em "${cookiePath}".\n` +
        `  O nó está rodando? O caminho do datadir está certo?\n` +
        `  Alternativa: exportar DIVINO_CORE_RPC_USER e DIVINO_CORE_RPC_PASSWORD.\n` +
        `  Detalhe: ${cause instanceof Error ? cause.message : String(cause)}`,
      { cause },
    );
  }

  const separatorIndex = raw.indexOf(":");
  if (separatorIndex < 0) {
    throw new Error(`O arquivo de cookie em "${cookiePath}" não está no formato usuário:senha esperado.`);
  }

  return { username: raw.slice(0, separatorIndex), password: raw.slice(separatorIndex + 1) };
}

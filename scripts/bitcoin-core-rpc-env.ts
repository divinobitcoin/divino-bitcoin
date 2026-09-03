/**
 * Resolve credenciais RPC para o nó Bitcoin Core próprio, em três caminhos,
 * nesta ordem:
 *
 *   1. `DIVINO_CORE_RPC_USER` + `DIVINO_CORE_RPC_PASSWORD` explícitas
 *   2. cookie file — o padrão do Core quando nenhum `rpcuser` está configurado
 *   3. `rpcuser` / `rpcpassword` lidos do `bitcoin.conf`
 *
 * ## Por que o terceiro caminho existe
 *
 * **O Core não escreve cookie quando `rpcuser`/`rpcpassword` estão no
 * `bitcoin.conf`.** São mecanismos alternativos, não complementares. O nó de
 * Signet deste projeto usa o segundo, e a consequência apareceu em 03/09: o
 * Recovery Kit saiu **sem checksum nos descriptors** porque a ferramenta
 * procurou um cookie que nunca existiu — e um kit sem checksum é recusado pelo
 * `importdescriptors` do Bitcoin Core.
 *
 * O contorno era exportar duas variáveis à mão, toda sessão, com dois `sed`.
 * Funcionava enquanto alguém lembrasse, e é por isso que virou código: **o que
 * dá para pôr no código não fica na disciplina humana.**
 *
 * ## O que este módulo não faz
 *
 * **Nada aqui é impresso.** A senha atravessa a função e vai para o cabeçalho
 * `Authorization`; nenhuma mensagem de erro a inclui, nem quando o formato do
 * arquivo é inesperado — a mensagem descreve o problema pelo nome do campo e
 * pelo caminho do arquivo, nunca pelo conteúdo.
 *
 * Extraído de `scripts/wallet-core-smoke.ts` para ser reaproveitado sem
 * duplicar autenticação em vários lugares.
 *
 * Fica em `scripts/`, não em `shared/`: usa `node:fs`/`node:os`, que não
 * existem no runtime do app (Expo/React Native). `shared/` é para código que
 * também pode rodar dentro do app; isto é estritamente ferramenta de linha de
 * comando.
 *
 * Não lê nem manuseia chave privada nenhuma — é autenticação RPC do nó, não
 * material de carteira.
 */

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";

export function expandHome(path: string): string {
  return path.startsWith("~") ? resolve(homedir(), path.slice(1).replace(/^\/+/, "")) : path;
}

export type BitcoinCoreRpcCredentials = { username: string; password: string };

/** De onde a credencial veio. Serve para a ferramenta poder dizer isso na tela. */
export type BitcoinCoreRpcCredentialSource = "env" | "cookie" | "bitcoin.conf";

export type ResolvedBitcoinCoreRpcCredentials = BitcoinCoreRpcCredentials & {
  source: BitcoinCoreRpcCredentialSource;
  /** Caminho lido, quando a origem foi arquivo. */
  path?: string;
};

const COOKIE_PADRAO = "~/.bitcoin-divino-signet/signet/.cookie";
const CONF_PADRAO = "~/.bitcoin-divino-signet/bitcoin.conf";

/**
 * Lê `rpcuser` e `rpcpassword` de um `bitcoin.conf`.
 *
 * O formato aceita **seções de rede** — `[signet]`, `[testnet]`, `[main]` — e
 * um valor dentro da seção vence o global. Ignorar isso leria a credencial
 * errada num arquivo que configura mais de uma rede, e o sintoma seria um 401
 * sem explicação.
 *
 * Comentários começam com `#` e valores podem ter espaço em volta do `=`.
 */
export function lerCredenciaisDoConf(
  conteudo: string,
  secaoDeRede: string,
): { username?: string; password?: string; temRpcAuth: boolean } {
  const global: { username?: string; password?: string } = {};
  const daSecao: { username?: string; password?: string } = {};
  let secaoAtual: string | null = null;
  let temRpcAuth = false;

  for (const linhaBruta of conteudo.split(/\r?\n/)) {
    const linha = linhaBruta.replace(/#.*$/, "").trim();
    if (linha === "") continue;

    const cabecalho = /^\[([^\]]+)\]$/.exec(linha);
    if (cabecalho) {
      secaoAtual = cabecalho[1]!.trim().toLowerCase();
      continue;
    }

    const igual = linha.indexOf("=");
    if (igual < 0) continue;
    const chave = linha.slice(0, igual).trim().toLowerCase();
    const valor = linha.slice(igual + 1).trim();
    if (valor === "") continue;

    if (chave === "rpcauth") {
      temRpcAuth = true;
      continue;
    }
    if (chave !== "rpcuser" && chave !== "rpcpassword") continue;

    const alvo = secaoAtual === secaoDeRede ? daSecao : secaoAtual === null ? global : null;
    if (!alvo) continue;
    if (chave === "rpcuser") alvo.username = valor;
    else alvo.password = valor;
  }

  return {
    username: daSecao.username ?? global.username,
    password: daSecao.password ?? global.password,
    temRpcAuth,
  };
}

export function resolveBitcoinCoreRpcCredentials(
  env: NodeJS.ProcessEnv = process.env,
): ResolvedBitcoinCoreRpcCredentials {
  const envUser = env.DIVINO_CORE_RPC_USER;
  const envPassword = env.DIVINO_CORE_RPC_PASSWORD;

  if (envUser && envPassword) {
    return { username: envUser, password: envPassword, source: "env" };
  }
  if (envUser || envPassword) {
    throw new Error(
      "DIVINO_CORE_RPC_USER e DIVINO_CORE_RPC_PASSWORD precisam ser passadas juntas, ou nenhuma das duas.",
    );
  }

  const cookiePath = expandHome(env.DIVINO_CORE_RPC_COOKIE ?? COOKIE_PADRAO);
  let motivoCookie: string;
  try {
    const raw = readFileSync(cookiePath, "utf8").trim();
    const separador = raw.indexOf(":");
    if (separador < 0) {
      throw new Error(`o arquivo não está no formato usuário:senha esperado`);
    }
    return {
      username: raw.slice(0, separador),
      password: raw.slice(separador + 1),
      source: "cookie",
      path: cookiePath,
    };
  } catch (cause) {
    motivoCookie = cause instanceof Error ? cause.message : String(cause);
  }

  // Sem cookie. Isso é o NORMAL quando o nó usa rpcuser/rpcpassword — os dois
  // mecanismos são alternativos, e o Core não escreve cookie no segundo caso.
  const confPath = expandHome(env.DIVINO_CORE_RPC_CONF ?? CONF_PADRAO);
  const secaoDeRede = (env.DIVINO_CORE_RPC_NETWORK ?? "signet").toLowerCase();

  let conteudo: string;
  try {
    conteudo = readFileSync(confPath, "utf8");
  } catch (cause) {
    throw new Error(
      "Não achei credencial RPC por nenhum dos três caminhos.\n" +
        `  1. DIVINO_CORE_RPC_USER/_PASSWORD: não definidas.\n` +
        `  2. cookie em "${cookiePath}": ${motivoCookie}\n` +
        `  3. bitcoin.conf em "${confPath}": ${cause instanceof Error ? cause.message : String(cause)}\n` +
        "\n" +
        "  Se o datadir do nó é outro, aponte com DIVINO_CORE_RPC_CONF.",
      { cause },
    );
  }

  const { username, password, temRpcAuth } = lerCredenciaisDoConf(conteudo, secaoDeRede);

  if (username && password) {
    return { username, password, source: "bitcoin.conf", path: confPath };
  }

  if (temRpcAuth && !password) {
    throw new Error(
      `O "${confPath}" usa rpcauth, que guarda a senha em forma de hash.\n` +
        "  A senha em texto não está no arquivo e não pode ser recuperada dele —\n" +
        "  ela só existe onde você a anotou quando rodou o rpcauth.py.\n" +
        "  Exporte DIVINO_CORE_RPC_USER e DIVINO_CORE_RPC_PASSWORD.",
    );
  }

  throw new Error(
    `Li "${confPath}", mas ele não tem ${!username && !password ? "rpcuser nem rpcpassword" : !username ? "rpcuser" : "rpcpassword"}.\n` +
      `  Procurei no nível global e na seção [${secaoDeRede}] (mude com DIVINO_CORE_RPC_NETWORK).\n` +
      `  O cookie também não serviu: ${motivoCookie}\n` +
      "  Alternativa: exportar DIVINO_CORE_RPC_USER e DIVINO_CORE_RPC_PASSWORD.",
  );
}

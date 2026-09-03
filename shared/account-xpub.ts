import { base58check as base58checkWith } from "@scure/base";
import { sha256 } from "@noble/hashes/sha2.js";

/**
 * Chave estendida **pública** de conta, colada pelo usuário.
 *
 * ## Por que este módulo existe, e por que ele não deriva nada
 *
 * A ADR-0001 proíbe a interface de derivar chave. `app/` é *runtime root* do
 * `guard:lab-boundary`, e o CI reprova qualquer import de
 * `shared/bip84-derivation`. A consequência já estava escrita: **a interface
 * não pode produzir o xpub da conta — ele tem de chegar pronto.**
 *
 * Este módulo é o que recebe esse xpub pronto. Ele faz três coisas, todas de
 * texto:
 *
 * 1. **recusa material privado**, alto e claro;
 * 2. confere a rede pelos bytes de versão e o checksum base58;
 * 3. monta os dois descriptors por concatenação.
 *
 * Nenhuma operação de chave acontece aqui. Decodificar base58check é conferir
 * um checksum de string; montar `wpkh(<x>/0/*)` é juntar texto. É por isso que
 * isto pode morar em `shared/`, que é runtime root.
 *
 * ## O desenho que dispensa derivação
 *
 * O `wallet-account-smoke.ts` precisa filtrar os UTXOs do nó pelos endereços da
 * própria conta (`SMOKE-MULTICONTA-001`), e isso exigiria derivar. A interface
 * evita o problema em vez de resolvê-lo: **uma wallet do Core por conta**. Se a
 * wallet contém apenas aquela conta, `listunspent` já *é* a conta, e não há o
 * que filtrar.
 *
 * `nomeDeWalletParaXpub` produz esse nome de forma determinística, a partir de
 * um hash do próprio xpub. Hash de string não é derivação de chave.
 */

/**
 * Prefixos de chave estendida **privada** que precisam ser recusados.
 *
 * **Esta é a recusa mais importante do módulo.** A PARTE 1 do Recovery Kit
 * imprime um `tprv`, e as duas partes ficam no mesmo arquivo quando o kit é
 * gerado inteiro. Um usuário cansado, recuperando fundos, pode copiar a linha
 * errada.
 *
 * Se a interface aceitasse, a chave privada entraria no heap JavaScript do
 * React Native — exatamente o que a ADR-0001 existe para impedir, e o guard
 * não pegaria, porque nada teria sido importado: o segredo teria entrado pela
 * porta da frente, digitado.
 */
const PREFIXOS_PRIVADOS = ["tprv", "xprv", "yprv", "zprv", "uprv", "vprv"] as const;

/** Bytes de versão de chave estendida pública, família testnet (inclui Signet). */
const VERSAO_TPUB = 0x043587cf;
/** Bytes de versão de chave estendida pública, mainnet. */
const VERSAO_XPUB = 0x0488b21e;

const base58check = base58checkWith(sha256);

export type ContaXpub = {
  /** A chave, normalizada (sem espaços em volta). */
  xpub: string;
  /** Descriptor de recebimento, sem checksum. O checksum vem do nó. */
  descriptorRecebimento: string;
  /** Descriptor de troco, sem checksum. */
  descriptorTroco: string;
  /**
   * Nome determinístico da wallet no Core, uma por conta.
   *
   * Ver `SMOKE-MULTICONTA-001`: `listunspent` responde pela wallet inteira, não
   * pela conta. Duas contas na mesma wallet somam saldos que não são da mesma
   * carteira.
   */
  nomeDaWallet: string;
};

/**
 * Nome de wallet derivado do xpub por hash.
 *
 * Determinístico de propósito: a mesma conta reaberta amanhã cai na mesma
 * wallet do nó, e o import é idempotente (`RANGE-SHRINK-001`). Um nome
 * aleatório criaria uma wallet nova a cada sessão, e o nó acumularia lixo.
 */
export function nomeDeWalletParaXpub(xpub: string): string {
  const digest = sha256(new TextEncoder().encode(xpub.trim()));
  let hexCurto = "";
  for (let i = 0; i < 4; i += 1) {
    hexCurto += digest[i]!.toString(16).padStart(2, "0");
  }
  return `divino-conta-${hexCurto}`;
}

/**
 * Valida a chave estendida colada e monta os descriptors da conta.
 *
 * Lança com mensagem explicativa em vez de devolver resultado tipado porque
 * **toda** falha aqui é entrada humana errada, e a tela precisa mostrar o
 * motivo. Não há caso de falha esperado que valha ramificação silenciosa.
 */
export function lerContaXpub(entrada: string): ContaXpub {
  const xpub = entrada.trim();

  if (xpub === "") {
    throw new Error("Cole a chave estendida pública da conta (começa com tpub).");
  }

  if (/\s/.test(xpub)) {
    throw new Error(
      "A chave tem espaços no meio.\n" +
        "  Se você colou as palavras de recuperação, PARE: elas nunca entram aqui.\n" +
        "  O que esta tela pede é a CHAVE ESTENDIDA PÚBLICA, da PARTE 2 do kit.",
    );
  }

  const prefixo = xpub.slice(0, 4).toLowerCase();

  if ((PREFIXOS_PRIVADOS as readonly string[]).includes(prefixo)) {
    throw new Error(
      `Isto é uma chave PRIVADA (${prefixo}). Recusando.\n` +
        "  Uma chave privada gasta todo o dinheiro da conta, e esta tela não\n" +
        "  precisa dela para nada — ela só observa saldo.\n" +
        "  Você provavelmente copiou da PARTE 1 do kit (SEGREDO). O que esta\n" +
        "  tela pede está na PARTE 2 (MAPA): CHAVE ESTENDIDA PÚBLICA DA CONTA.\n" +
        "  Se esta chave é de uma carteira com dinheiro real, considere-a exposta.",
    );
  }

  let bytes: Uint8Array;
  try {
    bytes = base58check.decode(xpub);
  } catch {
    throw new Error(
      "A chave não passou na verificação de integridade (checksum base58).\n" +
        "  Quase sempre é caractere faltando, sobrando ou trocado na cópia.\n" +
        "  Copie a linha inteira do kit, sem quebra de linha.",
    );
  }

  if (bytes.length !== 78) {
    throw new Error(
      `Uma chave estendida BIP-32 tem 78 bytes; esta tem ${bytes.length}. Não é uma chave estendida.`,
    );
  }

  const versao = ((bytes[0]! << 24) | (bytes[1]! << 16) | (bytes[2]! << 8) | bytes[3]!) >>> 0;

  if (versao === VERSAO_XPUB) {
    throw new Error(
      "Esta chave é de MAINNET (xpub), e este aplicativo só opera em Signet.\n" +
        "  Nenhum satoshi real entra neste projeto até auditoria externa.\n" +
        "  Em Signet e testnet a chave da conta começa com tpub.",
    );
  }

  if (versao !== VERSAO_TPUB) {
    throw new Error(
      `Bytes de versão desconhecidos (0x${versao.toString(16).padStart(8, "0")}).\n` +
        "  Esperado 0x043587cf, que é a chave pública da família testnet, à qual\n" +
        "  a Signet pertence. Formatos como vpub e upub descrevem o mesmo\n" +
        "  material com outra versão; converta para tpub antes de colar.",
    );
  }

  // O Core valida os bytes de versão contra a cadeia em que roda e recusa uma
  // chave de mainnet com `key ... is not valid` (código -5). Ver
  // `TPUB-SERIAL-001`: o erro parecia de derivação e era de serialização.
  return {
    xpub,
    descriptorRecebimento: `wpkh(${xpub}/0/*)`,
    descriptorTroco: `wpkh(${xpub}/1/*)`,
    nomeDaWallet: nomeDeWalletParaXpub(xpub),
  };
}

/**
 * Converte a data de nascimento impressa no kit no `timestamp` que o
 * `importdescriptors` espera.
 *
 * ## Por que isto não pode ficar como `"now"`
 *
 * O Core só varre a cadeia **a partir** do timestamp informado. Com `"now"`,
 * uma conta que já recebeu dinheiro aparece **vazia** — e o usuário conclui que
 * perdeu os fundos. É a mesma classe de falha silenciosa do
 * `GREEN-REDE-OCULTA-001`: tudo funciona, o número é zero, e nada explica por
 * quê.
 *
 * `"now"` só é honesto para uma conta que nasceu agora e nunca recebeu nada.
 *
 * ## Data, não altura
 *
 * O `importdescriptors` recebe **tempo UNIX**, não altura de bloco. O kit pode
 * imprimir qualquer um dos dois — `DIVINO_KIT_BIRTHDAY` aceita ambos —, então
 * altura é recusada aqui com instrução, em vez de convertida por chute.
 *
 * **Errar para trás custa tempo de varredura; errar para frente esconde
 * fundos.** Por isso a data vira o **início** do dia em UTC, e não o instante
 * da leitura.
 */
export function lerBirthdayDoKit(entrada: string): number | "now" {
  const valor = entrada.trim().toLowerCase();

  if (valor === "" || valor === "now") return "now";

  if (/^\d+$/.test(valor)) {
    throw new Error(
      `"${valor}" parece ser uma altura de bloco.\n` +
        "  O importdescriptors do Bitcoin Core recebe data, não altura.\n" +
        "  Use AAAA-MM-DD, com uma data ANTERIOR ao primeiro recebimento.",
    );
  }

  const casa = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  if (!casa) {
    throw new Error(
      `Data de nascimento inválida: "${entrada.trim()}". Use AAAA-MM-DD, ou deixe vazio ` +
        "apenas se a conta nunca recebeu nada.",
    );
  }

  const epochMs = Date.UTC(Number(casa[1]), Number(casa[2]) - 1, Number(casa[3]));

  // O primeiro bloco do Bitcoin é de 03/01/2009. Data anterior é engano de
  // digitação, e só faz o nó varrer a cadeia inteira à toa.
  if (epochMs < Date.UTC(2009, 0, 3)) {
    throw new Error(
      `A data ${valor} é anterior ao primeiro bloco do Bitcoin (2009-01-03). Provável erro de digitação.`,
    );
  }

  return Math.floor(epochMs / 1000);
}

/**
 * Derivação de CONTA para as ferramentas de laboratório.
 *
 * ## Por que este arquivo existe
 *
 * `scripts/wallet-account-smoke.ts` (que prova a conta contra o nó) e
 * `scripts/recovery-kit.ts` (que descreve a conta para uma ferramenta de
 * fora) precisam derivar **exatamente a mesma coisa**. Enquanto cada um
 * derivava por conta própria, nada impedia os dois de divergirem numa
 * mudança futura — e um Recovery Kit que descreve uma conta diferente da
 * que tem o dinheiro é pior do que não ter kit nenhum: ele falha em
 * silêncio, no dia em que for usado, que é o pior dia possível.
 *
 * ## Fronteira
 *
 * Mora em `scripts/`, que **não** é runtime root do `guard:lab-boundary`.
 * Por isso pode derivar a partir de seed. A carteira não pode, e é essa a
 * razão de o nó guardar os descriptors: o aplicativo pergunta ao nó em vez
 * de derivar. Nada aqui deve ser importado por `app/`, `shared/`,
 * `components/` ou qualquer outro runtime root.
 *
 * Material de laboratório apenas — seed descartável, Signet, valor zero
 * (`LAB-LANE-001`, condições L1/L2/L3).
 */

import { hex } from "@scure/base";
import { HDKey } from "@scure/bip32";
import * as btc from "@scure/btc-signer";

/** Conta padrão BIP-84 em testnet/Signet. `coin_type = 1` é testnet. */
export const ACCOUNT_PATH = "m/84'/1'/0'";

/**
 * Bytes de versão da família testnet, à qual a Signet pertence.
 *
 * **Achado real, 31/08/2026** (`TPUB-SERIAL-001`). O `@scure/bip32` serializa
 * a chave estendida com os bytes de mainnet por padrão, produzindo `xpub`. O
 * Bitcoin Core valida esses bytes contra a cadeia em que está rodando e
 * recusa: `wpkh(): key 'xpub6CsFd1KN92...' is not valid (código -5)`.
 *
 * O caminho de derivação já estava certo. Era só a serialização.
 *
 * Verificado: trocar a versão **não muda endereço nenhum**. Os bytes de
 * versão são serialização pura; a derivação de chave é a mesma. Uma seed já
 * usada continua controlando exatamente os mesmos endereços.
 */
export const VERSOES_TESTNET = { private: 0x04358394, public: 0x043587cf };

export type LabAccount = {
  /**
   * Fingerprint da chave mestra, 8 caracteres hex.
   *
   * É o que identifica a raiz dentro de um descriptor com origem
   * (`[fp/84h/1h/0h]tpub...`). Sem ele um assinador externo não sabe se a
   * chave que ele tem é a chave daquele descriptor.
   */
  masterFingerprint: string;
  /** Chave estendida pública da conta. Permite observar, não gastar. */
  accountXpub: string;
  /** Caminho da conta, na forma com apóstrofo. */
  accountPath: string;
  /** Endereços derivados, ramo 0 (recebimento) e ramo 1 (troco). */
  enderecos: { recebimento: string[]; troco: string[] };
  /**
   * Chave privada estendida da RAIZ. **Capaz de gastar tudo.**
   *
   * Só é preenchida quando `incluirChavePrivada: true` for pedido
   * explicitamente. Fora disso vem `null` — o padrão do módulo é não
   * produzir material de gasto, para que produzi-lo seja sempre uma
   * escolha visível em quem chama, e não um efeito colateral.
   */
  masterTprv: string | null;
};

/**
 * Valida a seed de laboratório vinda do ambiente.
 *
 * Recusa mnemonic **de propósito**, com a mesma disciplina de
 * `scripts/lab-signet-flow.ts`: se alguém colar uma seed real de 12 ou 24
 * palavras aqui, o certo é parar, não derivar.
 */
export function assertLabSeedHex(seed: string): string {
  if (seed.trim().includes(" ")) {
    throw new Error(
      "A seed parece ser um mnemonic (contém espaços).\n" +
        "  Esta ferramenta aceita SOMENTE seed em hex, e somente descartável.\n" +
        "  Se isso é um mnemonic de verdade, pare agora e não o use aqui.",
    );
  }
  if (!/^[0-9a-fA-F]+$/.test(seed) || seed.length % 2 !== 0) {
    throw new Error("A seed precisa ser hexadecimal de comprimento par.");
  }
  return seed.toLowerCase();
}

/**
 * Deriva a conta e os endereços de cada ramo.
 *
 * A seed morre nesta função: `wipePrivateData` em todos os nós
 * intermediários, num `finally`, inclusive quando algo lança no meio.
 * Isso é higiene, não garantia — o JavaScript não promete zerar memória, e
 * é exatamente por isso que este caminho é TEST/LAB permanente e a carteira
 * não o usa.
 */
export function deriveLabAccount(
  seedHex: string,
  rangeEnd: number,
  options: { incluirChavePrivada?: boolean } = {},
): LabAccount {
  if (!Number.isInteger(rangeEnd) || rangeEnd < 0) {
    throw new Error("rangeEnd precisa ser inteiro >= 0.");
  }

  const root = HDKey.fromMasterSeed(hex.decode(assertLabSeedHex(seedHex)), VERSOES_TESTNET);
  try {
    const masterFingerprint = root.fingerprint.toString(16).padStart(8, "0");
    const masterTprv = options.incluirChavePrivada ? (root.privateExtendedKey ?? null) : null;

    const conta = root.derive(ACCOUNT_PATH);
    try {
      const accountXpub = conta.publicExtendedKey;
      if (!accountXpub) {
        throw new Error(`Derivação em ${ACCOUNT_PATH} não produziu chave estendida pública.`);
      }
      if (!accountXpub.startsWith("tpub")) {
        throw new Error(
          `A chave estendida saiu como "${accountXpub.slice(0, 4)}", não "tpub".\n` +
            "  O Bitcoin Core em Signet recusa chave serializada como mainnet.\n" +
            "  Isso indica que VERSOES_TESTNET não foi aplicada na derivação.",
        );
      }

      const enderecos: { recebimento: string[]; troco: string[] } = { recebimento: [], troco: [] };
      for (const [ramo, rotulo] of [[0, "recebimento"], [1, "troco"]] as const) {
        for (let i = 0; i <= rangeEnd; i += 1) {
          const filho = conta.deriveChild(ramo).deriveChild(i);
          try {
            if (!filho.publicKey) throw new Error(`Sem chave pública em ${ACCOUNT_PATH}/${ramo}/${i}.`);
            const address = btc.p2wpkh(filho.publicKey, btc.TEST_NETWORK).address;
            if (!address) throw new Error(`Sem endereço em ${ACCOUNT_PATH}/${ramo}/${i}.`);
            enderecos[rotulo].push(address);
          } finally {
            filho.wipePrivateData();
          }
        }
      }

      return { masterFingerprint, accountXpub, accountPath: ACCOUNT_PATH, enderecos, masterTprv };
    } finally {
      conta.wipePrivateData();
    }
  } finally {
    root.wipePrivateData();
  }
}

/**
 * Monta os dois descriptors da conta, **com informação de origem**.
 *
 * A forma com origem — `wpkh([fp/84h/1h/0h]tpub.../0/*)` — carrega a
 * fingerprint da chave mestra e o caminho até a conta. A forma sem origem,
 * `wpkh(tpub.../0/*)`, é suficiente para o nó observar saldo, e é o que
 * `importWatchOnlyDescriptors` usa hoje. Mas ela **não diz de onde a chave
 * veio**, e por isso não serve para recuperação nem para assinatura externa:
 * um signer que receba uma PSBT precisa saber qual caminho derivar. Ver
 * `PSBT-DERIV-001`.
 *
 * O Recovery Kit usa sempre a forma com origem. É a que Sparrow, Bitcoin
 * Core e Electrum entendem sem que o usuário precise adivinhar nada.
 *
 * `h` em vez de `'` para o hardened: as duas formas são aceitas, e `h`
 * atravessa shell, JSON e cópia-e-cola sem virar aspas erradas.
 */
export function accountDescriptors(account: LabAccount): { receive: string; change: string } {
  const origem = `[${account.masterFingerprint}/84h/1h/0h]`;
  return {
    receive: `wpkh(${origem}${account.accountXpub}/0/*)`,
    change: `wpkh(${origem}${account.accountXpub}/1/*)`,
  };
}

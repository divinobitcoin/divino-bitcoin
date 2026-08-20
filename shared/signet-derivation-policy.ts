import { assertSignetOnly } from "./bitcoin-network";

const MAX_BIP32_INDEX = 0x7fffffff;

/**
 * Política de derivação declarativa, sem seed, chave, criptografia ou função
 * de derivação. O coin type de Testnet serve apenas à compatibilidade dos
 * vetores; Signet permanece explicitamente identificado como rede distinta.
 */
export const SIGNET_TEST_COMPATIBLE_BIP84_POLICY = {
  network: "signet",
  purpose: 84,
  testCompatibleCoinType: 1,
  addressType: "p2wpkh",
  passphraseSupported: false,
  derivationImplemented: false,
} as const;

export type SignetBip84PathInput = {
  account: number;
  change: 0 | 1;
  addressIndex: number;
};

/**
 * Formata somente a representação pública de caminho para testes e futura
 * interoperabilidade. Nunca recebe mnemonic, seed ou chave privada.
 */
export function formatSignetTestCompatibleBip84Path(
  network: string,
  input: SignetBip84PathInput,
): string {
  assertSignetOnly(network);
  assertBip32Index("account", input.account);
  assertBip32Index("addressIndex", input.addressIndex);

  return `m/${SIGNET_TEST_COMPATIBLE_BIP84_POLICY.purpose}'/${SIGNET_TEST_COMPATIBLE_BIP84_POLICY.testCompatibleCoinType}'/${input.account}'/${input.change}/${input.addressIndex}`;
}

function assertBip32Index(label: string, value: number): void {
  if (!Number.isInteger(value) || value < 0 || value > MAX_BIP32_INDEX) {
    throw new Error(`${label} precisa ser um índice BIP-32 entre 0 e ${MAX_BIP32_INDEX}.`);
  }
}

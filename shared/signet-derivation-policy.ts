import { assertSignetOnly } from "./bitcoin-network";
import { deriveBip84Address, type Bip84AddressResult } from "./bip84-derivation";

const MAX_BIP32_INDEX = 0x7fffffff;

/**
 * Política de derivação Signet. A partir de agora a derivação real existe
 * (ver deriveSignetTestCompatibleAddress abaixo), mas continua restrita a
 * seeds de vetores públicos de teste — nenhum caminho de código nesta fase
 * aceita mnemonic ou seed de usuário real. Isso só muda quando os gates da
 * ADR-0001 (build nativo, cofre implementado, autorização do proprietário)
 * forem satisfeitos.
 */
export const SIGNET_TEST_COMPATIBLE_BIP84_POLICY = {
  network: "signet",
  purpose: 84,
  testCompatibleCoinType: 1,
  addressType: "p2wpkh",
  passphraseSupported: false,
  derivationImplemented: true,
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

/**
 * Deriva um endereço real "test-compatible" (HRP tb1, coin_type Testnet) a
 * partir de uma seed de VETOR PÚBLICO DE TESTE. Esta função não sabe de onde
 * a seed veio — quem chama é responsável por garantir que só vetores
 * públicos cheguem aqui nesta fase. Nunca chamar com seed derivada de
 * mnemonic de usuário antes dos gates da ADR-0001 estarem satisfeitos.
 */
export function deriveSignetTestCompatibleAddress(
  network: string,
  seedHex: string,
  input: SignetBip84PathInput,
): Bip84AddressResult {
  const path = formatSignetTestCompatibleBip84Path(network, input);
  return deriveBip84Address(seedHex, path, "signet-test-compatible");
}



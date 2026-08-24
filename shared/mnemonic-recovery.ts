import { mnemonicToSeedSync, validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";

import { deriveBip84Address, type Bip84AddressNetwork, type Bip84AddressResult } from "./bip84-derivation";

/**
 * Prova que a cadeia completa de recuperação funciona:
 * mnemonic -> seed (BIP-39) -> endereço (BIP-84). Isso é o requisito de
 * "restauração verificada" do marco 0.8.
 *
 * RESTRIÇÃO DESTA FASE: só aceita mnemonic de vetores públicos de
 * especificação (ver shared/public-bip-vectors.ts). Esta função
 * deliberadamente NÃO é o fluxo de recuperação do usuário final — aquele
 * fluxo depende do cofre nativo, dos gates da ADR-0001, e de UX dedicada
 * de confirmação de backup. Esta função existe para provar a matemática,
 * não para aceitar mnemonic de um usuário real.
 */
export function recoverBip84AddressFromMnemonic(
  mnemonic: string,
  passphrase: string,
  path: string,
  network: Bip84AddressNetwork,
): Bip84AddressResult {
  if (!validateMnemonic(mnemonic, wordlist)) {
    throw new Error("Mnemonic inválido: falhou na validação de checksum BIP-39.");
  }

  const seed = mnemonicToSeedSync(mnemonic, passphrase);
  const seedHex = Buffer.from(seed).toString("hex");

  return deriveBip84Address(seedHex, path, network);
}

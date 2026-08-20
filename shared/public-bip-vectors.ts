/**
 * Dados publicados pelas especificações BIP e mantidos somente para testes de
 * interoperabilidade. Não são entrada do usuário, não são importados pela UI
 * e não devem ser convertidos em carteira, endereço ou assinatura.
 */
export const PUBLIC_BIP_TEST_VECTORS = {
  bip39: {
    classification: "public-specification-vector",
    entropyHex: "00000000000000000000000000000000",
    mnemonic: "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
    passphrase: "TREZOR",
    expectedSeedHex:
      "c55257c360c07c72029aebc1b53c05ed0362ada38ead3e3e9efa3708e53495531f09a6987599d18264c1e1c92f2cf141630c7a3c4ab7c81b2f001698e7463b04",
  },
  bip32: {
    classification: "public-specification-vector",
    seedHex: "000102030405060708090a0b0c0d0e0f",
    path: "m/0'/1/2'",
    expectedExtendedPublicKey:
      "xpub6D4BDPcP2GT577Vvch3R8wDkScZWzQzMMUm3PWbmWvVJrZwQY4VUNgqFJPMM3No2dFDFGTsxxpG5uJh7n7epu4trkrX7x7DogT5Uv6fcLW5",
  },
  bip84: {
    classification: "public-specification-vector",
    path: "m/84'/0'/0'/0/0",
    expectedAddress: "bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu",
  },
} as const;

export const BIP39_PASSPHRASE_POLICY = {
  enabled: false,
  reason: "A primeira fase Signet não oferece passphrase BIP-39.",
} as const;

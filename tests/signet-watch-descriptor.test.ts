import { hex } from "@scure/base";
import { HDKey } from "@scure/bip32";
import { describe, expect, it } from "vitest";

import {
  EXEMPLOS_ASSINADOR_PSBT,
  lerDescritorWatchOnly,
} from "../shared/signet-watch-descriptor";
import { lerWatchOnlyProfileGravado, serializarWatchOnlyProfile } from "../shared/signet-watch-profile";

const SEED = "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f";
const VERSOES_TESTNET = { private: 0x04358394, public: 0x043587cf };
const conta = HDKey.fromMasterSeed(hex.decode(SEED), VERSOES_TESTNET).derive("m/84'/1'/0'");
const TPUB = conta.publicExtendedKey;
const XPUB = HDKey.fromMasterSeed(hex.decode(SEED)).derive("m/84'/0'/0'").publicExtendedKey;
const FINGERPRINT = "aabbccdd";

describe("lerDescritorWatchOnly", () => {
  it("aceita tpub com fingerprint e monta descritores BIP-84 Signet", () => {
    const lido = lerDescritorWatchOnly(TPUB, FINGERPRINT);
    expect(lido.network).toBe("signet");
    expect(lido.level).toBe("external-signer");
    expect(lido.accountPath).toBe("m/84'/1'/0'");
    expect(lido.accountXpub).toBe(TPUB);
    expect(lido.receiveDescriptor).toBe(`wpkh([${FINGERPRINT}/84h/1h/0h]${TPUB}/0/*)`);
    expect(lido.changeDescriptor).toBe(`wpkh([${FINGERPRINT}/84h/1h/0h]${TPUB}/1/*)`);
    expect(lido.receiveAddress0.startsWith("tb1q")).toBe(true);
  });

  it("aceita descritor com origem e descritor multipath {0,1}", () => {
    const um = lerDescritorWatchOnly(`wpkh([${FINGERPRINT}/84h/1h/0h]${TPUB}/0/*)#qpzry9x8`);
    expect(um.masterFingerprint).toBe(FINGERPRINT);
    const multi = lerDescritorWatchOnly(`wpkh([${FINGERPRINT}/84'/1'/0']${TPUB}/{0,1}/*)`);
    expect(multi.accountXpub).toBe(TPUB);
    expect(multi.receiveAddress0).toBe(um.receiveAddress0);
  });

  it("recusa frase de recuperação, tprv, xpub e caminho Mainnet", () => {
    expect(() =>
      lerDescritorWatchOnly(
        "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
      ),
    ).toThrow(/seed|frase/i);
    expect(() => lerDescritorWatchOnly(conta.privateExtendedKey!, FINGERPRINT)).toThrow(/privada/i);
    expect(() => lerDescritorWatchOnly(XPUB, FINGERPRINT)).toThrow(/Mainnet|tpub/);
    expect(() =>
      lerDescritorWatchOnly(`wpkh([${FINGERPRINT}/84h/0h/0h]${TPUB}/0/*)`),
    ).toThrow(/Mainnet|84/);
  });

  it("recusa tpub sem fingerprint", () => {
    expect(() => lerDescritorWatchOnly(TPUB)).toThrow(/fingerprint/i);
  });
});

describe("EXEMPLOS_ASSINADOR_PSBT", () => {
  it("lista Sparrow, SeedSigner, Jade e Coldcard, sem loja", () => {
    expect([...EXEMPLOS_ASSINADOR_PSBT]).toEqual(["Sparrow", "SeedSigner", "Jade", "Coldcard"]);
  });
});

describe("perfil watch-only gravado", () => {
  it("volta a conferir o descritor e recusa tprv escondido", () => {
    const lido = lerDescritorWatchOnly(TPUB, FINGERPRINT);
    const roundtrip = lerWatchOnlyProfileGravado(serializarWatchOnlyProfile(lido));
    expect(roundtrip.receiveAddress0).toBe(lido.receiveAddress0);
    const adulterado = serializarWatchOnlyProfile(lido).replace(TPUB, conta.privateExtendedKey!);
    expect(() => lerWatchOnlyProfileGravado(adulterado)).toThrow(/privada|Recusando/i);
  });
});

import { lerContaXpub } from "./account-xpub";
import { assertSignetOnly } from "./bitcoin-network";
import { deriveWatchAddressBook } from "./signet-watch-addresses";

/**
 * Importação **pública** de descritor/xpub BIP-84 Signet para o Nível 2.
 *
 * Não cria seed, não deriva chave privada, não importa módulos LAB.
 * Recusa Mainnet, tprv/xprv e qualquer coisa que pareça frase de recuperação.
 */

export const SIGNET_ACCOUNT_PATH = "m/84'/1'/0'" as const;

export const EXEMPLOS_ASSINADOR_PSBT = ["Sparrow", "SeedSigner", "Jade", "Coldcard"] as const;

export type SignetWatchOnlyDescriptor = {
  network: "signet";
  level: "external-signer";
  accountPath: typeof SIGNET_ACCOUNT_PATH;
  masterFingerprint: string;
  accountXpub: string;
  receiveDescriptor: string;
  changeDescriptor: string;
  receiveAddress0: string;
};

const PREFIXOS_PRIVADOS = ["tprv", "xprv", "yprv", "zprv", "uprv", "vprv"] as const;

function pareceFraseDeRecuperacao(texto: string): boolean {
  const palavras = texto.trim().split(/\s+/).filter((parte) => parte.length > 0);
  if (palavras.length < 12) return false;
  return palavras.every((palavra) => /^[a-zA-Z]+$/.test(palavra));
}

function normalizarFingerprint(raw: string): string {
  const valor = raw.trim().toLowerCase();
  if (!/^[0-9a-f]{8}$/.test(valor)) {
    throw new Error("Fingerprint inválida. Esperado 8 caracteres hexadecimais.");
  }
  return valor;
}

function montarDescritores(fingerprint: string, tpub: string): {
  receiveDescriptor: string;
  changeDescriptor: string;
} {
  const origem = `[${fingerprint}/84h/1h/0h]`;
  return {
    receiveDescriptor: `wpkh(${origem}${tpub}/0/*)`,
    changeDescriptor: `wpkh(${origem}${tpub}/1/*)`,
  };
}

type DescritorLido = {
  tpub: string;
  fingerprint: string | null;
  ramos: Set<0 | 1>;
};

function recusarMaterialProibido(texto: string): void {
  if (pareceFraseDeRecuperacao(texto)) {
    throw new Error(
      "Isto parece uma frase de recuperação. Nível 2 não cria nem guarda seed no celular. Cole o descritor público ou o tpub.",
    );
  }

  const compacto = texto.replace(/\s+/g, "");
  const prefixo = compacto.slice(0, 4).toLowerCase();
  if ((PREFIXOS_PRIVADOS as readonly string[]).includes(prefixo) || /\b(tprv|xprv|yprv|zprv)\b/i.test(texto)) {
    throw new Error("Chave privada recusada. Nível 2 só observa: descritor público ou tpub.");
  }

  if (/\b(xpub|ypub|zpub)\b/i.test(texto) || /\/84[h']\/0[h']\//i.test(texto)) {
    throw new Error("Material Mainnet recusado. Este cofre observa só Signet BIP-84 (tpub, 84h/1h/0h).");
  }

  if (/\bbc1/i.test(texto)) {
    throw new Error("Endereço Mainnet recusado. Só Signet.");
  }

  if (/\b(sh\(|tr\(|pkh\(|wsh\()/i.test(texto)) {
    throw new Error("Só descritor BIP-84 nativo P2WPKH (wpkh). Outro tipo recusado.");
  }
}

function lerLinhaDescritor(linha: string): DescritorLido | null {
  const bruto = linha.trim().replace(/\s+/g, "");
  if (bruto === "") return null;

  const semChecksum = bruto.replace(/#([qpzry9x8gf2tvdw0s3jn54khce6mua7l]{8})$/i, "");

  if (semChecksum.toLowerCase().startsWith("tpub")) {
    const conta = lerContaXpub(semChecksum);
    return { tpub: conta.xpub, fingerprint: null, ramos: new Set([0, 1]) };
  }

  const casado =
    /^wpkh\((?:\[([0-9a-fA-F]{8})\/84[h']\/1[h']\/0[h']\])?(tpub[1-9A-HJ-NP-Za-km-z]+)\/(?:(0|1)|\{0,1\})\/\*\)$/i.exec(
      semChecksum,
    );
  if (!casado) {
    if (/^wpkh\(/i.test(semChecksum)) {
      if (/\/84[h']\/0[h']\//i.test(semChecksum)) {
        throw new Error("Caminho Mainnet recusado. Só BIP-84 Signet m/84'/1'/0'.");
      }
      if (/\/84[h']\/1[h']\/(?!0[h'])/i.test(semChecksum)) {
        throw new Error("Só a conta 0 de BIP-84 Signet (m/84'/1'/0'). Outra conta recusada.");
      }
      throw new Error("Descritor ilegível. Esperado wpkh([fingerprint/84h/1h/0h]tpub…/0/*) ou tpub.");
    }
    return null;
  }

  const fingerprint = casado[1] ? casado[1].toLowerCase() : null;
  const tpub = lerContaXpub(casado[2]!).xpub;
  const ramos = new Set<0 | 1>();
  if (casado[3] === "0") ramos.add(0);
  else if (casado[3] === "1") ramos.add(1);
  else {
    ramos.add(0);
    ramos.add(1);
  }
  return { tpub, fingerprint, ramos };
}

/**
 * Lê descritor/xpub BIP-84 Signet colado pelo utilizador.
 *
 * Aceita tpub, `wpkh([fp/84h/1h/0h]tpub/0/*)`, o par recebimento+troco,
 * ou o descritor multipath `{0,1}`. Fingerprint vem da origem do descritor
 * ou do segundo argumento, obrigatória nos dois casos.
 */
export function lerDescritorWatchOnly(
  entrada: string,
  fingerprintOpcional?: string,
): SignetWatchOnlyDescriptor {
  assertSignetOnly("signet");
  const texto = entrada.trim();
  if (texto === "") {
    throw new Error("Cole o descritor BIP-84 Signet ou o tpub da conta.");
  }

  recusarMaterialProibido(texto);

  const linhas = texto
    .split(/\r?\n/)
    .map((linha) => linha.trim())
    .filter((linha) => linha !== "");

  const lidos: DescritorLido[] = [];
  for (const linha of linhas) {
    const lido = lerLinhaDescritor(linha);
    if (!lido) {
      throw new Error(
        "Não reconheci este texto como descritor BIP-84 Signet nem como tpub. Nível 2 não aceita seed.",
      );
    }
    lidos.push(lido);
  }

  if (lidos.length === 0) {
    throw new Error("Cole o descritor BIP-84 Signet ou o tpub da conta.");
  }

  const tpub = lidos[0]!.tpub;
  for (const lido of lidos) {
    if (lido.tpub !== tpub) {
      throw new Error("Os descritores colados não são da mesma conta. Recusando.");
    }
  }

  const fingerprints = lidos
    .map((lido) => lido.fingerprint)
    .filter((valor): valor is string => valor !== null);
  for (const fp of fingerprints) {
    if (fp !== fingerprints[0]) {
      throw new Error("As fingerprints dos descritores não coincidem. Recusando.");
    }
  }

  const fingerprint = fingerprints[0]
    ? normalizarFingerprint(fingerprints[0])
    : fingerprintOpcional
      ? normalizarFingerprint(fingerprintOpcional)
      : (() => {
          throw new Error(
            "Falta a fingerprint da mestra. Cole um descritor com origem [aabbccdd/84h/1h/0h] ou informe os 8 hex.",
          );
        })();

  if (fingerprintOpcional && fingerprints[0] && normalizarFingerprint(fingerprintOpcional) !== fingerprint) {
    throw new Error("A fingerprint digitada não confere com a origem do descritor. Recusando.");
  }

  const ramos = new Set<0 | 1>();
  for (const lido of lidos) {
    for (const ramo of lido.ramos) ramos.add(ramo);
  }
  if (!ramos.has(0)) {
    throw new Error("Falta o descritor de recebimento (/0/*).");
  }

  const descritores = montarDescritores(fingerprint, tpub);
  const livro = deriveWatchAddressBook({
    network: "signet",
    accountXpub: tpub,
    masterFingerprint: fingerprint,
  });

  return {
    network: "signet",
    level: "external-signer",
    accountPath: SIGNET_ACCOUNT_PATH,
    masterFingerprint: fingerprint,
    accountXpub: tpub,
    receiveDescriptor: descritores.receiveDescriptor,
    changeDescriptor: descritores.changeDescriptor,
    receiveAddress0: livro.receive[0]!.address,
  };
}

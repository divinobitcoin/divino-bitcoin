import { HDKey } from "@scure/bip32";
import { base64, hex } from "@scure/base";
import * as btc from "@scure/btc-signer";

import { assertSignetOnly } from "./bitcoin-network";

/**
 * Assinatura de PSBT em JavaScript — **TEST/LAB PERMANENTE**.
 *
 * ## Leia isto antes de usar
 *
 * Este módulo manuseia **chave privada dentro do runtime JavaScript**. A
 * ADR-0001 rejeita explicitamente esse arranjo como cofre final, porque o
 * ambiente JS amplia log, inspeção e serialização acidental, e porque
 * linguagem gerenciada não dá garantia de apagamento de memória.
 *
 * Consequência: este módulo **nunca** vai virar caminho de produção. Ele existe
 * para exercitar o fluxo de assinatura em Signet, com seed descartável e valor
 * econômico zero — a faixa `LAB-LANE-001`. A assinatura de segredo real
 * acontecerá no módulo nativo (`modules/divino-native-vault`), atrás dos gates
 * da ADR-0001, e não aqui.
 *
 * Por isso este arquivo está registrado em `labModules` de
 * `scripts/verify-lab-boundary.mjs`: nenhum caminho de produção pode importá-lo,
 * e o CI reprova se alguém tentar.
 *
 * ## O que a seed que entra aqui precisa ser
 *
 * **Lixo descartável.** Gerada para teste, por quem escreve o código, sabendo
 * que pode vazar. Nunca seed de usuário, nunca seed com valor. Este módulo não
 * tem como verificar isso e não finge que tem — é a condição `L2` da faixa LAB,
 * e ela depende de disciplina humana, não de código.
 *
 * ## Defesas que existem de verdade
 *
 * - Rede: `assertSignetOnly` em execução, além do tipo literal. Mainnet não
 *   passa nem por tipo nem por runtime.
 * - A chave privada é derivada, usada e apagada dentro da mesma função. Nunca é
 *   devolvida, nunca é registrada, nunca sai daqui.
 * - `wipePrivateData()` no `HDKey` e `fill(0)` na cópia da chave, em `finally`.
 *   Best effort — a ADR-0001 já reconhece que runtime gerenciado não garante
 *   apagamento. Isto reduz exposição; não neutraliza aparelho comprometido.
 * - Chave errada é recusada pela biblioteca com "Input script doesn't have
 *   pubKey" — verificado empiricamente, e fixado em teste.
 */

/** Rede aceita. Literal de propósito: Mainnet não existe no tipo. */
export type SignerNetwork = "signet";

export type SignPsbtRequest = {
  psbtBase64: string;
  /** Seed em hex. DESCARTÁVEL. Ver o cabeçalho deste arquivo. */
  seedHex: string;
  /**
   * Caminho BIP-32 por entrada, na mesma ordem das entradas da PSBT.
   * O comprimento precisa bater com a quantidade de entradas — assinar a
   * entrada errada com a chave errada é falha silenciosa que só aparece no
   * `finalize`.
   */
  inputPaths: readonly string[];
  network: SignerNetwork;
};

export type SignedPsbt = {
  signedPsbtBase64: string;
  signedInputCount: number;
};

export type FinalizedTransaction = {
  rawTxHex: string;
  txid: string;
  /** vsize real, medido na transação assinada. Comparável com a estimativa da coin selection. */
  vsize: number;
  weight: number;
  inputCount: number;
  outputCount: number;
};

function assertNetwork(network: SignerNetwork): void {
  assertSignetOnly(network);
}

/**
 * Assina todas as entradas de uma PSBT com chaves derivadas da seed.
 *
 * Não finaliza. A PSBT devolvida ainda é uma PSBT — para obter a transação
 * transmissível, chame `finalizeSignedPsbt`. A separação é deliberada e é o
 * ponto do BIP-174: assinar e finalizar são passos distintos, e um assinador
 * externo faria só o primeiro.
 */
export function signPsbtWithTestSeed(request: SignPsbtRequest): SignedPsbt {
  const { psbtBase64, seedHex, inputPaths, network } = request;

  assertNetwork(network);

  if (!/^[0-9a-fA-F]+$/.test(seedHex) || seedHex.length % 2 !== 0) {
    throw new Error("seedHex precisa ser uma string hexadecimal de comprimento par.");
  }

  const tx = btc.Transaction.fromPSBT(base64.decode(psbtBase64));

  if (tx.inputsLength !== inputPaths.length) {
    throw new Error(
      `A PSBT tem ${tx.inputsLength} entradas, mas foram passados ${inputPaths.length} caminhos de derivação. ` +
        `Cada entrada precisa do caminho da chave que a assina, na mesma ordem.`,
    );
  }

  if (tx.inputsLength === 0) {
    throw new Error("PSBT sem entradas: não há o que assinar.");
  }

  const seed = hex.decode(seedHex);
  const root = HDKey.fromMasterSeed(seed);

  try {
    for (let index = 0; index < inputPaths.length; index++) {
      const child = root.derive(inputPaths[index]);

      if (!child.privateKey) {
        throw new Error(`Derivação em ${inputPaths[index]} não produziu chave privada.`);
      }

      // Cópia própria, para poder zerar sem depender do interno da biblioteca.
      const privateKey = Uint8Array.from(child.privateKey);

      try {
        // Lança se a chave não corresponder ao script da entrada. Isso é a
        // defesa contra assinar a entrada errada — verificado empiricamente.
        tx.signIdx(privateKey, index);
      } finally {
        privateKey.fill(0);
        child.wipePrivateData();
      }
    }
  } finally {
    root.wipePrivateData();
    seed.fill(0);
  }

  return {
    signedPsbtBase64: base64.encode(tx.toPSBT()),
    signedInputCount: tx.inputsLength,
  };
}

/**
 * Finaliza uma PSBT assinada e extrai a transação transmissível.
 *
 * `finalize()` valida as assinaturas; uma PSBT incompleta ou com assinatura
 * inválida faz esta função lançar em vez de devolver algo intransmissível.
 *
 * Confere que finalizar não alterou as saídas. Não deveria alterar — mas
 * "não deveria" é exatamente o que se verifica quando o assunto é dinheiro.
 */
export function finalizeSignedPsbt(params: {
  signedPsbtBase64: string;
  network: SignerNetwork;
}): FinalizedTransaction {
  assertNetwork(params.network);

  const tx = btc.Transaction.fromPSBT(base64.decode(params.signedPsbtBase64));

  const outputsAntes = Array.from({ length: tx.outputsLength }, (_, i) => {
    const output = tx.getOutput(i);
    return `${output.amount}:${hex.encode(output.script ?? new Uint8Array())}`;
  });

  tx.finalize();

  if (!tx.isFinal) {
    throw new Error("A PSBT não ficou final após finalize(). Provável assinatura faltando.");
  }

  const outputsDepois = Array.from({ length: tx.outputsLength }, (_, i) => {
    const output = tx.getOutput(i);
    return `${output.amount}:${hex.encode(output.script ?? new Uint8Array())}`;
  });

  if (outputsAntes.join("|") !== outputsDepois.join("|")) {
    throw new Error(
      "Erro interno: finalize() alterou as saídas da transação. Não transmitir.",
    );
  }

  return {
    rawTxHex: hex.encode(tx.extract()),
    txid: tx.id,
    vsize: tx.vsize,
    weight: tx.weight,
    inputCount: tx.inputsLength,
    outputCount: tx.outputsLength,
  };
}

/**
 * Atalho: assina e finaliza numa chamada.
 *
 * Conveniência de laboratório. Um fluxo real de carteira mantém os passos
 * separados, porque quem assina pode não ser quem finaliza nem quem transmite.
 */
export function signAndFinalizeWithTestSeed(request: SignPsbtRequest): FinalizedTransaction {
  const signed = signPsbtWithTestSeed(request);
  return finalizeSignedPsbt({
    signedPsbtBase64: signed.signedPsbtBase64,
    network: request.network,
  });
}

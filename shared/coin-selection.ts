import * as btc from "@scure/btc-signer";

import type { EsploraUtxo } from "./esplora-client";

/**
 * Seleção de moedas (coin selection) para gastos P2WPKH (BIP-84).
 *
 * Módulo PURO: sem rede, sem chave privada, sem assinatura, sem broadcast.
 * Recebe UTXOs e um alvo, devolve quais gastar, quanto de taxa e quanto de
 * troco. Nada aqui toca segredo.
 *
 * Autorizado pela faixa LAB (`docs/decisions/LAB-LANE-001.md`): Signet/Demo,
 * material descartável, valor econômico zero.
 *
 * ## Estratégia e suas consequências, declaradas
 *
 * A ordenação é **maior primeiro**. Isso minimiza a quantidade de entradas e,
 * portanto, a taxa. É determinístico, previsível e fácil de testar.
 *
 * Também tem custos reais, registrados aqui para que ninguém os descubra
 * depois achando que eram efeito colateral não previsto:
 *
 * - **Privacidade.** Gastar sempre o maior UTXO agrupa moedas de origens
 *   diferentes na mesma transação, o que liga endereços entre si na visão de
 *   qualquer observador da cadeia. Um algoritmo que evita troco (Branch and
 *   Bound, como o do Bitcoin Core) vaza menos e produz menos UTXOs residuais.
 * - **Fragmentação.** Deixa os UTXOs pequenos parados, acumulando poeira que
 *   fica cara de gastar quando a taxa sobe.
 *
 * Isto é a primeira implementação, deliberadamente simples e verificável.
 * Trocar por Branch and Bound é melhoria conhecida e desejável — não é dívida
 * escondida. `WF-F10` se aplica: este código é **permitido**, não é
 * **auditado**, e não deve ser descrito como bom para privacidade.
 */

// ---------------------------------------------------------------------------
// Constantes de tamanho — todas em vbytes
// ---------------------------------------------------------------------------
//
// Uma transação SegWit v0 gastando P2WPKH tem tamanho previsível. Os números
// abaixo são o custo de cada peça, medidos em vbytes (peso / 4).

/**
 * Cabeçalho fixo: nVersion (4) + marker (0,25) + flag (0,25) + contador de
 * entradas (1) + contador de saídas (1) + nLockTime (4).
 *
 * Fracionário de propósito. O arredondamento acontece uma única vez, no total.
 *
 * Os contadores valem 1 byte enquanto houver menos de 253 entradas ou saídas.
 * Acima disso o varint cresce e esta constante subestima. Uma carteira móvel
 * gastando 253 entradas numa transação é caso patológico, mas a limitação está
 * registrada em vez de assumida.
 */
export const TX_OVERHEAD_VBYTES = 10.5;

/**
 * Entrada P2WPKH: 41 bytes fora da testemunha (txid 32 + vout 4 + tamanho de
 * scriptSig vazio 1 + sequence 4) mais 108 bytes de testemunha (contador 1 +
 * assinatura 1+72 + chave pública 1+33), que valem 27 vbytes.
 *
 * A assinatura é contada como 72 bytes, o máximo de uma DER com low-S. Com
 * grinding de low-R ela costuma sair com 71. Contar 72 **superestima** a taxa
 * em ~0,25 vbyte por entrada — erro deliberadamente para o lado seguro: pagar
 * um pouco a mais confirma; pagar a menos trava a transação na mempool.
 */
export const P2WPKH_INPUT_VBYTES = 68;

/** Saída P2WPKH: valor (8) + tamanho do script (1) + script (22). */
export const P2WPKH_OUTPUT_VBYTES = 31;

/**
 * Limite de poeira para uma saída P2WPKH, em satoshis.
 *
 * O Bitcoin Core considera poeira uma saída que custa mais de 1/3 do próprio
 * valor para ser gasta, à taxa mínima de retransmissão de 3000 sat/kvB. Para
 * P2WPKH: (31 vbytes da saída + 67 vbytes para gastá-la) × 3 = 294 satoshis.
 *
 * Uma saída abaixo disso é rejeitada como não padrão pela rede — a transação
 * inteira não propaga. Não é preferência de carteira; é regra de nó.
 */
export const P2WPKH_DUST_THRESHOLD_SATS = 294;

/** Teto absoluto de satoshis que podem existir: 21.000.000 BTC. */
const MAX_SATS = 21_000_000 * 100_000_000;

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type CoinSelectionNetwork = "signet" | "mainnet";

export type CoinSelectionRequest = {
  utxos: readonly EsploraUtxo[];
  /** Endereço do destinatário. Usado só para medir o tamanho da saída. */
  recipientAddress: string;
  /** Quanto o destinatário deve receber, em satoshis. */
  targetSats: number;
  /** Taxa desejada, em satoshis por vbyte. Aceita fracionário (ex: 1,5). */
  feeRateSatsPerVByte: number;
  network: CoinSelectionNetwork;
  /**
   * Gastar UTXOs ainda não confirmados. Padrão `false`.
   *
   * Gastar não confirmado é arriscado: se a transação de origem for
   * substituída ou expirar da mempool, a transação nova morre junto. O padrão
   * é o conservador, e ligar isto é decisão consciente de quem chama.
   */
  allowUnconfirmed?: boolean;
};

export type CoinSelection = {
  selected: EsploraUtxo[];
  targetSats: number;
  /** Taxa realmente paga: total de entrada menos alvo menos troco. */
  feeSats: number;
  /** Troco devolvido. Zero quando não há saída de troco. */
  changeSats: number;
  hasChange: boolean;
  totalInputSats: number;
  /** Tamanho estimado da transação final, em vbytes, já arredondado. */
  estimatedVBytes: number;
  /**
   * Satoshis que viraram taxa por serem troco abaixo do limite de poeira.
   * Zero no caso normal. Diferente de zero significa que o usuário pagou mais
   * taxa do que a taxa pedida — a interface precisa mostrar isso.
   */
  droppedToFeeSats: number;
  /** Taxa efetiva realmente paga, em sat/vB. Pode passar da pedida quando há troco descartado. */
  effectiveFeeRateSatsPerVByte: number;
};

export type CoinSelectionOutcome =
  | { ok: true; selection: CoinSelection }
  | {
      ok: false;
      reason: "no-spendable-utxos";
      message: string;
    }
  | {
      ok: false;
      reason: "target-below-dust";
      message: string;
      targetSats: number;
      dustThresholdSats: number;
    }
  | {
      ok: false;
      reason: "insufficient-funds";
      message: string;
      availableSats: number;
      /** Alvo mais a taxa da menor transação que conseguiria pagá-lo. */
      requiredSats: number;
    };

// ---------------------------------------------------------------------------
// Tamanho de saída por endereço
// ---------------------------------------------------------------------------

function networkFor(network: CoinSelectionNetwork): typeof btc.NETWORK {
  return network === "mainnet" ? btc.NETWORK : btc.TEST_NETWORK;
}

/**
 * Mede quantos vbytes uma saída para este endereço vai ocupar.
 *
 * A medição usa `@scure/btc-signer` para decodificar o endereço e montar o
 * script real, em vez de adivinhar pelo prefixo. Isso importa: reconhecer
 * endereço por prefixo é exatamente o tipo de reimplementação de formato que
 * `WF-F11` proíbe, e erraria em P2WSH e P2TR, que compartilham prefixo com
 * P2WPKH mas produzem scripts maiores.
 *
 * Lança para endereço inválido ou de outra rede — recusa é o comportamento
 * correto, e é a única defesa deste módulo contra enviar para a rede errada.
 */
export function outputVBytesForAddress(
  address: string,
  network: CoinSelectionNetwork,
): number {
  let script: Uint8Array;
  try {
    script = btc.OutScript.encode(btc.Address(networkFor(network)).decode(address));
  } catch (cause) {
    throw new Error(
      `Endereço de destino inválido para a rede ${network}: ${JSON.stringify(address)}.`,
      { cause },
    );
  }

  // valor (8) + tamanho do script como varint (1 enquanto o script < 253 bytes) + script
  return 8 + 1 + script.length;
}

// ---------------------------------------------------------------------------
// Seleção
// ---------------------------------------------------------------------------

function assertValidRequest(request: CoinSelectionRequest): void {
  const { targetSats, feeRateSatsPerVByte } = request;

  if (!Number.isInteger(targetSats) || targetSats < 0 || targetSats > MAX_SATS) {
    throw new Error(
      `targetSats deve ser um inteiro de satoshis entre 0 e ${MAX_SATS}; recebido: ${JSON.stringify(targetSats)}.`,
    );
  }

  if (
    typeof feeRateSatsPerVByte !== "number" ||
    !Number.isFinite(feeRateSatsPerVByte) ||
    feeRateSatsPerVByte <= 0
  ) {
    throw new Error(
      `feeRateSatsPerVByte deve ser um número finito maior que zero; recebido: ${JSON.stringify(feeRateSatsPerVByte)}.`,
    );
  }
}

function estimateVBytes(inputCount: number, outputVBytes: number): number {
  return TX_OVERHEAD_VBYTES + inputCount * P2WPKH_INPUT_VBYTES + outputVBytes;
}

/**
 * Escolhe quais UTXOs gastar para pagar `targetSats` à taxa pedida.
 *
 * Devolve um resultado discriminado em vez de lançar para os casos esperados.
 * Saldo insuficiente **não** é excepcional numa carteira — é o dia a dia, e a
 * interface precisa tratá-lo como fluxo normal, não como erro capturado. Só
 * entrada programaticamente inválida (taxa negativa, alvo fracionário,
 * endereço de outra rede) lança.
 *
 * Invariante garantida em toda seleção bem-sucedida:
 *
 *     totalInputSats === targetSats + changeSats + feeSats
 *
 * Ela é verificada em tempo de execução antes do retorno. Se quebrar, é bug
 * deste módulo e a chamada falha alto em vez de devolver uma transação que não
 * fecha em satoshis.
 */
export function selectCoins(request: CoinSelectionRequest): CoinSelectionOutcome {
  assertValidRequest(request);

  const {
    utxos,
    recipientAddress,
    targetSats,
    feeRateSatsPerVByte,
    network,
    allowUnconfirmed = false,
  } = request;

  const recipientVBytes = outputVBytesForAddress(recipientAddress, network);

  if (targetSats < P2WPKH_DUST_THRESHOLD_SATS) {
    return {
      ok: false,
      reason: "target-below-dust",
      message: `Valor de ${targetSats} satoshis está abaixo do limite de poeira (${P2WPKH_DUST_THRESHOLD_SATS} sat). A rede recusaria a transação.`,
      targetSats,
      dustThresholdSats: P2WPKH_DUST_THRESHOLD_SATS,
    };
  }

  const spendable = utxos
    .filter((utxo) => (allowUnconfirmed ? true : utxo.confirmed))
    .slice()
    .sort((a, b) => b.valueSats - a.valueSats || a.txid.localeCompare(b.txid) || a.vout - b.vout);

  if (spendable.length === 0) {
    return {
      ok: false,
      reason: "no-spendable-utxos",
      message: allowUnconfirmed
        ? "Nenhum UTXO disponível para gastar."
        : "Nenhum UTXO confirmado disponível para gastar. Há saldo não confirmado que não está sendo considerado.",
    };
  }

  const selected: EsploraUtxo[] = [];
  let totalInputSats = 0;

  for (const utxo of spendable) {
    selected.push(utxo);
    totalInputSats += utxo.valueSats;

    // Tentativa 1: com saída de troco.
    const vbytesWithChange = estimateVBytes(selected.length, recipientVBytes + P2WPKH_OUTPUT_VBYTES);
    const feeWithChange = Math.ceil(vbytesWithChange * feeRateSatsPerVByte);
    const changeSats = totalInputSats - targetSats - feeWithChange;

    if (changeSats >= P2WPKH_DUST_THRESHOLD_SATS) {
      return finish({
        selected,
        totalInputSats,
        targetSats,
        changeSats,
        feeSats: feeWithChange,
        estimatedVBytes: Math.ceil(vbytesWithChange),
        droppedToFeeSats: 0,
      });
    }

    // Tentativa 2: sem saída de troco. A transação fica menor, então a taxa
    // exigida cai — o que às vezes torna pagável um alvo que não fechava com
    // troco. Qualquer sobra vira taxa, porque devolver poeira é impossível.
    const vbytesNoChange = estimateVBytes(selected.length, recipientVBytes);
    const feeNoChange = Math.ceil(vbytesNoChange * feeRateSatsPerVByte);

    if (totalInputSats >= targetSats + feeNoChange) {
      const droppedToFeeSats = totalInputSats - targetSats - feeNoChange;
      return finish({
        selected,
        totalInputSats,
        targetSats,
        changeSats: 0,
        feeSats: feeNoChange + droppedToFeeSats,
        estimatedVBytes: Math.ceil(vbytesNoChange),
        droppedToFeeSats,
      });
    }
  }

  // Esgotou os UTXOs sem cobrir. O "necessário" reportado usa a transação sem
  // troco com todas as entradas disponíveis — é o mínimo honesto que pagaria o
  // alvo, e é o número que a interface deve mostrar.
  const vbytesAll = estimateVBytes(spendable.length, recipientVBytes);
  const feeAll = Math.ceil(vbytesAll * feeRateSatsPerVByte);

  return {
    ok: false,
    reason: "insufficient-funds",
    message: `Saldo insuficiente. Disponível: ${totalInputSats} sat. Necessário: ${targetSats + feeAll} sat (${targetSats} de envio + ${feeAll} de taxa estimada).`,
    availableSats: totalInputSats,
    requiredSats: targetSats + feeAll,
  };
}

function finish(parts: {
  selected: EsploraUtxo[];
  totalInputSats: number;
  targetSats: number;
  changeSats: number;
  feeSats: number;
  estimatedVBytes: number;
  droppedToFeeSats: number;
}): CoinSelectionOutcome {
  const { totalInputSats, targetSats, changeSats, feeSats, estimatedVBytes } = parts;

  // Invariante de fechamento. Se isto quebrar, o bug é aqui e não adiante.
  if (totalInputSats !== targetSats + changeSats + feeSats) {
    throw new Error(
      `Erro interno de coin selection: os satoshis não fecham. ` +
        `entrada=${totalInputSats}, alvo=${targetSats}, troco=${changeSats}, taxa=${feeSats}.`,
    );
  }

  if (feeSats < 0) {
    throw new Error(`Erro interno de coin selection: taxa negativa (${feeSats}).`);
  }

  return {
    ok: true,
    selection: {
      selected: parts.selected.slice(),
      targetSats,
      feeSats,
      changeSats,
      hasChange: changeSats > 0,
      totalInputSats,
      estimatedVBytes,
      droppedToFeeSats: parts.droppedToFeeSats,
      effectiveFeeRateSatsPerVByte: feeSats / estimatedVBytes,
    },
  };
}

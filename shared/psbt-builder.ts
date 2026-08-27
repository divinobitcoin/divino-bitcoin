import { base64, hex } from "@scure/base";
import * as btc from "@scure/btc-signer";

import type { CoinSelection, CoinSelectionNetwork } from "./coin-selection";
import type { EsploraUtxo } from "./esplora-client";

/**
 * Construção de PSBT (BIP-174) para gastos P2WPKH.
 *
 * Constrói uma transação **não assinada**. Não deriva chave, não assina, não
 * transmite, e nunca recebe seed. A separação é o motivo de o PSBT existir:
 * BIP-174 foi especificado justamente para que quem monta a transação não
 * precise ter acesso à chave de quem assina.
 *
 * Autorizado pela faixa LAB (`docs/decisions/LAB-LANE-001.md`): Signet/Demo,
 * material descartável, valor econômico zero.
 *
 * ## Fatos verificados empiricamente, não presumidos
 *
 * - **Ordem de bytes do txid.** `addInput({ txid })` recebe o txid em **ordem
 *   de exibição** — a mesma que exploradores e a API Esplora devolvem — e a
 *   biblioteca inverte internamente para a serialização. Confirmado montando
 *   uma transação com txid distinguível e inspecionando os bytes crus. Errar
 *   isto produz uma transação que gasta um output que não existe, e o erro só
 *   aparece quando a rede rejeita.
 * - **Tamanho do script P2WPKH:** 22 bytes (`0014` + 20 bytes de hash).
 *
 * ## Omissões conhecidas, declaradas
 *
 * - **`bip32Derivation` não é preenchido.** Sem ele, só uma carteira que já
 *   conhece as próprias chaves consegue assinar; um assinador externo ou
 *   hardware signer não saberia qual chave usar para cada entrada. É lacuna
 *   real para o objetivo de interoperabilidade do roadmap, e deve ser
 *   preenchida junto com a assinatura, quando houver assinador para exercitá-la.
 *   Registrado como `PSBT-DERIV-001`. Preencher agora seria enviar campo cuja
 *   forma não foi testada contra assinador nenhum.
 * - **Ordem das saídas vaza qual é o troco.** Destino primeiro, troco depois.
 *   Qualquer observador da cadeia assume que a segunda saída é troco, e isso
 *   liga o troco à carteira. Embaralhar ou aplicar BIP-69 são melhorias
 *   conhecidas; nenhuma foi feita. Declarado em vez de escondido.
 * - **`lockTime` é 0 por padrão.** O Bitcoin Core define o locktime na altura
 *   atual como defesa contra *fee sniping* — reorganizar blocos para roubar
 *   transações de taxa alta. Este módulo é puro e não conhece a altura da
 *   cadeia; quem chamar pode passar `lockTime`. Enquanto ninguém passar, a
 *   defesa não existe.
 *
 * `WF-F10`: este código é **permitido**, não **auditado**.
 */

export type PsbtNetwork = CoinSelectionNetwork;

/**
 * Sequence que sinaliza RBF (BIP-125): permite substituir a transação por uma
 * de taxa maior enquanto ela não confirmar. É o padrão do Bitcoin Core.
 *
 * O contrário — transação sem RBF presa na mempool com taxa baixa demais — é
 * um problema que o usuário não tem como resolver a não ser esperar dias.
 */
export const RBF_SEQUENCE = 0xfffffffd;

/** Sequence final: desabilita RBF e locktime. Aqui só para quem pedir explicitamente. */
export const FINAL_SEQUENCE = 0xffffffff;

/**
 * Teto de taxa padrão, em satoshis. Não é economia de dinheiro — na Signet não
 * há dinheiro. É **detector de bug aritmético**: uma transação que pagaria
 * 300.000 sat de taxa quase certamente veio de um erro de cálculo, não de uma
 * intenção. Quem realmente quiser pagar mais passa `maxFeeSats`.
 */
export const DEFAULT_MAX_FEE_SATS = 25_000;

const MAX_SATS = 21_000_000 * 100_000_000;

export type PsbtInputSource = {
  utxo: EsploraUtxo;
  /**
   * Endereço dono deste UTXO. Necessário porque a API Esplora **não** devolve
   * o `scriptPubKey` na listagem de UTXOs; ele é derivado do endereço.
   *
   * Passar o endereço errado aqui produz um `witnessUtxo` com script errado, e
   * a assinatura resultante não valida. Não há como este módulo detectar isso
   * sozinho — ele não consulta a cadeia.
   */
  ownerAddress: string;
};

export type BuildPsbtRequest = {
  inputs: readonly PsbtInputSource[];
  recipientAddress: string;
  recipientSats: number;
  /** Endereço de troco. Obrigatório quando `changeSats > 0`. */
  changeAddress?: string;
  /** Troco em satoshis. Zero ou ausente = sem saída de troco. */
  changeSats?: number;
  network: PsbtNetwork;
  /** Sinalizar RBF. Padrão `true`. */
  enableRbf?: boolean;
  /** Locktime. Padrão 0. Ver omissões conhecidas no topo do arquivo. */
  lockTime?: number;
  /** Teto de taxa aceito. Padrão `DEFAULT_MAX_FEE_SATS`. */
  maxFeeSats?: number;
};

export type BuiltPsbt = {
  psbtBase64: string;
  psbtHex: string;
  /** Txid que a transação terá se for assinada e transmitida sem alteração. */
  unsignedTxId: string;
  inputCount: number;
  outputCount: number;
  totalInputSats: number;
  totalOutputSats: number;
  feeSats: number;
  rbfEnabled: boolean;
  lockTime: number;
};

function networkFor(network: PsbtNetwork): typeof btc.NETWORK {
  return network === "mainnet" ? btc.NETWORK : btc.TEST_NETWORK;
}

function scriptForAddress(address: string, network: PsbtNetwork, role: string): Uint8Array {
  try {
    return btc.OutScript.encode(btc.Address(networkFor(network)).decode(address));
  } catch (cause) {
    throw new Error(
      `Endereço ${role} inválido para a rede ${network}: ${JSON.stringify(address)}.`,
      { cause },
    );
  }
}

function assertSats(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0 || value > MAX_SATS) {
    throw new Error(
      `${label} deve ser um inteiro de satoshis entre 0 e ${MAX_SATS}; recebido: ${JSON.stringify(value)}.`,
    );
  }
}

/**
 * Monta uma PSBT não assinada.
 *
 * Lança para qualquer entrada inconsistente. Diferente de `selectCoins`, aqui
 * **não** existe caso de falha esperado: se a seleção de moedas já rodou, tudo
 * que chega aqui deveria fechar. Qualquer coisa que não feche é bug de quem
 * chamou, e falhar alto é o comportamento correto.
 *
 * A PSBT produzida é reparseada antes do retorno e conferida contra o que se
 * pretendia montar. Isso custa microssegundos e pega erro de codificação — a
 * classe de bug que não aparece em teste unitário de aritmética e só se
 * manifesta quando a rede rejeita a transação.
 */
export function buildUnsignedPsbt(request: BuildPsbtRequest): BuiltPsbt {
  const {
    inputs,
    recipientAddress,
    recipientSats,
    changeAddress,
    changeSats = 0,
    network,
    enableRbf = true,
    lockTime = 0,
    maxFeeSats = DEFAULT_MAX_FEE_SATS,
  } = request;

  if (inputs.length === 0) {
    throw new Error("PSBT precisa de pelo menos uma entrada.");
  }

  assertSats(recipientSats, "recipientSats");
  assertSats(changeSats, "changeSats");

  if (!Number.isInteger(lockTime) || lockTime < 0 || lockTime > 0xffffffff) {
    throw new Error(`lockTime deve ser um inteiro entre 0 e 4294967295; recebido: ${JSON.stringify(lockTime)}.`);
  }

  if (changeSats > 0 && !changeAddress) {
    throw new Error("changeSats maior que zero exige changeAddress.");
  }

  // Detecta o mesmo outpoint aparecendo duas vezes. Uma transação com entrada
  // duplicada é inválida, e o erro é fácil de introduzir ao concatenar listas.
  const seen = new Set<string>();
  for (const input of inputs) {
    const key = `${input.utxo.txid}:${input.utxo.vout}`;
    if (seen.has(key)) {
      throw new Error(`Entrada duplicada na PSBT: ${key}.`);
    }
    seen.add(key);
  }

  const totalInputSats = inputs.reduce((sum, input) => sum + input.utxo.valueSats, 0);
  const totalOutputSats = recipientSats + changeSats;
  const feeSats = totalInputSats - totalOutputSats;

  if (feeSats < 0) {
    throw new Error(
      `As saídas somam mais que as entradas: entrada=${totalInputSats} sat, saída=${totalOutputSats} sat. Faltam ${-feeSats} sat.`,
    );
  }

  if (feeSats === 0) {
    throw new Error(
      "Taxa zero. A transação não seria retransmitida pela rede. Provável erro de cálculo em quem chamou.",
    );
  }

  if (feeSats > maxFeeSats) {
    throw new Error(
      `Taxa de ${feeSats} sat passa do teto de ${maxFeeSats} sat. ` +
        `Se isto é intencional, passe maxFeeSats explicitamente; se não é, há erro de cálculo.`,
    );
  }

  const sequence = enableRbf ? RBF_SEQUENCE : FINAL_SEQUENCE;
  const tx = new btc.Transaction({ version: 2, lockTime, allowUnknownOutputs: false });

  for (const input of inputs) {
    tx.addInput({
      // Ordem de exibição, igual à que o Esplora devolve. Verificado
      // empiricamente contra os bytes crus — ver cabeçalho deste arquivo.
      txid: input.utxo.txid,
      index: input.utxo.vout,
      witnessUtxo: {
        script: scriptForAddress(input.ownerAddress, network, "de origem"),
        amount: BigInt(input.utxo.valueSats),
      },
      sequence,
    });
  }

  // Valida o endereço de destino antes de usá-lo, para que a mensagem de erro
  // diga qual endereço está errado em vez de vir de dentro da biblioteca.
  scriptForAddress(recipientAddress, network, "de destino");
  tx.addOutputAddress(recipientAddress, BigInt(recipientSats), networkFor(network));

  if (changeSats > 0 && changeAddress) {
    scriptForAddress(changeAddress, network, "de troco");
    tx.addOutputAddress(changeAddress, BigInt(changeSats), networkFor(network));
  }

  const psbtBytes = tx.toPSBT();

  verifyRoundTrip(psbtBytes, {
    inputs,
    recipientSats,
    changeSats,
    expectedOutputCount: changeSats > 0 ? 2 : 1,
    sequence,
    lockTime,
  });

  return {
    psbtBase64: base64.encode(psbtBytes),
    psbtHex: hex.encode(psbtBytes),
    unsignedTxId: tx.id,
    inputCount: inputs.length,
    outputCount: changeSats > 0 ? 2 : 1,
    totalInputSats,
    totalOutputSats,
    feeSats,
    rbfEnabled: enableRbf,
    lockTime,
  };
}

/**
 * Reparseia a PSBT recém-montada e confere que ela descreve a transação que se
 * pretendia. Defesa contra erro de codificação, não contra erro de intenção.
 */
function verifyRoundTrip(
  psbtBytes: Uint8Array,
  expected: {
    inputs: readonly PsbtInputSource[];
    recipientSats: number;
    changeSats: number;
    expectedOutputCount: number;
    sequence: number;
    lockTime: number;
  },
): void {
  const parsed = btc.Transaction.fromPSBT(psbtBytes);

  if (parsed.inputsLength !== expected.inputs.length) {
    throw new Error(
      `Erro interno: PSBT montada tem ${parsed.inputsLength} entradas, esperado ${expected.inputs.length}.`,
    );
  }

  if (parsed.outputsLength !== expected.expectedOutputCount) {
    throw new Error(
      `Erro interno: PSBT montada tem ${parsed.outputsLength} saídas, esperado ${expected.expectedOutputCount}.`,
    );
  }

  if (parsed.lockTime !== expected.lockTime) {
    throw new Error(`Erro interno: lockTime saiu ${parsed.lockTime}, esperado ${expected.lockTime}.`);
  }

  for (let i = 0; i < parsed.inputsLength; i++) {
    const got = parsed.getInput(i);
    const want = expected.inputs[i];

    const gotTxid = hex.encode(got.txid ?? new Uint8Array());
    if (gotTxid !== want.utxo.txid) {
      throw new Error(
        `Erro interno: entrada ${i} tem txid ${gotTxid}, esperado ${want.utxo.txid}. ` +
          `Suspeita de inversão de ordem de bytes.`,
      );
    }

    if (got.index !== want.utxo.vout) {
      throw new Error(`Erro interno: entrada ${i} tem vout ${got.index}, esperado ${want.utxo.vout}.`);
    }

    if (got.sequence !== expected.sequence) {
      throw new Error(
        `Erro interno: entrada ${i} tem sequence ${got.sequence}, esperado ${expected.sequence}.`,
      );
    }

    const amount = got.witnessUtxo?.amount;
    if (amount === undefined || amount !== BigInt(want.utxo.valueSats)) {
      throw new Error(
        `Erro interno: entrada ${i} tem witnessUtxo de ${amount} sat, esperado ${want.utxo.valueSats}.`,
      );
    }
  }

  const gotRecipient = parsed.getOutput(0).amount;
  if (gotRecipient !== BigInt(expected.recipientSats)) {
    throw new Error(
      `Erro interno: saída de destino saiu com ${gotRecipient} sat, esperado ${expected.recipientSats}.`,
    );
  }

  if (expected.changeSats > 0) {
    const gotChange = parsed.getOutput(1).amount;
    if (gotChange !== BigInt(expected.changeSats)) {
      throw new Error(
        `Erro interno: saída de troco saiu com ${gotChange} sat, esperado ${expected.changeSats}.`,
      );
    }
  }
}

/**
 * Atalho: vai direto de uma `CoinSelection` para a PSBT.
 *
 * Cada UTXO selecionado precisa do endereço que o possui, porque o Esplora não
 * devolve `scriptPubKey`. `ownerAddressFor` faz esse mapeamento e deve lançar
 * se não souber responder — devolver um endereço errado por padrão produziria
 * uma PSBT que nunca valida, e o silêncio esconderia a causa.
 */
export function buildPsbtFromSelection(params: {
  selection: CoinSelection;
  recipientAddress: string;
  changeAddress: string;
  network: PsbtNetwork;
  ownerAddressFor: (utxo: EsploraUtxo) => string;
  enableRbf?: boolean;
  lockTime?: number;
  maxFeeSats?: number;
}): BuiltPsbt {
  const { selection, ownerAddressFor } = params;

  return buildUnsignedPsbt({
    inputs: selection.selected.map((utxo) => ({ utxo, ownerAddress: ownerAddressFor(utxo) })),
    recipientAddress: params.recipientAddress,
    recipientSats: selection.targetSats,
    changeAddress: params.changeAddress,
    changeSats: selection.changeSats,
    network: params.network,
    enableRbf: params.enableRbf,
    lockTime: params.lockTime,
    maxFeeSats: params.maxFeeSats,
  });
}

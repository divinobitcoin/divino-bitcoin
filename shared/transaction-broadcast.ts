import { base64, hex } from "@scure/base";
import * as btc from "@scure/btc-signer";

import { assertSignetOnly } from "./bitcoin-network";
import type { EsploraConfig } from "./esplora-client";

/**
 * Revisão e transmissão de transação assinada.
 *
 * Duas responsabilidades, deliberadamente juntas neste arquivo porque uma é
 * pré-condição da outra: **revisar** o que a transação realmente faz, e só
 * então **transmitir**.
 *
 * ## Transmitir é o único passo irreversível
 *
 * Tudo antes disto pode ser refeito. Uma PSBT malformada se joga fora; uma
 * assinatura errada se descarta. Uma transação aceita pela rede não volta.
 * O código aqui trata isso como categoria própria, não como mais uma chamada
 * HTTP.
 *
 * ## Por que a revisão parte dos BYTES, não da intenção
 *
 * O `threat-model.md`, ameaça `T2` (Crítico), exige *"confirmação vinculada ao
 * payload, resumo legível, rede destacada"*.
 *
 * "Vinculada ao payload" é a parte que importa e é fácil de errar. Se o resumo
 * mostrado ao usuário for construído a partir da **intenção** — o endereço que
 * ele digitou, o valor que ele escolheu — então qualquer adulteração entre
 * montar e transmitir passa despercebida: a tela continuaria mostrando o que
 * ele pediu enquanto os bytes fazem outra coisa.
 *
 * Por isso `reviewSignedTransaction` recebe **a transação crua** e reporta o
 * que ela de fato faz. Quem chamou compara com a intenção. Divergência é o
 * sinal de ataque, e ela só aparece se os dois lados forem computados de
 * fontes diferentes.
 *
 * ## Limitação declarada: nunca foi transmitida de verdade
 *
 * `broadcastRawTransaction` **nunca enviou uma transação para servidor
 * nenhum**. O tratamento de erro foi testado contra respostas simuladas,
 * construídas a partir das mensagens que o Bitcoin Core devolve. Isso não é o
 * mesmo que ter visto o servidor real recusar.
 *
 * `WF-F10`: até existir uma transmissão real na Signet, a afirmação sustentável
 * é *"o código de transmissão existe e trata os erros conhecidos"*, não *"a
 * carteira transmite"*.
 */

export type BroadcastNetwork = "signet";

/** Taxa mínima de retransmissão da rede, em sat/vB. Abaixo disso o nó descarta. */
export const MIN_RELAY_FEE_RATE_SATS_PER_VBYTE = 1;

/** Acima disto, a revisão emite aviso. Espelha DEFAULT_MAX_FEE_SATS do psbt-builder. */
export const REVIEW_HIGH_FEE_SATS = 25_000;

export type ReviewedOutput = {
  /** Endereço decodificado do script. Vazio quando o script não é endereçável (ex: OP_RETURN). */
  address: string;
  amountSats: number;
  /** Verdadeiro quando o endereço consta na lista de endereços de troco informada. */
  isChange: boolean;
};

export type TransactionReview = {
  txid: string;
  network: BroadcastNetwork;
  outputs: ReviewedOutput[];
  inputCount: number;
  /** Total que sai da carteira, em satoshis. */
  totalInputSats: number;
  /** Soma de todas as saídas. */
  totalOutputSats: number;
  /** Quanto sai da carteira e NÃO volta como troco. É o que o usuário está gastando de verdade. */
  leavingWalletSats: number;
  feeSats: number;
  feeRateSatsPerVByte: number;
  vsize: number;
  /** Sempre verdadeiro. Existe para que nenhuma interface consiga omitir o aviso por esquecimento. */
  irreversible: true;
  /** Condições que merecem atenção humana antes de confirmar. Lista vazia não significa seguro. */
  warnings: string[];
};

function assertNetwork(network: BroadcastNetwork): void {
  assertSignetOnly(network);
}

function addressFromScript(script: Uint8Array | undefined): string {
  if (!script || script.length === 0) return "";
  try {
    return btc.Address(btc.TEST_NETWORK).encode(btc.OutScript.decode(script));
  } catch {
    return "";
  }
}

/**
 * Lê uma transação assinada e descreve o que ela realmente faz.
 *
 * Não consulta a rede e não transmite. `totalInputSats` precisa vir de fora
 * porque a transação crua **não carrega o valor das entradas** — só os
 * outpoints. Sem esse número não existe taxa calculável, e uma interface que
 * mostrasse a transação sem a taxa estaria escondendo justamente o campo que o
 * `T2` manda destacar.
 */
export function reviewSignedTransaction(params: {
  rawTxHex: string;
  network: BroadcastNetwork;
  totalInputSats: number;
  /** Endereços que pertencem à própria carteira e devem contar como troco. */
  changeAddresses?: readonly string[];
}): TransactionReview {
  const { rawTxHex, network, totalInputSats, changeAddresses = [] } = params;

  assertNetwork(network);

  if (!Number.isInteger(totalInputSats) || totalInputSats <= 0) {
    throw new Error(
      `totalInputSats precisa ser um inteiro positivo de satoshis; recebido: ${JSON.stringify(totalInputSats)}.`,
    );
  }

  let tx: btc.Transaction;
  try {
    tx = btc.Transaction.fromRaw(hex.decode(rawTxHex));
  } catch (cause) {
    throw new Error("Não foi possível ler a transação crua. Não transmitir.", { cause });
  }

  const changeSet = new Set(changeAddresses);
  const outputs: ReviewedOutput[] = [];
  let totalOutputSats = 0;
  let leavingWalletSats = 0;

  for (let i = 0; i < tx.outputsLength; i++) {
    const output = tx.getOutput(i);
    const amountSats = Number(output.amount ?? 0n);
    const address = addressFromScript(output.script);
    const isChange = address !== "" && changeSet.has(address);

    totalOutputSats += amountSats;
    if (!isChange) leavingWalletSats += amountSats;

    outputs.push({ address, amountSats, isChange });
  }

  const feeSats = totalInputSats - totalOutputSats;

  if (feeSats < 0) {
    throw new Error(
      `Transação inválida: as saídas somam ${totalOutputSats} sat e as entradas informadas somam ${totalInputSats} sat. Não transmitir.`,
    );
  }

  const vsize = tx.vsize;
  const feeRateSatsPerVByte = feeSats / vsize;

  const warnings: string[] = [];

  if (!tx.isFinal) {
    warnings.push("A transação não está finalizada. A rede vai recusar.");
  }

  if (feeSats === 0) {
    warnings.push("Taxa zero: a rede não vai retransmitir esta transação.");
  } else if (feeRateSatsPerVByte < MIN_RELAY_FEE_RATE_SATS_PER_VBYTE) {
    warnings.push(
      `Taxa de ${feeRateSatsPerVByte.toFixed(2)} sat/vB está abaixo do mínimo de retransmissão (${MIN_RELAY_FEE_RATE_SATS_PER_VBYTE} sat/vB). A transação pode não propagar.`,
    );
  }

  if (feeSats > REVIEW_HIGH_FEE_SATS) {
    warnings.push(
      `Taxa de ${feeSats} sat é alta. Confirme que não é erro de cálculo antes de transmitir.`,
    );
  }

  if (outputs.length === 0) {
    warnings.push("Transação sem saídas. Todo o valor viraria taxa.");
  }

  for (const [index, output] of outputs.entries()) {
    if (output.address === "") {
      warnings.push(
        `Saída ${index} tem script não endereçável e não pode ser conferida visualmente.`,
      );
    }
  }

  if (outputs.length > 0 && outputs.every((output) => output.isChange)) {
    warnings.push("Todas as saídas são de troco: nenhum valor sai para um destinatário externo.");
  }

  return {
    txid: tx.id,
    network,
    outputs,
    inputCount: tx.inputsLength,
    totalInputSats,
    totalOutputSats,
    leavingWalletSats,
    feeSats,
    feeRateSatsPerVByte,
    vsize,
    irreversible: true,
    warnings,
  };
}

/**
 * Soma os valores das entradas declaradas numa PSBT, lendo o campo
 * `witnessUtxo` de cada uma.
 *
 * Existe porque a transação **crua** não carrega o valor das entradas — só os
 * outpoints — e sem esse número não há taxa calculável. A PSBT carrega, e é a
 * fonte certa: lê-lo do payload em vez do estado da interface mantém a revisão
 * vinculada aos bytes, que é o que o `T2` exige. Uma interface que guardasse o
 * total de entrada numa variável própria estaria confiando na sua memória do
 * que montou, e não no que vai ser transmitido.
 *
 * Lança se qualquer entrada não declarar `witnessUtxo`. Recusar é correto:
 * somar só as que declararam produziria uma taxa aparente menor que a real, e o
 * erro apareceria como um número tranquilizador em vez de uma falha.
 */
export function sumPsbtInputAmounts(psbtBase64: string): number {
  let tx: btc.Transaction;
  try {
    tx = btc.Transaction.fromPSBT(base64.decode(psbtBase64));
  } catch (cause) {
    throw new Error("Não foi possível ler a PSBT.", { cause });
  }

  if (tx.inputsLength === 0) {
    throw new Error("PSBT sem entradas.");
  }

  let total = 0;
  for (let i = 0; i < tx.inputsLength; i++) {
    const amount = tx.getInput(i).witnessUtxo?.amount;
    if (amount === undefined) {
      throw new Error(
        `Entrada ${i} da PSBT não declara witnessUtxo, então o valor gasto por ela é desconhecido. ` +
          `Sem isso a taxa não pode ser calculada e a transação não deve ser revisada nem transmitida.`,
      );
    }
    total += Number(amount);
  }

  return total;
}

// ---------------------------------------------------------------------------
// Finalização
// ---------------------------------------------------------------------------
//
// Finalizar NÃO é assinar. A operação só monta a testemunha a partir das
// assinaturas parciais que já existem na PSBT; nenhuma chave privada é lida,
// derivada ou usada.
//
// Por isso mora aqui e não em shared/psbt-signer.ts. A interface do aplicativo
// precisa finalizar uma PSBT assinada em outro lugar, e o guard de fronteira
// proíbe `app/` de importar módulos LAB. Deixar o finalize do lado LAB
// impediria a carteira de completar o fluxo PSBT sem nenhum ganho de segurança.

export type FinalizedTransaction = {
  rawTxHex: string;
  txid: string;
  /** vsize real, medido na transação assinada. Comparável com a estimativa da coin selection. */
  vsize: number;
  weight: number;
  inputCount: number;
  outputCount: number;
};

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
  network: BroadcastNetwork;
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

export type BroadcastResult = {
  /** Txid confirmado pelo servidor. */
  txid: string;
  /** Corpo cru da resposta, para diagnóstico. */
  serverResponse: string;
};

export class BroadcastRejectedError extends Error {
  readonly status: number;
  readonly serverResponse: string;

  constructor(status: number, serverResponse: string) {
    super(`O nó recusou a transação (HTTP ${status}): ${serverResponse}`);
    this.name = "BroadcastRejectedError";
    this.status = status;
    this.serverResponse = serverResponse;
  }
}

type FetchLike = typeof fetch;

/**
 * Transmite uma transação assinada para a rede via `POST /tx` do Esplora.
 *
 * **Este é o passo que não volta.**
 *
 * `expectedTxid` é obrigatório de propósito. Ele obriga quem chama a saber o
 * que está transmitindo, e é conferido **duas vezes, contra fontes diferentes**:
 *
 * 1. **Antes da rede**, contra os próprios bytes de `rawTxHex`. O txid é
 *    recalculado localmente a partir do que seria enviado. Divergindo, a função
 *    lança e **nenhuma chamada de rede acontece**. Esta é a única das duas que
 *    ainda pode impedir o dano: depois do POST a transação já está na rede.
 * 2. **Depois da resposta**, contra o txid devolvido pelo servidor. Detecta um
 *    servidor que aceitou outra coisa, e serve para avisar — o estrago, se
 *    houver, já foi feito.
 *
 * As duas defendem contra coisas diferentes e nenhuma substitui a outra. A
 * primeira pega inconsistência do lado de cá: bytes e txid vindos de estados
 * diferentes de quem chama, revisão feita sobre uma transação e transmissão de
 * outra. A segunda pega divergência do lado de lá.
 *
 * **O que a primeira NÃO faz:** ela compara dois argumentos entre si, não
 * compara a transação com a intenção do usuário. Se `expectedTxid` for derivado
 * do mesmo `rawTxHex` no mesmo instante, a checagem é tautológica. Ligar
 * `expectedTxid` à PSBT efetivamente revisada é problema separado, ainda aberto.
 *
 * Não faz retentativa automática. Retransmitir a mesma transação é inofensivo
 * (mesmo txid), mas repetir cegamente uma chamada cujo resultado é ambíguo é
 * hábito ruim em cima da única operação irreversível do sistema. Quem quiser
 * repetir, repete de propósito.
 */
export async function broadcastRawTransaction(params: {
  config: EsploraConfig;
  rawTxHex: string;
  expectedTxid: string;
  network: BroadcastNetwork;
  fetchImpl?: FetchLike;
}): Promise<BroadcastResult> {
  const { config, rawTxHex, expectedTxid, network, fetchImpl = fetch } = params;

  assertNetwork(network);

  if (!/^[0-9a-fA-F]+$/.test(rawTxHex) || rawTxHex.length % 2 !== 0) {
    throw new Error("rawTxHex precisa ser uma string hexadecimal de comprimento par.");
  }

  if (!/^[0-9a-f]{64}$/i.test(expectedTxid)) {
    throw new Error(
      `expectedTxid precisa ter 64 caracteres hexadecimais; recebido: ${JSON.stringify(expectedTxid)}.`,
    );
  }

  // Precheck local. Nenhuma chamada de rede acontece antes daqui.
  //
  // O txid é recalculado a partir de `rawTxHex` — exatamente a string que vai no
  // corpo do POST abaixo — e não de nenhum estado externo. `hex.decode` aceita
  // maiúsculas e produz os mesmos bytes; verificado, não suposto.
  let localTxid: string;
  try {
    localTxid = btc.Transaction.fromRaw(hex.decode(rawTxHex)).id;
  } catch (cause) {
    throw new Error(
      "rawTxHex passou na verificação de forma mas não é uma transação legível; " +
        "não dá para conferir o txid antes de transmitir. Nada foi enviado.",
      { cause },
    );
  }

  if (localTxid.toLowerCase() !== expectedTxid.toLowerCase()) {
    throw new Error(
      `O txid calculado a partir de rawTxHex é ${localTxid}, diferente do expectedTxid ` +
        `${expectedTxid}. Os bytes que seriam transmitidos não são os da transação revisada. ` +
        `Nada foi enviado.`,
    );
  }

  const base = config.baseUrl.replace(/\/+$/, "");

  const response = await fetchImpl(`${base}/tx`, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: rawTxHex,
  });

  const body = (await response.text()).trim();

  if (!response.ok) {
    // As mensagens do Bitcoin Core são específicas e úteis
    // ("min relay fee not met", "bad-txns-inputs-missingorspent",
    // "txn-mempool-conflict"). Repassar em vez de resumir.
    throw new BroadcastRejectedError(response.status, body);
  }

  if (!/^[0-9a-f]{64}$/i.test(body)) {
    throw new Error(
      `O servidor respondeu 200 mas o corpo não é um txid: ${JSON.stringify(body.slice(0, 200))}. ` +
        `Estado da transmissão é desconhecido — conferir na cadeia antes de tentar de novo.`,
    );
  }

  if (body.toLowerCase() !== expectedTxid.toLowerCase()) {
    throw new Error(
      `O servidor devolveu o txid ${body}, diferente do esperado ${expectedTxid}. ` +
        `A transação transmitida não é a que foi revisada. Conferir na cadeia imediatamente.`,
    );
  }

  return { txid: body.toLowerCase(), serverResponse: body };
}

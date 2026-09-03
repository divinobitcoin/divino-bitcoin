import { ripemd160 } from "@noble/hashes/legacy.js";
import { sha256 } from "@noble/hashes/sha2.js";
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
 * - **Codificação de `bip32Derivation`** (`PSBT-DERIV-001`, 03/09/2026). A
 *   BIP-174 grava a fingerprint da mestra como 4 bytes **na ordem em que ela é
 *   escrita**, e cada índice do caminho em 32 bits **little-endian**. O
 *   `@scure/btc-signer` 2.3.0 modela isso como `{ fingerprint: number, path:
 *   number[] }` com `P.U32BE` para a fingerprint e `P.U32LE` para os índices —
 *   verificado no coder da biblioteca e confirmado montando uma PSBT e
 *   procurando a fingerprint nos bytes crus. Passar `parseInt(fp, 16)` produz
 *   os bytes na ordem certa; inverter aqui produziria uma PSBT que um assinador
 *   externo recusaria, sem dizer por quê.
 *
 * ## `bip32Derivation`: por que é obrigatório para assinador externo
 *
 * Uma carteira que montou a transação sabe de cabeça quais chaves usar — foi
 * ela quem escolheu as moedas. Um **assinador externo** recebe bytes de um
 * aparelho que nunca viu, e sem `bip32Derivation` ele não sabe qual chave
 * derivar para cada entrada. Ele não erra: ele **recusa**.
 *
 * O campo é **opcional neste módulo** e preenchido quando quem chama souber
 * responder. Duas regras protegem contra o preenchimento pela metade, que seria
 * pior que a ausência:
 *
 * 1. **Tudo ou nada nas entradas.** Uma PSBT com derivação em algumas entradas
 *    faz o assinador assinar o que consegue e devolver o resto em silêncio. O
 *    usuário vê "assinada" e transmite algo inválido.
 * 2. **A chave pública é conferida contra o endereço.** `hash160(pubkey)` tem
 *    de bater com o programa de 20 bytes do script P2WPKH. Sem essa conferência
 *    o módulo estaria repassando a afirmação de quem chamou; com ela, uma chave
 *    trocada é recusada na montagem, e não no aparelho do usuário.
 *
 * A conferência **não deriva nada** — ela só verifica uma igualdade de hash.
 * Por isso cabe num *runtime root*, onde derivar é proibido pela ADR-0001.
 *
 * ## Omissões conhecidas, declaradas
 *
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

/**
 * De onde veio a chave que assina uma entrada, ou a quem pertence uma saída de
 * troco.
 *
 * Tudo aqui é **material público**: chave pública, fingerprint e caminho. Nada
 * neste tipo permite gastar, e é por isso que ele pode atravessar a fronteira
 * da ADR-0001 — a interface pode carregá-lo sem violar nada.
 *
 * Quem produz esta informação é quem tem o direito de derivar: as ferramentas
 * de laboratório em `scripts/`, o cofre nativo quando existir, ou o descriptor
 * com origem que o nó do próprio usuário já guarda. **Nunca este módulo.**
 */
export type Bip32DerivationInfo = {
  /**
   * Chave pública **comprimida**, 33 bytes em hex, começando por `02` ou `03`.
   *
   * Comprimida não é preferência: um endereço P2WPKH é o hash de uma chave
   * comprimida. A forma não comprimida produz outro hash, outro endereço, e a
   * conferência contra o script falharia — corretamente.
   */
  publicKeyHex: string;
  /** Fingerprint da chave mestra: exatamente 8 caracteres hex. */
  masterFingerprint: string;
  /**
   * Caminho completo **desde a mestra**, ex.: `m/84'/1'/0'/0/0`.
   *
   * Precisa ser o caminho inteiro, não o relativo à conta. O assinador externo
   * conhece a raiz, não a conta — é a fingerprint que o faz reconhecer a raiz,
   * e o caminho que o leva até a chave. Aceita `'` ou `h` para hardened.
   */
  path: string;
};

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
  /**
   * Origem da chave desta entrada (`PSBT-DERIV-001`). Opcional, mas **tudo ou
   * nada**: se uma entrada tiver, todas precisam ter.
   */
  derivation?: Bip32DerivationInfo;
};

export type BuildPsbtRequest = {
  inputs: readonly PsbtInputSource[];
  recipientAddress: string;
  recipientSats: number;
  /** Endereço de troco. Obrigatório quando `changeSats > 0`. */
  changeAddress?: string;
  /** Troco em satoshis. Zero ou ausente = sem saída de troco. */
  changeSats?: number;
  /**
   * Origem da chave do endereço de **troco**.
   *
   * Não serve para assinar — serve para o assinador **provar ao usuário** que o
   * troco volta para a própria carteira. Sem isso, um assinador honesto só pode
   * dizer "sai X para o destino e Y para um endereço que eu não reconheço", e é
   * exatamente aí que mora o golpe clássico: trocar o endereço de troco por um
   * do atacante. Com o campo, o dispositivo deriva o caminho e **confere**.
   */
  changeDerivation?: Bip32DerivationInfo;
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
  /**
   * `true` quando todas as entradas levam `bip32Derivation`.
   *
   * Existe para que quem exibe a PSBT possa dizer ao usuário se ela serve a um
   * assinador externo, em vez de ele descobrir isso no aparelho.
   */
  hasInputDerivations: boolean;
  /** `true` quando a saída de troco leva `bip32Derivation`. */
  hasChangeDerivation: boolean;
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

/** Índice a partir do qual um elemento de caminho BIP-32 é *hardened*. */
const HARDENED_OFFSET = 0x80000000;

/**
 * Converte `m/84'/1'/0'/0/0` na lista de inteiros que a BIP-174 grava.
 *
 * Recusa em vez de adivinhar. Um caminho mal interpretado não produz erro
 * visível: produz uma PSBT que aponta para **outra chave**, e o assinador
 * externo devolve uma assinatura que não valida — ou recusa sem explicar.
 */
function parseDerivationPath(path: string, label: string): number[] {
  const limpo = path.trim();
  if (!/^m(\/\d+['h]?)*$/i.test(limpo)) {
    throw new Error(
      `Caminho de derivação ${label} inválido: ${JSON.stringify(path)}. ` +
        `Esperado algo como "m/84'/1'/0'/0/0" (aceita ' ou h para hardened).`,
    );
  }
  if (limpo === "m") {
    throw new Error(`Caminho de derivação ${label} não pode ser só "m": a chave da mestra não assina entradas.`);
  }

  return limpo
    .slice(2)
    .split("/")
    .map((segmento) => {
      const hardened = /['h]$/i.test(segmento);
      const indice = Number(segmento.replace(/['h]$/i, ""));
      if (!Number.isInteger(indice) || indice < 0 || indice >= HARDENED_OFFSET) {
        throw new Error(
          `Elemento ${JSON.stringify(segmento)} do caminho ${label} está fora da faixa BIP-32 (0 a ${HARDENED_OFFSET - 1}).`,
        );
      }
      return hardened ? indice + HARDENED_OFFSET : indice;
    });
}

/**
 * Monta o par `[chave pública, {fingerprint, caminho}]` que a PSBT carrega, e
 * **confere que a chave pública é mesmo a dona do endereço**.
 *
 * A conferência é a razão de esta função existir. Ela compara
 * `hash160(chave pública)` com os 20 bytes de programa do script P2WPKH. É
 * igualdade de hash, não derivação — nada aqui viola a ADR-0001.
 *
 * Sem ela, este módulo estaria repassando adiante a palavra de quem chamou. Com
 * ela, uma chave trocada — por engano ou por ataque — é recusada na montagem, na
 * máquina de quem monta, e não descoberta no aparelho do usuário na hora de
 * assinar.
 */
function toBip32Derivation(
  derivation: Bip32DerivationInfo,
  script: Uint8Array,
  label: string,
): [Uint8Array, { fingerprint: number; path: number[] }] {
  if (!/^[0-9a-fA-F]{8}$/.test(derivation.masterFingerprint)) {
    throw new Error(
      `Fingerprint da mestra ${label} deve ter exatamente 8 caracteres hex; recebido: ${JSON.stringify(derivation.masterFingerprint)}.`,
    );
  }

  if (!/^(02|03)[0-9a-fA-F]{64}$/.test(derivation.publicKeyHex)) {
    throw new Error(
      `Chave pública ${label} deve ser comprimida: 33 bytes em hex, começando por 02 ou 03. ` +
        `Recebido ${derivation.publicKeyHex.length} caracteres começando por ` +
        `${JSON.stringify(derivation.publicKeyHex.slice(0, 2))}.`,
    );
  }

  const publicKey = hex.decode(derivation.publicKeyHex.toLowerCase());

  // P2WPKH: OP_0 <20 bytes>. Qualquer outra forma não é o que este módulo monta.
  if (script.length !== 22 || script[0] !== 0x00 || script[1] !== 0x14) {
    throw new Error(
      `bip32Derivation ${label} só é suportado em P2WPKH (script de 22 bytes começando com 0014); ` +
        `o script tem ${script.length} bytes.`,
    );
  }

  const programa = hex.encode(script.slice(2));
  const hashDaChave = hex.encode(ripemd160(sha256(publicKey)));
  if (programa !== hashDaChave) {
    throw new Error(
      `A chave pública ${label} não corresponde ao endereço.\n` +
        `  hash160(chave pública): ${hashDaChave}\n` +
        `  programa do script:     ${programa}\n` +
        `  Uma PSBT com esta divergência mandaria o assinador usar a chave errada. Recusando montar.`,
    );
  }

  return [
    publicKey,
    {
      // Verificado no coder do @scure/btc-signer 2.3.0: `fingerprint` é
      // `P.U32BE`, então o inteiro decimal produz os 4 bytes na mesma ordem em
      // que a fingerprint é escrita. Confirmado procurando a fingerprint nos
      // bytes crus de uma PSBT montada.
      fingerprint: parseInt(derivation.masterFingerprint, 16),
      path: parseDerivationPath(derivation.path, label),
    },
  ];
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
    changeDerivation,
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

  // Tudo ou nada. Uma PSBT com derivação em parte das entradas é pior que uma
  // sem nenhuma: o assinador externo assina o que reconhece, devolve o resto sem
  // assinar, e quem vê "assinada" transmite uma transação inválida. Ver
  // PSBT-DERIV-001 e o cabeçalho deste arquivo.
  const comDerivacao = inputs.filter((input) => input.derivation !== undefined).length;
  if (comDerivacao !== 0 && comDerivacao !== inputs.length) {
    throw new Error(
      `bip32Derivation preenchido em ${comDerivacao} de ${inputs.length} entradas. ` +
        `É tudo ou nada: uma PSBT parcialmente derivada faz o assinador externo assinar só o que ` +
        `reconhece e ficar calado sobre o resto.`,
    );
  }
  const hasInputDerivations = comDerivacao === inputs.length;

  if (changeDerivation && changeSats === 0) {
    throw new Error("changeDerivation informado sem saída de troco. Provável engano de quem chamou.");
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

  for (const [i, input] of inputs.entries()) {
    const script = scriptForAddress(input.ownerAddress, network, "de origem");
    tx.addInput({
      // Ordem de exibição, igual à que o Esplora devolve. Verificado
      // empiricamente contra os bytes crus — ver cabeçalho deste arquivo.
      txid: input.utxo.txid,
      index: input.utxo.vout,
      witnessUtxo: {
        script,
        amount: BigInt(input.utxo.valueSats),
      },
      sequence,
      ...(input.derivation
        ? { bip32Derivation: [toBip32Derivation(input.derivation, script, `da entrada ${i}`)] }
        : {}),
    });
  }

  // Valida o endereço de destino antes de usá-lo, para que a mensagem de erro
  // diga qual endereço está errado em vez de vir de dentro da biblioteca.
  scriptForAddress(recipientAddress, network, "de destino");
  tx.addOutputAddress(recipientAddress, BigInt(recipientSats), networkFor(network));

  let hasChangeDerivation = false;
  if (changeSats > 0 && changeAddress) {
    const scriptTroco = scriptForAddress(changeAddress, network, "de troco");
    tx.addOutputAddress(changeAddress, BigInt(changeSats), networkFor(network));
    if (changeDerivation) {
      // `updateOutput` porque `addOutputAddress` não aceita campos de PSBT.
      // O índice é 1 porque o destino é sempre a saída 0 neste módulo — o mesmo
      // fato que está declarado como omissão de privacidade no cabeçalho.
      tx.updateOutput(1, {
        bip32Derivation: [toBip32Derivation(changeDerivation, scriptTroco, "do troco")],
      });
      hasChangeDerivation = true;
    }
  }

  const psbtBytes = tx.toPSBT();

  verifyRoundTrip(psbtBytes, {
    inputs,
    recipientSats,
    changeSats,
    expectedOutputCount: changeSats > 0 ? 2 : 1,
    sequence,
    lockTime,
    hasInputDerivations,
    hasChangeDerivation,
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
    hasInputDerivations,
    hasChangeDerivation,
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
    hasInputDerivations: boolean;
    hasChangeDerivation: boolean;
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

    // A derivação atravessa a serialização, não só a montagem em memória. É a
    // classe de bug que teste de aritmética não pega: o objeto está certo e os
    // bytes saem errados. Foi assim que TPUB-SERIAL-001 apareceu.
    const derivacao = got.bip32Derivation;
    if (expected.hasInputDerivations) {
      const esperada = want.derivation;
      if (!derivacao || derivacao.length !== 1 || !esperada) {
        throw new Error(
          `Erro interno: entrada ${i} deveria ter exatamente uma bip32Derivation depois do round-trip.`,
        );
      }
      const [chave, origem] = derivacao[0]!;
      if (hex.encode(chave) !== esperada.publicKeyHex.toLowerCase()) {
        throw new Error(
          `Erro interno: entrada ${i} voltou com a chave pública ${hex.encode(chave)}, ` +
            `esperado ${esperada.publicKeyHex.toLowerCase()}.`,
        );
      }
      const fpVolta = (origem.fingerprint >>> 0).toString(16).padStart(8, "0");
      if (fpVolta !== esperada.masterFingerprint.toLowerCase()) {
        throw new Error(
          `Erro interno: entrada ${i} voltou com fingerprint ${fpVolta}, ` +
            `esperado ${esperada.masterFingerprint.toLowerCase()}. Suspeita de ordem de bytes.`,
        );
      }
      const caminhoEsperado = parseDerivationPath(esperada.path, `da entrada ${i}`);
      if (origem.path.join("/") !== caminhoEsperado.join("/")) {
        throw new Error(
          `Erro interno: entrada ${i} voltou com o caminho [${origem.path.join(", ")}], ` +
            `esperado [${caminhoEsperado.join(", ")}].`,
        );
      }
    } else if (derivacao && derivacao.length > 0) {
      throw new Error(`Erro interno: entrada ${i} tem bip32Derivation que ninguém pediu.`);
    }
  }

  const gotRecipient = parsed.getOutput(0).amount;
  if (gotRecipient !== BigInt(expected.recipientSats)) {
    throw new Error(
      `Erro interno: saída de destino saiu com ${gotRecipient} sat, esperado ${expected.recipientSats}.`,
    );
  }

  if (expected.changeSats > 0) {
    const saidaTroco = parsed.getOutput(1);
    if (saidaTroco.amount !== BigInt(expected.changeSats)) {
      throw new Error(
        `Erro interno: saída de troco saiu com ${saidaTroco.amount} sat, esperado ${expected.changeSats}.`,
      );
    }
    const temDerivacao = (saidaTroco.bip32Derivation?.length ?? 0) > 0;
    if (temDerivacao !== expected.hasChangeDerivation) {
      throw new Error(
        `Erro interno: saída de troco ${temDerivacao ? "tem" : "não tem"} bip32Derivation, ` +
          `esperado ${expected.hasChangeDerivation ? "ter" : "não ter"}.`,
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
  /**
   * Origem da chave de cada UTXO (`PSBT-DERIV-001`). Opcional.
   *
   * Devolver `undefined` para **algum** UTXO quando outros têm derivação faz
   * `buildUnsignedPsbt` recusar, pela regra do tudo-ou-nada. É o comportamento
   * desejado: melhor falhar na montagem do que produzir PSBT meio assinável.
   */
  derivationFor?: (utxo: EsploraUtxo) => Bip32DerivationInfo | undefined;
  /** Origem da chave do endereço de troco. */
  changeDerivation?: Bip32DerivationInfo;
  enableRbf?: boolean;
  lockTime?: number;
  maxFeeSats?: number;
}): BuiltPsbt {
  const { selection, ownerAddressFor, derivationFor } = params;

  return buildUnsignedPsbt({
    inputs: selection.selected.map((utxo) => ({
      utxo,
      ownerAddress: ownerAddressFor(utxo),
      derivation: derivationFor?.(utxo),
    })),
    recipientAddress: params.recipientAddress,
    recipientSats: selection.targetSats,
    changeAddress: params.changeAddress,
    changeSats: selection.changeSats,
    changeDerivation: selection.changeSats > 0 ? params.changeDerivation : undefined,
    network: params.network,
    enableRbf: params.enableRbf,
    lockTime: params.lockTime,
    maxFeeSats: params.maxFeeSats,
  });
}

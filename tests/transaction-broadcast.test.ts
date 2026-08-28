import { hex } from "@scure/base";
import { HDKey } from "@scure/bip32";
import * as btc from "@scure/btc-signer";
import { describe, expect, it, vi } from "vitest";

import type { EsploraConfig, EsploraUtxo } from "../shared/esplora-client";
import { buildUnsignedPsbt } from "../shared/psbt-builder";
import { signAndFinalizeWithTestSeed, signPsbtWithTestSeed } from "../shared/psbt-signer";
import {
  BroadcastRejectedError,
  MIN_RELAY_FEE_RATE_SATS_PER_VBYTE,
  REVIEW_HIGH_FEE_SATS,
  broadcastRawTransaction,
  finalizeSignedPsbt,
  reviewSignedTransaction,
  sumPsbtInputAmounts,
} from "../shared/transaction-broadcast";
import type { TransactionReview } from "../shared/transaction-broadcast";

const SEED_HEX = "000102030405060708090a0b0c0d0e0f";
const PATH_0 = "m/84'/1'/0'/0/0";
const PATH_1 = "m/84'/1'/0'/0/1";
const PATH_CHANGE = "m/84'/1'/0'/1/0";
const TXID_A = "aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899";

const CONFIG: EsploraConfig = { baseUrl: "https://mempool.space/signet/api" };

function addressAt(path: string): string {
  const root = HDKey.fromMasterSeed(hex.decode(SEED_HEX));
  const child = root.derive(path);
  const address = btc.p2wpkh(child.publicKey!, btc.TEST_NETWORK).address!;
  child.wipePrivateData();
  root.wipePrivateData();
  return address;
}

const ADDR_0 = addressAt(PATH_0);
const ADDR_1 = addressAt(PATH_1);
const ADDR_CHANGE = addressAt(PATH_CHANGE);

function utxo(valueSats: number, overrides: Partial<EsploraUtxo> = {}): EsploraUtxo {
  return { txid: TXID_A, vout: 0, valueSats, confirmed: true, blockHeight: 250_000, ...overrides };
}

/** Produz uma transação assinada de verdade para revisar. */
function signedTx(opts: { inputSats?: number; recipientSats?: number; changeSats?: number } = {}) {
  const inputSats = opts.inputSats ?? 100_000;
  const recipientSats = opts.recipientSats ?? 60_000;
  const changeSats = opts.changeSats ?? 39_000;

  const built = buildUnsignedPsbt({
    inputs: [{ utxo: utxo(inputSats), ownerAddress: ADDR_0 }],
    recipientAddress: ADDR_1,
    recipientSats,
    changeAddress: changeSats > 0 ? ADDR_CHANGE : undefined,
    changeSats,
    network: "signet",
    maxFeeSats: 10_000_000,
  });

  const final = signAndFinalizeWithTestSeed({
    psbtBase64: built.psbtBase64,
    seedHex: SEED_HEX,
    inputPaths: [PATH_0],
    network: "signet",
  });

  return { ...final, inputSats };
}

function mockFetch(responses: Array<{ ok?: boolean; status?: number; text: string }>) {
  let call = 0;
  const fn = vi.fn(async () => {
    const response = responses[call] ?? responses[responses.length - 1];
    call += 1;
    return {
      ok: response.ok ?? true,
      status: response.status ?? 200,
      text: async () => response.text,
    };
  });
  return fn as unknown as typeof fetch;
}


/** Revisão de verdade, produzida pelo módulo. É o que broadcast aceita. */
function revisaoDe(tx: ReturnType<typeof signedTx>, changeAddresses: string[] = [ADDR_CHANGE]) {
  return reviewSignedTransaction({
    rawTxHex: tx.rawTxHex,
    network: "signet",
    totalInputSats: tx.inputSats,
    changeAddresses,
  });
}

/**
 * Revisão forjada: objeto que o compilador só aceita com asserção. Existe para
 * provar que o precheck de bytes ainda barra o que a marca de tipo não barra.
 */
function revisaoForjada(campos: { rawTxHex: string; txid: string; network?: string }) {
  return {
    network: "signet",
    ...campos,
    outputs: [],
    inputCount: 1,
    totalInputSats: 100_000,
    totalOutputSats: 99_000,
    leavingWalletSats: 99_000,
    feeSats: 1_000,
    feeRateSatsPerVByte: 7,
    vsize: 141,
    irreversible: true as const,
    warnings: [],
  } as unknown as TransactionReview;
}

describe("reviewSignedTransaction — o resumo sai dos bytes, não da intenção", () => {
  it("descreve destinatário, troco, taxa e tamanho a partir da transação crua", () => {
    const tx = signedTx();
    const review = reviewSignedTransaction({
      rawTxHex: tx.rawTxHex,
      network: "signet",
      totalInputSats: tx.inputSats,
      changeAddresses: [ADDR_CHANGE],
    });

    expect(review.txid).toBe(tx.txid);
    expect(review.inputCount).toBe(1);
    expect(review.outputs).toHaveLength(2);
    expect(review.outputs[0]).toEqual({ address: ADDR_1, amountSats: 60_000, isChange: false });
    expect(review.outputs[1]).toEqual({ address: ADDR_CHANGE, amountSats: 39_000, isChange: true });
    expect(review.feeSats).toBe(1_000);
    expect(review.irreversible).toBe(true);
  });

  it("separa o que sai da carteira do que volta como troco", () => {
    const tx = signedTx();
    const review = reviewSignedTransaction({
      rawTxHex: tx.rawTxHex,
      network: "signet",
      totalInputSats: tx.inputSats,
      changeAddresses: [ADDR_CHANGE],
    });

    // 60.000 vão embora, 39.000 voltam, 1.000 viram taxa.
    expect(review.leavingWalletSats).toBe(60_000);
    expect(review.totalOutputSats).toBe(99_000);
    expect(review.leavingWalletSats + review.feeSats).toBe(tx.inputSats - 39_000);
  });

  it("sem a lista de endereços de troco, trata TUDO como saindo da carteira", () => {
    // Comportamento conservador: na dúvida, mostrar o valor maior. Errar para
    // o lado de assustar o usuário é melhor que errar para o de tranquilizar.
    const tx = signedTx();
    const review = reviewSignedTransaction({
      rawTxHex: tx.rawTxHex,
      network: "signet",
      totalInputSats: tx.inputSats,
    });

    expect(review.outputs.every((output) => !output.isChange)).toBe(true);
    expect(review.leavingWalletSats).toBe(99_000);
  });

  it("a revisão carrega os bytes que a produziram", () => {
    // É isto que torna impossível revisar uma transação e transmitir outra:
    // os bytes deixam de ser um argumento solto e passam a ser parte da revisão.
    const tx = signedTx();
    const review = revisaoDe(tx);
    expect(review.rawTxHex).toBe(tx.rawTxHex);
    expect(btc.Transaction.fromRaw(hex.decode(review.rawTxHex)).id).toBe(review.txid);
  });

  it("o txid da revisão bate com o da transação assinada", () => {
    const tx = signedTx();
    const review = reviewSignedTransaction({
      rawTxHex: tx.rawTxHex,
      network: "signet",
      totalInputSats: tx.inputSats,
    });
    expect(review.txid).toBe(tx.txid);
    expect(review.vsize).toBe(tx.vsize);
  });
});

describe("reviewSignedTransaction — avisos", () => {
  it("não emite aviso para uma transação comum e bem formada", () => {
    const tx = signedTx();
    const review = reviewSignedTransaction({
      rawTxHex: tx.rawTxHex,
      network: "signet",
      totalInputSats: tx.inputSats,
      changeAddresses: [ADDR_CHANGE],
    });
    expect(review.warnings).toEqual([]);
  });

  it("avisa quando a taxa fica abaixo do mínimo de retransmissão", () => {
    // 99.950 de saída sobre 100.000 de entrada = 50 sat de taxa em ~140 vB.
    const tx = signedTx({ recipientSats: 60_000, changeSats: 39_950 });
    const review = reviewSignedTransaction({
      rawTxHex: tx.rawTxHex,
      network: "signet",
      totalInputSats: tx.inputSats,
      changeAddresses: [ADDR_CHANGE],
    });

    expect(review.feeRateSatsPerVByte).toBeLessThan(MIN_RELAY_FEE_RATE_SATS_PER_VBYTE);
    expect(review.warnings.join(" ")).toMatch(/abaixo do mínimo de retransmissão/);
  });

  it("avisa quando a taxa é alta demais para ser intencional", () => {
    const tx = signedTx({ inputSats: 200_000, recipientSats: 60_000, changeSats: 39_000 });
    const review = reviewSignedTransaction({
      rawTxHex: tx.rawTxHex,
      network: "signet",
      totalInputSats: tx.inputSats,
      changeAddresses: [ADDR_CHANGE],
    });

    expect(review.feeSats).toBeGreaterThan(REVIEW_HIGH_FEE_SATS);
    expect(review.warnings.join(" ")).toMatch(/é alta/);
  });

  it("avisa quando nenhum valor sai para destinatário externo", () => {
    const tx = signedTx();
    const review = reviewSignedTransaction({
      rawTxHex: tx.rawTxHex,
      network: "signet",
      totalInputSats: tx.inputSats,
      // Declara as DUAS saídas como próprias: nada sai da carteira.
      changeAddresses: [ADDR_CHANGE, ADDR_1],
    });
    expect(review.warnings.join(" ")).toMatch(/Todas as saídas são de troco/);
  });

  it("lança quando as saídas somam mais que as entradas informadas", () => {
    const tx = signedTx();
    expect(() =>
      reviewSignedTransaction({
        rawTxHex: tx.rawTxHex,
        network: "signet",
        totalInputSats: 50_000, // menor que as saídas
      }),
    ).toThrow(/Não transmitir/);
  });

  it("lança para transação crua ilegível", () => {
    expect(() =>
      reviewSignedTransaction({ rawTxHex: "deadbeef", network: "signet", totalInputSats: 100_000 }),
    ).toThrow(/Não foi possível ler a transação crua/);
  });

  it("recusa totalInputSats inválido", () => {
    const tx = signedTx();
    expect(() =>
      reviewSignedTransaction({ rawTxHex: tx.rawTxHex, network: "signet", totalInputSats: 0 }),
    ).toThrow(/totalInputSats/);
  });

  it("recusa rede diferente de signet em execução", () => {
    const tx = signedTx();
    expect(() =>
      reviewSignedTransaction({
        rawTxHex: tx.rawTxHex,
        network: "mainnet" as unknown as "signet",
        totalInputSats: tx.inputSats,
      }),
    ).toThrow();
  });
});

describe("broadcastRawTransaction", () => {
  it("faz POST em /tx com o hex cru no corpo", async () => {
    const tx = signedTx();
    const fetchImpl = mockFetch([{ text: tx.txid }]);

    await broadcastRawTransaction({
      config: CONFIG,
      review: revisaoDe(tx),
      fetchImpl,
    });

    const [url, init] = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("https://mempool.space/signet/api/tx");
    expect(init.method).toBe("POST");
    expect(init.body).toBe(tx.rawTxHex);
  });

  it("não duplica a barra quando a baseUrl termina em /", async () => {
    const tx = signedTx();
    const fetchImpl = mockFetch([{ text: tx.txid }]);

    await broadcastRawTransaction({
      config: { baseUrl: "https://mempool.space/signet/api/" },
      review: revisaoDe(tx),
      fetchImpl,
    });

    expect((fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(
      "https://mempool.space/signet/api/tx",
    );
  });

  it("devolve o txid confirmado pelo servidor", async () => {
    const tx = signedTx();
    const result = await broadcastRawTransaction({
      config: CONFIG,
      review: revisaoDe(tx),
      fetchImpl: mockFetch([{ text: tx.txid }]),
    });
    expect(result.txid).toBe(tx.txid);
  });

  it("faz UMA chamada só — nenhuma retentativa automática", async () => {
    const tx = signedTx();
    const fetchImpl = mockFetch([{ text: tx.txid }]);
    await broadcastRawTransaction({
      config: CONFIG,
      review: revisaoDe(tx),
      fetchImpl,
    });
    expect((fetchImpl as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
  });
});

describe("broadcastRawTransaction — recusas do nó", () => {
  it.each([
    ["taxa abaixo do mínimo", "min relay fee not met, 100 < 141"],
    ["entrada já gasta", "bad-txns-inputs-missingorspent"],
    ["conflito na mempool", "txn-mempool-conflict"],
    ["transação não padrão", "non-mandatory-script-verify-flag"],
  ])("repassa a mensagem do nó sem resumir (%s)", async (_label, mensagem) => {
    const tx = signedTx();
    const promessa = broadcastRawTransaction({
      config: CONFIG,
      review: revisaoDe(tx),
      fetchImpl: mockFetch([{ ok: false, status: 400, text: mensagem }]),
    });

    await expect(promessa).rejects.toThrow(BroadcastRejectedError);
    await expect(promessa).rejects.toThrow(new RegExp(mensagem.split(",")[0]));
  });

  it("preserva status e corpo no erro, para diagnóstico", async () => {
    const tx = signedTx();
    try {
      await broadcastRawTransaction({
        config: CONFIG,
        review: revisaoDe(tx),
        fetchImpl: mockFetch([{ ok: false, status: 400, text: "txn-already-in-mempool" }]),
      });
      throw new Error("deveria ter lançado");
    } catch (error) {
      expect(error).toBeInstanceOf(BroadcastRejectedError);
      expect((error as BroadcastRejectedError).status).toBe(400);
      expect((error as BroadcastRejectedError).serverResponse).toBe("txn-already-in-mempool");
    }
  });
});

describe("broadcastRawTransaction — respostas suspeitas", () => {
  it("lança quando o servidor devolve txid diferente do esperado", async () => {
    const tx = signedTx();
    const outro = "f".repeat(64);

    await expect(
      broadcastRawTransaction({
        config: CONFIG,
        review: revisaoDe(tx),
        fetchImpl: mockFetch([{ text: outro }]),
      }),
    ).rejects.toThrow(/não é a que foi revisada/);
  });

  it("lança quando o corpo de um 200 não é um txid", async () => {
    const tx = signedTx();
    await expect(
      broadcastRawTransaction({
        config: CONFIG,
        review: revisaoDe(tx),
        fetchImpl: mockFetch([{ text: "<html>gateway timeout</html>" }]),
      }),
    ).rejects.toThrow(/Estado da transmissão é desconhecido/);
  });

  it("aceita txid em maiúsculas e normaliza para minúsculas", async () => {
    const tx = signedTx();
    const result = await broadcastRawTransaction({
      config: CONFIG,
      review: revisaoDe(tx),
      fetchImpl: mockFetch([{ text: tx.txid.toUpperCase() }]),
    });
    expect(result.txid).toBe(tx.txid.toLowerCase());
  });

  it("tolera espaço em branco em volta do txid na resposta", async () => {
    const tx = signedTx();
    const result = await broadcastRawTransaction({
      config: CONFIG,
      review: revisaoDe(tx),
      fetchImpl: mockFetch([{ text: `\n  ${tx.txid}  \n` }]),
    });
    expect(result.txid).toBe(tx.txid);
  });
});

describe("broadcastRawTransaction — entrada inválida não chega na rede", () => {
  it.each([
    ["hex ímpar", "abc"],
    ["não hexadecimal", "zzzz"],
  ])("recusa rawTxHex inválido antes de qualquer chamada (%s)", async (_label, raw) => {
    const fetchImpl = mockFetch([{ text: "nunca" }]);
    await expect(
      broadcastRawTransaction({
        config: CONFIG,
        review: revisaoForjada({ rawTxHex: raw, txid: "a".repeat(64) }),
        fetchImpl,
      }),
    ).rejects.toThrow(/rawTxHex/);
    expect((fetchImpl as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(0);
  });

  it("recusa revisão com txid malformado antes de qualquer chamada", async () => {
    const tx = signedTx();
    const fetchImpl = mockFetch([{ text: "nunca" }]);
    await expect(
      broadcastRawTransaction({
        config: CONFIG,
        review: revisaoForjada({ rawTxHex: tx.rawTxHex, txid: "curto" }),
        fetchImpl,
      }),
    ).rejects.toThrow(/expectedTxid/);
    expect((fetchImpl as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(0);
  });

  it("recusa revisão forjada cujo txid não corresponde aos bytes", async () => {
    const tx = signedTx();
    const outro = signedTx({ recipientSats: 61_000, changeSats: 38_000 });
    expect(outro.txid).not.toBe(tx.txid);

    const fetchImpl = mockFetch([{ text: "nunca" }]);
    await expect(
      broadcastRawTransaction({
        config: CONFIG,
        // Revisão forjada: bytes de uma transação, txid de outra.
        review: revisaoForjada({ rawTxHex: tx.rawTxHex, txid: outro.txid }),
        fetchImpl,
      }),
    ).rejects.toThrow(/Nada foi enviado/);
    expect((fetchImpl as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(0);
  });

  it("recusa rawTxHex hexadecimal porém ilegível, antes de qualquer chamada", async () => {
    const fetchImpl = mockFetch([{ text: "nunca" }]);
    await expect(
      broadcastRawTransaction({
        config: CONFIG,
        review: revisaoForjada({ rawTxHex: "deadbeef", txid: "a".repeat(64) }),
        fetchImpl,
      }),
    ).rejects.toThrow(/Nada foi enviado/);
    expect((fetchImpl as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(0);
  });

  it("compara o txid local sem distinguir maiúsculas de minúsculas", async () => {
    const tx = signedTx();
    const fetchImpl = mockFetch([{ text: tx.txid }]);

    const result = await broadcastRawTransaction({
      config: CONFIG,
      review: revisaoForjada({ rawTxHex: tx.rawTxHex, txid: tx.txid.toUpperCase() }),
      fetchImpl,
    });

    expect(result.txid).toBe(tx.txid.toLowerCase());
    expect((fetchImpl as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
  });

  it("o txid local sai dos mesmos bytes que vão no corpo do POST", async () => {
    const tx = signedTx();
    const fetchImpl = mockFetch([{ text: tx.txid }]);

    await broadcastRawTransaction({
      config: CONFIG,
      review: revisaoDe(tx),
      fetchImpl,
    });

    const [, init] = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(btc.Transaction.fromRaw(hex.decode(init.body)).id).toBe(tx.txid);
  });

  it("recusa rede diferente de signet antes de qualquer chamada", async () => {
    const tx = signedTx();
    const fetchImpl = mockFetch([{ text: "nunca" }]);
    await expect(
      broadcastRawTransaction({
        config: CONFIG,
        review: revisaoForjada({ rawTxHex: tx.rawTxHex, txid: tx.txid, network: "mainnet" }),
        fetchImpl,
      }),
    ).rejects.toThrow();
    expect((fetchImpl as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(0);
  });
});

describe("finalizeSignedPsbt — mensagem quando a PSBT não está assinada", () => {
  it("explica em português, em vez de repassar o texto cru da biblioteca", () => {
    // A biblioteca lança "Not enough partial sign" — inglês, e no ponto exato
    // em que a pessoa está tentando entender o passo da assinatura.
    const built = buildUnsignedPsbt({
      inputs: [{ utxo: utxo(100_000), ownerAddress: ADDR_0 }],
      recipientAddress: ADDR_1,
      recipientSats: 60_000,
      changeAddress: ADDR_CHANGE,
      changeSats: 39_000,
      network: "signet",
      maxFeeSats: 10_000_000,
    });

    expect(() =>
      finalizeSignedPsbt({ signedPsbtBase64: built.psbtBase64, network: "signet" }),
    ).toThrow(/não estar assinada/);
  });
});

describe("precheck de txid — ancorado numa transação real aceita pela Signet", () => {
  // Bytes e txid da transação de BROADCAST-REAL-001, aceita por nó da Signet em
  // 27/08/2026. Os bytes vieram do nó (Esplora), não deste código. Serve de
  // âncora independente: prova que o txid calculado localmente é o mesmo que a
  // rede atribuiu, em ordem de exibição, para uma transação segwit real. Se
  // alguém inverter a ordem de bytes por engano, este teste reprova.
  // prettier-ignore
  const RAW_REAL = "020000000001011518503dfe8e58bebb508ac3c95ce9bd399adc38b17e8c733ae059271d731d4b0100000000fdffffff028813000000000000160014306b0e91bfc57cebb994b28f831c5f25cadc20876f12000000000000160014b66d68a069e00cd3eeb88b3aa8cbc565af43032602483045022100e705ee3fc2e9b76ece347c3ce9e4ddd530dda610c61a893a1c78785154b29c6702203787d2e7a6551d7f5eada400fcf26b7e38b3de07efc762365ba4ff3dce35a1300121022be393012e9d3c3e7cbf0865f218f451504274fd187fe18a6cef8192385f1bdf00000000";
  const TXID_REAL = "87174464d90500db2e87227dee5d123f5f5c4b14642dd8499d398819d0e7238c";

  it("aceita o par real e transmite", async () => {
    const fetchImpl = mockFetch([{ text: TXID_REAL }]);
    const result = await broadcastRawTransaction({
      config: CONFIG,
      review: revisaoForjada({ rawTxHex: RAW_REAL, txid: TXID_REAL }),
      fetchImpl,
    });
    expect(result.txid).toBe(TXID_REAL);
    expect((fetchImpl as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
  });

  it("recusa antes da rede se o txid vier invertido em ordem de bytes", async () => {
    const invertido = (TXID_REAL.match(/../g) ?? []).reverse().join("");
    const fetchImpl = mockFetch([{ text: "nunca" }]);
    await expect(
      broadcastRawTransaction({
        config: CONFIG,
        review: revisaoForjada({ rawTxHex: RAW_REAL, txid: invertido }),
        fetchImpl,
      }),
    ).rejects.toThrow(/Nada foi enviado/);
    expect((fetchImpl as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(0);
  });
});

describe("sumPsbtInputAmounts — o total de entrada sai da PSBT, não da interface", () => {
  it("soma o witnessUtxo de uma entrada", () => {
    const built = buildUnsignedPsbt({
      inputs: [{ utxo: utxo(100_000), ownerAddress: ADDR_0 }],
      recipientAddress: ADDR_1,
      recipientSats: 60_000,
      changeAddress: ADDR_CHANGE,
      changeSats: 39_000,
      network: "signet",
    });
    expect(sumPsbtInputAmounts(built.psbtBase64)).toBe(100_000);
  });

  it("soma várias entradas", () => {
    const built = buildUnsignedPsbt({
      inputs: [
        { utxo: utxo(60_000, { txid: TXID_A }), ownerAddress: ADDR_0 },
        { utxo: utxo(40_000, { txid: "c".repeat(64) }), ownerAddress: ADDR_1 },
      ],
      recipientAddress: ADDR_1,
      recipientSats: 60_000,
      changeAddress: ADDR_CHANGE,
      changeSats: 39_000,
      network: "signet",
    });
    expect(sumPsbtInputAmounts(built.psbtBase64)).toBe(100_000);
  });

  it("continua legível depois da PSBT ser assinada", () => {
    const built = buildUnsignedPsbt({
      inputs: [{ utxo: utxo(100_000), ownerAddress: ADDR_0 }],
      recipientAddress: ADDR_1,
      recipientSats: 60_000,
      changeAddress: ADDR_CHANGE,
      changeSats: 39_000,
      network: "signet",
    });
    const signed = signPsbtWithTestSeed({
      psbtBase64: built.psbtBase64,
      seedHex: SEED_HEX,
      inputPaths: [PATH_0],
      network: "signet",
    });
    expect(sumPsbtInputAmounts(signed.signedPsbtBase64)).toBe(100_000);
  });

  it("recusa payload que não é PSBT", () => {
    expect(() => sumPsbtInputAmounts("bm90IHVtYSBQU0JU")).toThrow(/Não foi possível ler a PSBT/);
  });
});

import * as btc from "@scure/btc-signer";

/**
 * Parser PSBT (BIP-174) estritamente de LEITURA. Não assina, não constrói
 * uma transação nova, não transmite. Uso autorizado nesta fase é restrito
 * a exemplos oficiais do BIP-174 (ver docs/signet-architecture-decision-brief.md,
 * tabela de vetores: "Parse, preservação de mapas e recusa de payload fora
 * de rede, sem assinar ou transmitir").
 *
 * "Construção/assinatura de PSBT" continua bloqueada nesta fase — esse é um
 * limite explícito da decisão de arquitetura aprovada, distinto deste
 * parser, que só lê e valida estrutura.
 */

export type ParsedPsbtSummary = {
  version: number;
  inputCount: number;
  outputCount: number;
};

function decodePsbtBytes(base64OrHex: string): Uint8Array {
  const isHex = /^[0-9a-fA-F]+$/.test(base64OrHex) && base64OrHex.length % 2 === 0;
  return isHex
    ? Uint8Array.from(Buffer.from(base64OrHex, "hex"))
    : Uint8Array.from(Buffer.from(base64OrHex, "base64"));
}

/**
 * Faz o parse de um PSBT (base64 ou hex) e devolve um resumo público mínimo.
 * Lança erro claro para qualquer payload malformado ou fora de especificação
 * — isso é o comportamento correto (recusa), não uma falha.
 */
export function parsePublicTestPsbt(base64OrHex: string): ParsedPsbtSummary {
  const bytes = decodePsbtBytes(base64OrHex);
  const tx = btc.Transaction.fromPSBT(bytes);

  return {
    version: tx.version,
    inputCount: tx.inputsLength,
    outputCount: tx.outputsLength,
  };
}

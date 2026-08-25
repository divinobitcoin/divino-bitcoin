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

export type PsbtNetwork = "mainnet" | "signet";

export type ParsedPsbtOutput = {
  /** Valor em satoshis. Sempre cabe com folga em Number (limite: 21_000_000 BTC = 2.1e15 sats). */
  amountSats: number;
  address: string;
};

export type ParsedPsbtSummary = {
  version: number;
  inputCount: number;
  outputCount: number;
  outputs: ParsedPsbtOutput[];
};

function decodePsbtBytes(base64OrHex: string): Uint8Array {
  const isHex = /^[0-9a-fA-F]+$/.test(base64OrHex) && base64OrHex.length % 2 === 0;
  return isHex
    ? Uint8Array.from(Buffer.from(base64OrHex, "hex"))
    : Uint8Array.from(Buffer.from(base64OrHex, "base64"));
}

function getAddressNetwork(network: PsbtNetwork): typeof btc.NETWORK {
  if (network === "mainnet") return btc.NETWORK;
  if (network === "signet") return btc.TEST_NETWORK;
  throw new Error("PSBT network is required and must be mainnet or signet");
}

/**
 * Faz o parse de um PSBT (base64 ou hex) e devolve um resumo público mínimo,
 * incluindo destinatário e valor de cada output — a informação que o
 * threat model exige mostrar ao usuário antes de qualquer assinatura futura
 * (F3: "destinatário, valor, taxa"). Lança erro claro para qualquer payload
 * malformado, rede ausente/desconhecida ou fora de especificação — isso é o
 * comportamento correto (recusa), não uma falha. Se um output tiver um
 * script não endereçável (ex: OP_RETURN), o endereço fica como "".
 *
 * A rede é deliberadamente obrigatória. Os testes atuais usam `mainnet`
 * somente para vetores públicos do BIP-174; o parser não impõe esse limite
 * de uso. O aplicativo em desenvolvimento continua restrito a Signet e não
 * deve chamar este parser com dados operacionais.
 */
export function parsePublicTestPsbt(
  base64OrHex: string,
  network: PsbtNetwork,
): ParsedPsbtSummary {
  const addressNetwork = getAddressNetwork(network);
  const bytes = decodePsbtBytes(base64OrHex);
  const tx = btc.Transaction.fromPSBT(bytes);

  const outputs: ParsedPsbtOutput[] = [];
  for (let i = 0; i < tx.outputsLength; i++) {
    const output = tx.getOutput(i);
    let address = "";
    try {
      address = btc.Address(addressNetwork).encode(
        btc.OutScript.decode(output.script ?? new Uint8Array()),
      );
    } catch {
      address = ""; // script não endereçável (ex: OP_RETURN) — não é erro de parsing
    }

    outputs.push({
      amountSats: Number(output.amount ?? 0n),
      address,
    });
  }

  return {
    version: tx.version,
    inputCount: tx.inputsLength,
    outputCount: tx.outputsLength,
    outputs,
  };
}

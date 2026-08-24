/**
 * Cliente RPC estritamente de LEITURA para o Bitcoin Core. Usa scantxoutset
 * (sem wallet carregada, sem txindex, sem persistência) para consultar
 * UTXOs/saldo de um endereço público. Não expõe nenhuma capacidade de
 * assinatura, broadcast, seleção de moedas ou construção de transação.
 *
 * Uso isolado e explícito: esta função NÃO está ligada ao gate
 * `liveSyncEnabled` de shared/signet-onchain-source.ts. Ela existe para
 * validação manual (smoke test) contra um nó real, sem alterar o contrato
 * declarativo existente nem exigir reabrir a decisão de arquitetura sobre
 * quando o app em si passa a sincronizar automaticamente.
 */

export type BitcoinCoreRpcConfig = {
  /** Ex: "http://127.0.0.1:38332" — porta padrão do RPC em Signet. */
  url: string;
  username: string;
  password: string;
};

export type AddressUtxoSummary = {
  address: string;
  totalAmountBtc: number;
  utxoCount: number;
  bestBlockHash: string;
  height: number;
};

type FetchLike = typeof fetch;

/**
 * Consulta o conjunto de UTXOs atual para um único endereço via
 * scantxoutset. Read-only: não cria, carrega nem modifica nenhuma wallet do
 * Bitcoin Core. Nunca recebe nem manuseia chave privada.
 */
export async function scanAddressUtxoSet(
  config: BitcoinCoreRpcConfig,
  address: string,
  fetchImpl: FetchLike = fetch,
): Promise<AddressUtxoSummary> {
  const auth = Buffer.from(`${config.username}:${config.password}`).toString("base64");

  const response = await fetchImpl(config.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({
      jsonrpc: "1.0",
      id: "divino-signet-readonly-scan",
      method: "scantxoutset",
      params: ["start", [`addr(${address})`]],
    }),
  });

  if (!response.ok) {
    throw new Error(`Chamada RPC falhou com status HTTP ${response.status}.`);
  }

  const body = (await response.json()) as {
    error?: { message?: string } | null;
    result?: {
      success?: boolean;
      total_amount?: number;
      unspents?: unknown[];
      bestblock?: string;
      height?: number;
    } | null;
  };

  if (body.error) {
    throw new Error(`Erro retornado pelo nó: ${body.error.message ?? "desconhecido"}.`);
  }

  const result = body.result;

  if (!result || result.success !== true) {
    throw new Error("scantxoutset não retornou um resultado bem-sucedido.");
  }

  return {
    address,
    totalAmountBtc: result.total_amount ?? 0,
    utxoCount: Array.isArray(result.unspents) ? result.unspents.length : 0,
    bestBlockHash: result.bestblock ?? "",
    height: result.height ?? 0,
  };
}

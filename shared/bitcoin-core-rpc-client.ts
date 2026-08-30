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

  // O Core devolve HTTP 500 (não 200) para a maioria dos erros de nível
  // RPC, com a mensagem real dentro do corpo JSON-RPC — não no status.
  // Checar `!response.ok` antes de ler o corpo descartaria essa mensagem
  // e trocaria por um "status HTTP 500" genérico e inútil. Mesmo achado e
  // mesma correção já feitos em bitcoin-core-wallet-client.ts::rpcCall
  // contra o nó real (RPC-HTTP-STATUS-001); ler o corpo primeiro aqui
  // fecha o mesmo achado neste módulo.
  let body: {
    error?: { message?: string } | null;
    result?: {
      success?: boolean;
      total_amount?: number;
      unspents?: unknown[];
      bestblock?: string;
      height?: number;
    } | null;
  } | null = null;

  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (body?.error) {
    throw new Error(`Erro retornado pelo nó: ${body.error.message ?? "desconhecido"}.`);
  }

  if (!response.ok) {
    throw new Error(
      `Chamada RPC falhou com status HTTP ${response.status}, sem corpo de erro JSON-RPC legível.`,
    );
  }

  const result = body?.result;

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

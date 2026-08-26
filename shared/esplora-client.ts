/**
 * Cliente Esplora estritamente de LEITURA. Consulta saldo confirmado,
 * saldo em mempool e UTXOs de um único endereço público via a API HTTP
 * padrão do Esplora (mesma API usada por mempool.space e blockstream.info).
 * Não expõe nenhuma capacidade de assinatura, broadcast, seleção de moedas
 * ou construção de transação — mesma fronteira de
 * shared/bitcoin-core-rpc-client.ts, mas sem exigir credencial nenhuma,
 * porque a API Esplora é pública e não autenticada.
 *
 * Uso isolado e explícito: esta função NÃO está ligada ao gate
 * `liveSyncEnabled` de shared/signet-onchain-source.ts. Ligar isto à
 * interface do app (decidir de qual endereço mostrar saldo) é uma decisão
 * de arquitetura separada, ainda pendente — ver conversa registrada em
 * 26/08/2026 sobre a fonte on-chain do celular.
 */

export type EsploraConfig = {
  /**
   * Ex: "https://mempool.space/signet/api" (público, ponto de partida) ou,
   * no futuro, o endereço de um Esplora auto-hospedado no seu próprio nó.
   * Sem barra final.
   */
  baseUrl: string;
};

export type EsploraAddressSummary = {
  address: string;
  /** Saldo confirmado em blocos, em satoshis. Pode ser negativo se o endereço só tem gastos confirmados pendentes de nova consulta. */
  chainBalanceSats: number;
  /** Saldo ainda não confirmado (mempool), em satoshis. Positivo = recebendo; negativo = gastando. */
  mempoolBalanceSats: number;
  chainTxCount: number;
  mempoolTxCount: number;
  utxoCount: number;
};

type FetchLike = typeof fetch;

type EsploraAddressStats = {
  funded_txo_sum?: number;
  spent_txo_sum?: number;
  tx_count?: number;
};

type EsploraAddressResponse = {
  address?: string;
  chain_stats?: EsploraAddressStats;
  mempool_stats?: EsploraAddressStats;
};

type EsploraUtxoEntry = {
  txid: string;
  vout: number;
};

function balanceFromStats(stats: EsploraAddressStats | undefined): number {
  const funded = stats?.funded_txo_sum ?? 0;
  const spent = stats?.spent_txo_sum ?? 0;
  return funded - spent;
}

async function fetchJson<T>(
  fetchImpl: FetchLike,
  url: string,
): Promise<T> {
  const response = await fetchImpl(url, { method: "GET" });

  if (!response.ok) {
    throw new Error(`Chamada Esplora falhou com status HTTP ${response.status} (${url}).`);
  }

  return (await response.json()) as T;
}

/**
 * Consulta saldo confirmado, saldo em mempool e contagem de UTXOs para um
 * único endereço. Duas chamadas HTTP de leitura (resumo + lista de UTXOs);
 * nenhuma delas cria, carrega ou modifica nenhuma wallet, e nenhuma delas
 * jamais recebe ou manuseia chave privada.
 */
export async function fetchAddressSummary(
  config: EsploraConfig,
  address: string,
  fetchImpl: FetchLike = fetch,
): Promise<EsploraAddressSummary> {
  const base = config.baseUrl.replace(/\/+$/, "");

  const addressData = await fetchJson<EsploraAddressResponse>(
    fetchImpl,
    `${base}/address/${address}`,
  );

  const utxos = await fetchJson<EsploraUtxoEntry[]>(
    fetchImpl,
    `${base}/address/${address}/utxo`,
  );

  return {
    address,
    chainBalanceSats: balanceFromStats(addressData.chain_stats),
    mempoolBalanceSats: balanceFromStats(addressData.mempool_stats),
    chainTxCount: addressData.chain_stats?.tx_count ?? 0,
    mempoolTxCount: addressData.mempool_stats?.tx_count ?? 0,
    utxoCount: Array.isArray(utxos) ? utxos.length : 0,
  };
}

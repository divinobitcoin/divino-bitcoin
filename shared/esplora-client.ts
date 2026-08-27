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

// ---------------------------------------------------------------------------
// UTXOs — leitura com validação estrita de entrada remota
// ---------------------------------------------------------------------------
//
// `fetchAddressSummary` acima consulta a lista de UTXOs apenas para contá-la e
// descarta o resto. Coin selection precisa dos valores. As funções abaixo
// devolvem a lista de verdade, mantendo exatamente a mesma fronteira: leitura,
// sem chave, sem assinatura, sem broadcast.
//
// Toda entrada aqui vem de um endpoint HTTP remoto e é tratada como NÃO
// CONFIÁVEL, conforme `WF-F12` / `INV` correspondente. Um explorador
// comprometido, um MITM ou um servidor com bug pode devolver campo faltando,
// tipo errado, valor fracionário, valor negativo ou valor absurdamente grande.
// Cada um desses casos é uma forma de induzir a carteira a construir uma
// transação errada — ameaça `T4` do threat model ("fonte on-chain entrega
// saldo, UTXO, taxa ou estado falso"). Por isso a validação abaixo recusa em
// vez de coagir: `Number("abc")` vira `NaN` silenciosamente, e `NaN` em coin
// selection produz transação inválida ou taxa arbitrária.

/** Teto absoluto de satoshis que podem existir: 21.000.000 BTC. */
const MAX_SATS = 21_000_000 * 100_000_000;

export type EsploraUtxo = {
  txid: string;
  vout: number;
  valueSats: number;
  confirmed: boolean;
  /** Altura do bloco. `null` enquanto não confirmado. */
  blockHeight: number | null;
};

function assertValidTxid(value: unknown, index: number): string {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/i.test(value)) {
    throw new Error(
      `UTXO ${index} devolvido pelo Esplora tem txid inválido. Esperado 64 caracteres hexadecimais; recebido: ${JSON.stringify(value)}.`,
    );
  }
  return value.toLowerCase();
}

function assertValidVout(value: unknown, index: number): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error(
      `UTXO ${index} devolvido pelo Esplora tem vout inválido. Esperado inteiro não negativo; recebido: ${JSON.stringify(value)}.`,
    );
  }
  return value;
}

function assertValidValueSats(value: unknown, index: number): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > MAX_SATS) {
    throw new Error(
      `UTXO ${index} devolvido pelo Esplora tem value inválido. Esperado inteiro de satoshis entre 0 e ${MAX_SATS}; recebido: ${JSON.stringify(value)}.`,
    );
  }
  return value;
}

/**
 * Lista os UTXOs de um único endereço, com valor em satoshis e estado de
 * confirmação. Uma chamada HTTP de leitura. Nunca recebe nem manuseia chave
 * privada, não assina e não transmite.
 *
 * Recusa a resposta inteira se qualquer UTXO estiver malformado. A recusa é
 * deliberada e não é um bug: aceitar uma lista parcialmente válida deixaria a
 * carteira calcular saldo e seleção sobre dados que ela sabe estarem errados.
 * Falhar alto e cedo é o comportamento correto para dado de origem não
 * confiável.
 */
export async function fetchAddressUtxos(
  config: EsploraConfig,
  address: string,
  fetchImpl: FetchLike = fetch,
): Promise<EsploraUtxo[]> {
  const base = config.baseUrl.replace(/\/+$/, "");

  const raw = await fetchJson<unknown>(fetchImpl, `${base}/address/${address}/utxo`);

  if (!Array.isArray(raw)) {
    throw new Error(
      `Esplora devolveu um payload de UTXO que não é uma lista para ${address}. Recebido: ${typeof raw}.`,
    );
  }

  return raw.map((entry, index) => {
    if (typeof entry !== "object" || entry === null) {
      throw new Error(`UTXO ${index} devolvido pelo Esplora não é um objeto.`);
    }

    const candidate = entry as {
      txid?: unknown;
      vout?: unknown;
      value?: unknown;
      status?: { confirmed?: unknown; block_height?: unknown } | null;
    };

    const confirmed = candidate.status?.confirmed === true;
    const rawHeight = candidate.status?.block_height;
    const blockHeight =
      confirmed && typeof rawHeight === "number" && Number.isInteger(rawHeight) && rawHeight >= 0
        ? rawHeight
        : null;

    return {
      txid: assertValidTxid(candidate.txid, index),
      vout: assertValidVout(candidate.vout, index),
      valueSats: assertValidValueSats(candidate.value, index),
      confirmed,
      blockHeight,
    };
  });
}

/** Soma os satoshis de uma lista de UTXOs. Separada para ser testável sozinha. */
export function sumUtxoValueSats(utxos: readonly EsploraUtxo[]): number {
  return utxos.reduce((total, utxo) => total + utxo.valueSats, 0);
}

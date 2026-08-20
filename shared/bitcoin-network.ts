/**
 * The only Bitcoin network profile permitted while the wallet is under
 * development. This is configuration only: it creates no key, node
 * connection, invoice, transaction, or balance.
 */
export const SIGNET_NETWORK = {
  id: "signet",
  label: "Bitcoin Signet",
  lightningInvoicePrefix: "lntbs",
  isProduction: false,
} as const;

export type BitcoinDevelopmentNetwork = typeof SIGNET_NETWORK.id;

export const ACTIVE_DEVELOPMENT_NETWORK: BitcoinDevelopmentNetwork = SIGNET_NETWORK.id;

export function assertSignetOnly(network: string): asserts network is BitcoinDevelopmentNetwork {
  if (network !== ACTIVE_DEVELOPMENT_NETWORK) {
    throw new Error("Este build aceita apenas Bitcoin Signet. Mainnet e outras redes permanecem bloqueadas.");
  }
}

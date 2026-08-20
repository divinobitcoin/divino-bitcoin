import { describe, expect, it } from "vitest";

import {
  createSignetPublicStorageKey,
  DEMO_WALLET_STORAGE_KEY,
  SIGNET_PUBLIC_STORAGE_RECORDS,
} from "../shared/storage-namespaces";

describe("namespaces locais de carteira", () => {
  it("mantém o estado demonstrativo separado de qualquer registro Signet", () => {
    const signetKey = createSignetPublicStorageKey("signet", "network-config");

    expect(DEMO_WALLET_STORAGE_KEY).toBe("divino-bitcoin.wallet.demo.v1");
    expect(signetKey).toBe("divino-bitcoin.signet.public.signet.network-config.v1");
    expect(signetKey).not.toContain("wallet.demo");
  });

  it("aceita somente o perfil Signet para o namespace de desenvolvimento", () => {
    expect(() => createSignetPublicStorageKey("signet", "sync-metadata")).not.toThrow();
    expect(() => createSignetPublicStorageKey("mainnet", "sync-metadata")).toThrow("apenas Bitcoin Signet");
    expect(() => createSignetPublicStorageKey("testnet", "sync-metadata")).toThrow("apenas Bitcoin Signet");
  });

  it("expõe apenas registros públicos ou não assinados antes do cofre", () => {
    expect(SIGNET_PUBLIC_STORAGE_RECORDS).toEqual([
      "network-config",
      "sync-metadata",
      "unsigned-intent",
    ]);
    expect(SIGNET_PUBLIC_STORAGE_RECORDS).not.toContain("seed");
    expect(SIGNET_PUBLIC_STORAGE_RECORDS).not.toContain("private-key");
    expect(SIGNET_PUBLIC_STORAGE_RECORDS).not.toContain("channel-backup");
  });
});

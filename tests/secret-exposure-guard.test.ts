import { describe, expect, it } from "vitest";

import {
  assertSafeForSecretExposureChannel,
  createPublicVaultAuditEvent,
} from "../shared/secret-exposure-guard";

describe("guardas negativas de exposição de segredo", () => {
  const sensitiveFixture = {
    publicProfile: "signet-local",
    nested: { mnemonic: "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about" },
  };

  it.each(["backup", "clipboard", "log"] as const)("bloqueia material secreto no canal de %s", (channel: "backup" | "clipboard" | "log") => {
    expect(() => assertSafeForSecretExposureChannel(channel, sensitiveFixture)).toThrow(`não podem alcançar ${channel}`);
  });

  it("aceita somente metadados públicos nos canais de saída", () => {
    const metadata = { network: "signet", sourceKind: "electrum", status: "skeleton" };

    expect(() => assertSafeForSecretExposureChannel("log", metadata)).not.toThrow();
    expect(createPublicVaultAuditEvent("provision", "blocked")).toEqual({
      operation: "provision",
      outcome: "blocked",
    });
  });
});

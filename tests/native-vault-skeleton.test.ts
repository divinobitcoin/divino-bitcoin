import { describe, expect, it } from "vitest";

import type { DivinoNativeVaultModuleInterface, NativeVaultCapabilities } from "../modules/divino-native-vault/src/DivinoNativeVault.types";

describe("contrato do esqueleto de cofre nativo", () => {
  it("restringe a interface pública a capacidades e falha explícita", () => {
    const methodNames = ["getCapabilitiesAsync", "assertOperationUnavailableAsync"] satisfies Array<keyof DivinoNativeVaultModuleInterface>;

    expect(methodNames).toEqual(["getCapabilitiesAsync", "assertOperationUnavailableAsync"]);
    expect(methodNames).not.toContain("getSeed");
    expect(methodNames).not.toContain("exportPrivateKey");
  });

  it("representa somente um cofre não provisionado", () => {
    const capabilities: NativeVaultCapabilities = {
      status: "skeleton",
      requiresDevelopmentBuild: true,
      usesNativeBoundary: true,
      supportsSecretProvisioning: false,
      supportsSigning: false,
    };

    expect(capabilities).toMatchObject({
      requiresDevelopmentBuild: true,
      supportsSecretProvisioning: false,
      supportsSigning: false,
    });
  });
});

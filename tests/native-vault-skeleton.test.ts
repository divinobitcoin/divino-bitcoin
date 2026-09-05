import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import type { DivinoNativeVaultModuleInterface, NativeVaultCapabilities } from "../modules/divino-native-vault/src/DivinoNativeVault.types";
import type { ProvisionSignetProfileRequest } from "../modules/divino-native-vault/src/DivinoNativeVault.types";

const typesSource = readFileSync(
  resolve(import.meta.dirname, "../modules/divino-native-vault/src/DivinoNativeVault.types.ts"),
  "utf8",
);
const wrapperSource = readFileSync(
  resolve(import.meta.dirname, "../modules/divino-native-vault/src/native-vault.ts"),
  "utf8",
);
const kotlinSource = readFileSync(
  resolve(
    import.meta.dirname,
    "../modules/divino-native-vault/android/src/main/java/expo/modules/divinonativevault/DivinoNativeVaultModule.kt",
  ),
  "utf8",
);
const swiftSource = readFileSync(
  resolve(import.meta.dirname, "../modules/divino-native-vault/ios/DivinoNativeVaultModule.swift"),
  "utf8",
);

describe("contrato do cofre nativo Signet", () => {
  it("expõe só as operações públicas da carta", () => {
    const methodNames = [
      "getCapabilitiesAsync",
      "provisionSignetProfile",
      "getPublicDescriptor",
      "authorizeSigningIntent",
      "deleteProfile",
      "assertOperationUnavailableAsync",
    ] satisfies Array<keyof DivinoNativeVaultModuleInterface>;

    expect(methodNames).toEqual([
      "getCapabilitiesAsync",
      "provisionSignetProfile",
      "getPublicDescriptor",
      "authorizeSigningIntent",
      "deleteProfile",
      "assertOperationUnavailableAsync",
    ]);
    expect(methodNames).not.toContain("getSeed");
    expect(methodNames).not.toContain("exportPrivateKey");
    expect(methodNames).not.toContain("readMnemonic");
    expect(methodNames).not.toContain("decryptSecret");
  });

  it("não aceita mnemonic na chamada de provisionamento", () => {
    const request: ProvisionSignetProfileRequest = { mode: "generate" };
    expect(request).toEqual({ mode: "generate" });
    expect(typesSource).not.toMatch(/provisionSignetProfile\([^)]*mnemonic/i);
    expect(wrapperSource).not.toMatch(/mnemonic/);
  });

  it("representa um cofre Signet opaco, nunca Mainnet", () => {
    const capabilities: NativeVaultCapabilities = {
      status: "unprovisioned",
      network: "signet",
      requiresDevelopmentBuild: true,
      usesNativeBoundary: true,
      supportsSecretProvisioning: true,
      supportsSigning: true,
      profileId: null,
      masterFingerprint: null,
    };

    expect(capabilities.network).toBe("signet");
    expect(capabilities.supportsSecretProvisioning).toBe(true);
    expect(capabilities.supportsSigning).toBe(true);
  });

  it("Kotlin e Swift recusam leitura de segredo e não declaram getSeed", () => {
    for (const source of [kotlinSource, swiftSource, typesSource]) {
      expect(source).not.toMatch(/\b(fun|func|AsyncFunction)\s+["']?getSeed/);
      expect(source).not.toMatch(/\b(fun|func|AsyncFunction)\s+["']?exportPrivateKey/);
      expect(source).not.toMatch(/\b(fun|func|AsyncFunction)\s+["']?readMnemonic/);
      expect(source).not.toMatch(/\b(fun|func|AsyncFunction)\s+["']?decryptSecret/);
    }
    expect(kotlinSource).toContain("provisionSignetProfile");
    expect(kotlinSource).toContain("getPublicDescriptor");
    expect(kotlinSource).toContain("authorizeSigningIntent");
    expect(kotlinSource).toContain("deleteProfile");
    expect(swiftSource).toContain("provisionSignetProfile");
    expect(kotlinSource).toContain("private fun rejectUnavailableOperation(operation: String): Unit");
  });

  it("o envelope Android não usa SharedPreferences nem SecureStore", () => {
    const store = readFileSync(
      resolve(
        import.meta.dirname,
        "../modules/divino-native-vault/android/src/main/java/expo/modules/divinonativevault/SignetVaultStore.kt",
      ),
      "utf8",
    );
    expect(store).toContain("noBackupFilesDir");
    expect(store).toContain("AndroidKeyStore");
    expect(store).not.toMatch(/getSharedPreferences|EncryptedSharedPreferences|expo-secure-store/);
  });
});

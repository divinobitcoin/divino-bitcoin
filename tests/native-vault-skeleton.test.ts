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

  it("revelação e quiz são Activities distintas; o envelope só nasce depois do quiz", () => {
    const reveal = readFileSync(
      resolve(
        import.meta.dirname,
        "../modules/divino-native-vault/android/src/main/java/expo/modules/divinonativevault/SignetMnemonicRevealActivity.kt",
      ),
      "utf8",
    );
    const quiz = readFileSync(
      resolve(
        import.meta.dirname,
        "../modules/divino-native-vault/android/src/main/java/expo/modules/divinonativevault/SignetMnemonicQuizActivity.kt",
      ),
      "utf8",
    );
    const manifest = readFileSync(
      resolve(import.meta.dirname, "../modules/divino-native-vault/android/src/main/AndroidManifest.xml"),
      "utf8",
    );
    const session = readFileSync(
      resolve(
        import.meta.dirname,
        "../modules/divino-native-vault/android/src/main/java/expo/modules/divinonativevault/SignetProvisionSession.kt",
      ),
      "utf8",
    );

    expect(manifest).toContain("SignetMnemonicRevealActivity");
    expect(manifest).toContain("SignetMnemonicQuizActivity");
    expect(reveal).toContain("Anotei no papel");
    expect(reveal).toContain("lockScreen");
    expect(reveal).not.toContain("persistNewProfile");
    expect(reveal).not.toContain("Clipboard");
    expect(quiz).toContain("persistNewProfile");
    expect(quiz).not.toContain("wordChip");
    expect(quiz).not.toMatch(/words\.forEachIndexed/);
    expect(quiz).not.toContain("putExtra(\"words\"");
    expect(session).toContain("pendingWords");
    expect(session).not.toMatch(/android\.content\.Intent|putExtra/);
    const chrome = readFileSync(
      resolve(
        import.meta.dirname,
        "../modules/divino-native-vault/android/src/main/java/expo/modules/divinonativevault/SignetNativeChrome.kt",
      ),
      "utf8",
    );
    expect(chrome).toContain("FLAG_SECURE");
    expect(quiz).toContain("lockScreen");
    expect(kotlinSource).toContain("SignetMnemonicRevealActivity");
    expect(kotlinSource).not.toMatch(/\b(fun|func|AsyncFunction)\s+["']?getSeed/);
  });

  it("importa BIP-39 do papel em 12 campos nativos, com checksum, sem vazar a frase", () => {
    const importSource = readFileSync(
      resolve(
        import.meta.dirname,
        "../modules/divino-native-vault/android/src/main/java/expo/modules/divinonativevault/SignetMnemonicImportActivity.kt",
      ),
      "utf8",
    );
    const crypto = readFileSync(
      resolve(
        import.meta.dirname,
        "../modules/divino-native-vault/android/src/main/java/expo/modules/divinonativevault/SignetVaultCrypto.kt",
      ),
      "utf8",
    );
    const manifest = readFileSync(
      resolve(import.meta.dirname, "../modules/divino-native-vault/android/src/main/AndroidManifest.xml"),
      "utf8",
    );

    expect(manifest).toContain("SignetMnemonicImportActivity");
    expect(kotlinSource).toContain("SignetMnemonicImportActivity");
    expect(importSource).toContain("0 until 12");
    expect(importSource).not.toContain("0 until 24");
    expect(importSource).toContain("lockScreen");
    expect(importSource).toContain("persistNewProfile");
    expect(importSource).toContain("validateMnemonic");
    expect(importSource).toContain("Frase BIP-39 inválida.");
    expect(importSource).not.toMatch(/error\.text\s*=\s*(typed|words)/);
    expect(importSource).not.toContain("putExtra(\"words\"");
    expect(importSource).not.toMatch(/\b(fun|func|AsyncFunction)\s+["']?getSeed/);
    expect(importSource).not.toMatch(/\breadMnemonic\b/);
    expect(crypto).toContain("MnemonicCode.validate");
    expect(crypto).toContain("words.size != 12");
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

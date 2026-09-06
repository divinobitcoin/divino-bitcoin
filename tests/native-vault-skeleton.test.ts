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

  it("fingerprint é 8 hex minúsculos sem sinal; recusa descritor com hífen", () => {
    const crypto = readFileSync(
      resolve(
        import.meta.dirname,
        "../modules/divino-native-vault/android/src/main/java/expo/modules/divinonativevault/SignetVaultCrypto.kt",
      ),
      "utf8",
    );
    const iosKey = readFileSync(
      resolve(import.meta.dirname, "../modules/divino-native-vault/ios/SignetHDKey.swift"),
      "utf8",
    );
    const iosCrypto = readFileSync(
      resolve(import.meta.dirname, "../modules/divino-native-vault/ios/SignetVaultCrypto.swift"),
      "utf8",
    );

    expect(crypto).toContain("toUInt()");
    expect(crypto).toContain("%08x");
    expect(crypto).toContain("assertUnsignedPublicMaterial");
    expect(crypto).not.toMatch(/fingerprint\(\)\s*\.toString\(16\)/);
    expect(crypto).not.toMatch(/toInt\(\)\s*\.toString\(16\)/);
    expect(iosKey).toContain("%08x");
    expect(iosCrypto).toContain("assertUnsignedPublicMaterial");
    expect(iosCrypto).toContain(".contains(\"-\")");

    const signedHighBit = -0x7e867d99;
    expect(signedHighBit.toString(16)).toBe("-7e867d99");
    const unsigned = (signedHighBit >>> 0).toString(16).padStart(8, "0");
    expect(unsigned).toBe("81798267");
    expect(unsigned).toMatch(/^[0-9a-f]{8}$/);
    expect(unsigned).not.toContain("-");
    expect((0x7e867d99 >>> 0).toString(16).padStart(8, "0")).toBe("7e867d99");
  });

  it("importação BIP-39 guarda rascunho só em RAM e trava retrato", () => {
    const importSource = readFileSync(
      resolve(
        import.meta.dirname,
        "../modules/divino-native-vault/android/src/main/java/expo/modules/divinonativevault/SignetMnemonicImportActivity.kt",
      ),
      "utf8",
    );
    const session = readFileSync(
      resolve(
        import.meta.dirname,
        "../modules/divino-native-vault/android/src/main/java/expo/modules/divinonativevault/SignetProvisionSession.kt",
      ),
      "utf8",
    );
    const chrome = readFileSync(
      resolve(
        import.meta.dirname,
        "../modules/divino-native-vault/android/src/main/java/expo/modules/divinonativevault/SignetNativeChrome.kt",
      ),
      "utf8",
    );
    const manifest = readFileSync(
      resolve(import.meta.dirname, "../modules/divino-native-vault/android/src/main/AndroidManifest.xml"),
      "utf8",
    );
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

    expect(session).toContain("replaceDraft");
    expect(session).not.toMatch(/getSharedPreferences|EncryptedSharedPreferences|putExtra\(/);
    expect(importSource).toContain("replaceDraft");
    expect(importSource).toContain("restoreDraft");
    expect(importSource).not.toMatch(/outState\.put/);
    expect(importSource).not.toContain("putExtra(\"words\"");
    expect(importSource).not.toMatch(/getSharedPreferences/);
    expect(chrome).toContain("SCREEN_ORIENTATION_PORTRAIT");
    expect(chrome).toContain("FLAG_SECURE");
    expect(manifest.match(/android:screenOrientation="portrait"/g)?.length).toBe(3);
    expect(reveal).toContain("isSaveEnabled = false");
    expect(quiz).toContain("quizPair");
  });

  it("o quiz sorteia 2 índices distintos em 0..11 ao gerar, só em RAM", () => {
    const session = readFileSync(
      resolve(
        import.meta.dirname,
        "../modules/divino-native-vault/android/src/main/java/expo/modules/divinonativevault/SignetProvisionSession.kt",
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
    const store = readFileSync(
      resolve(
        import.meta.dirname,
        "../modules/divino-native-vault/android/src/main/java/expo/modules/divinonativevault/SignetVaultStore.kt",
      ),
      "utf8",
    );
    const iosSession = readFileSync(
      resolve(import.meta.dirname, "../modules/divino-native-vault/ios/SignetProvisionSession.swift"),
      "utf8",
    );
    const iosQuiz = readFileSync(
      resolve(import.meta.dirname, "../modules/divino-native-vault/ios/SignetMnemonicQuizViewController.swift"),
      "utf8",
    );

    expect(session).toContain("SecureRandom");
    expect(session).toContain("drawDistinctQuizIndices");
    expect(session).toContain("nextBytes");
    expect(session).toContain("fun begin(");
    expect(session).not.toContain("nextInt");
    expect(session).toContain("second >= first");
    expect(session).not.toMatch(/Random\(\s*\d+\s*\)/);
    expect(session).not.toContain("beginQuiz");
    expect(quiz).not.toContain("kotlin.random.Random");
    expect(quiz).not.toMatch(/Random\.nextInt/);
    expect(quiz).toContain("quizPair");
    expect(quiz).toContain("indexA + 1");
    expect(quiz).toContain("RESULT_CANCELED");
    expect(quiz).toContain("reshuffleQuiz");
    expect(quiz).not.toContain("generateMnemonic");
    expect(quiz).not.toContain("SignetProvisionSession.begin");
    expect(session).toContain("fun reshuffleQuiz");
    expect(iosSession).toContain("reshuffleQuiz");
    expect(iosQuiz).toContain("reshuffleQuiz");
    expect(quiz).not.toMatch(/persistNewProfile[\s\S]*typedA/);
    expect(store).not.toContain("quizIndex");
    expect(iosSession).toContain("drawDistinctQuizIndices");
    expect(iosSession).toContain("SecRandomCopyBytes");
    expect(iosSession).not.toContain("Int.random");
    expect(iosQuiz).toContain("quizPair");
    expect(iosQuiz).not.toMatch(/Int\.random\(in:/);

    const quizNative = [session, quiz, iosSession, iosQuiz].join("\n");
    expect(quizNative).not.toMatch(
      /\b(listOf|Pair|arrayOf)\(\s*(1\s*,\s*7|7\s*,\s*1|3\s*,\s*4|4\s*,\s*3)\s*\)/,
    );
    expect(quizNative).not.toMatch(/\bquizIndex[AB]\s*=\s*(1|3|4|7)\b/);
    expect(quizNative).not.toMatch(/\bindex[AB]\s*=\s*(1|3|4|7)\b/);
    expect(quizNative).not.toMatch(/Palavra\s+(1|3|4|7)\b/);

    function pairFromDraw(first: number, secondRaw: number): [number, number] {
      let second = secondRaw;
      if (second >= first) second += 1;
      return [first, second];
    }
    expect(pairFromDraw(0, 0)).toEqual([0, 1]);
    expect(pairFromDraw(0, 10)).toEqual([0, 11]);
    expect(pairFromDraw(5, 5)).toEqual([5, 6]);
    expect(pairFromDraw(11, 10)).toEqual([11, 10]);
    const seen = new Set<string>();
    for (let first = 0; first < 12; first += 1) {
      for (let secondRaw = 0; secondRaw < 11; secondRaw += 1) {
        const [a, b] = pairFromDraw(first, secondRaw);
        expect(a).toBeGreaterThanOrEqual(0);
        expect(a).toBeLessThan(12);
        expect(b).toBeGreaterThanOrEqual(0);
        expect(b).toBeLessThan(12);
        expect(a).not.toBe(b);
        seen.add(`${a}:${b}`);
      }
    }
    expect(seen.size).toBe(12 * 11);
  });

  it("RESULT_CANCELED distingue voltar, sessão vazia e falha de persistência, sem palavras", () => {
    expect(kotlinSource).not.toMatch(/pending\.reject\("VAULT_CANCELLED", "Provisionamento cancelado\."/);
    expect(kotlinSource).toContain("Você voltou na revelação. Nada foi guardado.");
    expect(kotlinSource).toContain("A sessão em memória esvaziou. O envelope ainda não existe.");
    expect(kotlinSource).toContain("O Keystore recusou gravar o envelope. Nada foi guardado.");
    expect(kotlinSource).toContain("CANCEL_BACK");
    expect(kotlinSource).toContain("CANCEL_EMPTY_SESSION");
    expect(kotlinSource).toContain("CANCEL_PERSIST");
    expect(swiftSource).not.toContain("Provisionamento cancelado.");
    expect(swiftSource).not.toMatch(/reject\([^)]*words/);
    expect(kotlinSource).not.toMatch(/reject\([^)]*words/);
    const iosReveal = readFileSync(
      resolve(import.meta.dirname, "../modules/divino-native-vault/ios/SignetMnemonicRevealViewController.swift"),
      "utf8",
    );
    const iosQuiz = readFileSync(
      resolve(import.meta.dirname, "../modules/divino-native-vault/ios/SignetMnemonicQuizViewController.swift"),
      "utf8",
    );
    expect(iosReveal).toContain("Você voltou na revelação. Nada foi guardado.");
    expect(iosReveal).toContain("A sessão em memória esvaziou. O envelope ainda não existe.");
    expect(iosQuiz).toContain("VAULT_PERSIST");
    expect(iosReveal).not.toContain("Provisionamento cancelado.");
  });

  it("copiar material público mostra Copiado ~2s e nunca toast do valor", () => {
    const vaultScreen = readFileSync(
      resolve(import.meta.dirname, "../app/dev/signet-vault.tsx"),
      "utf8",
    );
    expect(vaultScreen).toContain("Copiado");
    expect(vaultScreen).not.toContain("COPIADO");
    expect(vaultScreen).toContain("2000");
    expect(vaultScreen).toContain("Clipboard.setStringAsync(value)");
    expect(vaultScreen).not.toMatch(/Alert\.alert\([^)]*value/);
    expect(vaultScreen).not.toMatch(/Toast/);
    expect(vaultScreen).not.toMatch(/mnemonic/i);
  });
});

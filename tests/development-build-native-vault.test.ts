import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");

describe("integração do development build do cofre", () => {
  it("mantém a ponte opcional fora do development build e evita a inicialização insegura no Expo Go", () => {
    const bridge = readFileSync(resolve(projectRoot, "modules/divino-native-vault/src/DivinoNativeVaultModule.ts"), "utf8");

    expect(bridge).toContain("requireOptionalNativeModule");
    expect(bridge).not.toContain("requireNativeModule<");
  });

  it("declara um perfil interno de APK para o development client", () => {
    const easConfig = JSON.parse(readFileSync(resolve(projectRoot, "eas.json"), "utf8"));

    expect(easConfig.build.development).toMatchObject({
      developmentClient: true,
      distribution: "internal",
      android: { buildType: "apk" },
    });
  });

  it("declara expo-asset diretamente para satisfazer a dependência nativa de expo-audio", () => {
    const packageJson = JSON.parse(readFileSync(resolve(projectRoot, "package.json"), "utf8"));

    expect(packageJson.dependencies["expo-asset"]).toBe("~55.0.19");
  });

  it("registra o plugin que gera um wrapper Gradle compatível com a cadeia React Native", () => {
    const appConfig = readFileSync(resolve(projectRoot, "app.config.ts"), "utf8");
    const configPlugin = readFileSync(resolve(projectRoot, "plugins/with-gradle-8-compatibility.js"), "utf8");

    expect(appConfig).toContain('"./plugins/with-gradle-8-compatibility.js"');
    expect(configPlugin).toContain("gradle-8.13-bin.zip");
    expect(configPlugin).toContain("gradle-9.0.0-bin.zip");
  });

  it("mantém a rejeição Kotlin tipada como Unit para o DSL reificado de AsyncFunction", () => {
    const kotlinModule = readFileSync(
      resolve(
        projectRoot,
        "modules/divino-native-vault/android/src/main/java/expo/modules/divinonativevault/DivinoNativeVaultModule.kt",
      ),
      "utf8",
    );

    expect(kotlinModule).toContain("private fun rejectUnavailableOperation(operation: String): Unit");
    expect(kotlinModule).toContain("return@AsyncFunction rejectUnavailableOperation(operation)");
    expect(kotlinModule).not.toContain("AsyncFunction(\"assertOperationUnavailableAsync\") { operation: String ->\n      throw");
  });
});

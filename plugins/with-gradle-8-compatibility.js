const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("node:fs/promises");
const path = require("node:path");

const GENERATED_GRADLE_9_URL = "https\\://services.gradle.org/distributions/gradle-9.0.0-bin.zip";
const COMPATIBLE_GRADLE_8_URL = "https\\://services.gradle.org/distributions/gradle-8.13-bin.zip";

/**
 * React Native 0.83.10 ships Foojay resolver 0.5.0, which references the
 * removed Gradle 9 IBM_SEMERU vendor constant. AGP 8.12 supports Gradle 8.13.
 * The native directory is generated and ignored, so the wrapper is adjusted
 * here instead of mutating node_modules or committing platform output.
 */
module.exports = function withGradle8Compatibility(config) {
  return withDangerousMod(config, ["android", async (nextConfig) => {
    const wrapperPath = path.join(
      nextConfig.modRequest.platformProjectRoot,
      "gradle",
      "wrapper",
      "gradle-wrapper.properties",
    );
    const wrapper = await fs.readFile(wrapperPath, "utf8");

    if (!wrapper.includes(GENERATED_GRADLE_9_URL) && !wrapper.includes(COMPATIBLE_GRADLE_8_URL)) {
      throw new Error("Versão inesperada do Gradle gerado; revise with-gradle-8-compatibility antes de compilar.");
    }

    await fs.writeFile(wrapperPath, wrapper.replace(GENERATED_GRADLE_9_URL, COMPATIBLE_GRADLE_8_URL));
    return nextConfig;
  }]);
};

// Load environment variables with proper priority (system > .env)
import "./scripts/load-env.js";
import type { ExpoConfig } from "expo/config";

// Bundle ID format: space.manus.<project_name_dots>.<timestamp>
// e.g., "my-app" created at 2024-01-15 10:30:45 -> "space.manus.my.app.t20240115103045"
// Bundle ID can only contain letters, numbers, and dots
// Android requires each dot-separated segment to start with a letter
const rawBundleId = "com.app.divinobitcoinlightningapp";
const bundleId =
  rawBundleId
    .replace(/[-_]/g, ".") // Replace hyphens/underscores with dots
    .replace(/[^a-zA-Z0-9.]/g, "") // Remove invalid chars
    .replace(/\.+/g, ".") // Collapse consecutive dots
    .replace(/^\.+|\.+$/g, "") // Trim leading/trailing dots
    .toLowerCase()
    .split(".")
    .map((segment) => {
      // Android requires each segment to start with a letter
      // Prefix with 'x' if segment starts with a digit
      return /^[a-zA-Z]/.test(segment) ? segment : "x" + segment;
    })
    .join(".") || "space.manus.app";
// Extract timestamp from bundle ID and prefix with "manus" for deep link scheme
// e.g., "space.manus.my.app.t20240115103045" -> "manus20240115103045"
const timestamp = bundleId.split(".").pop()?.replace(/^t/, "") ?? "";
const schemeFromBundleId = `manus${timestamp}`;

const env = {
  // App branding - update these values directly (do not use env vars)
  appName: "Divino Bitcoin",
  appSlug: "divino-bitcoin-lightning-app",
  // Vazio de propósito: o ícone vem de assets/images/icon.png, do repositório.
  // Apontava para "/manus-storage/divino-bitcoin-icon_c3ae66a3.png" — caminho de
  // armazenamento de terceiro que não existe aqui. O campo é declarado e nunca
  // lido (verificado), então não havia efeito em execução; era ponteiro morto.
  logoUrl: "",
  scheme: schemeFromBundleId,
  iosBundleId: bundleId,
  androidPackage: bundleId,
};

const config: ExpoConfig = {
  name: env.appName,
  slug: env.appSlug,
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: env.scheme,
  userInterfaceStyle: "automatic",
  ios: {
    supportsTablet: true,
    bundleIdentifier: env.iosBundleId,
    "infoPlist": {
        "ITSAppUsesNonExemptEncryption": false
      }
  },
  android: {
    adaptiveIcon: {
      // Obsidiana, a cor de fundo da identidade. Era "#E6F4FE" — azul claro que
      // nunca foi escolha de marca: é a cor de fundo do template de ícone
      // adaptativo do Android, que veio junto com o andaime e ficou.
      backgroundColor: "#080808",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      // backgroundImage removido de propósito: o arquivo que estava aqui era a
      // prancha de guias do template (círculos de zona segura em azul claro),
      // nunca substituída. Com a camada de fundo sendo cor sólida, o
      // backgroundColor acima resolve sozinho.
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    package: env.androidPackage,
    permissions: ["POST_NOTIFICATIONS"],
    intentFilters: [
      {
        action: "VIEW",
        // Sem autoVerify: essa flag só tem efeito em Android App Links
        // (esquemas http/https verificados por assetlinks.json). Em um scheme
        // customizado ela é ignorada pelo sistema e apenas sugere uma
        // verificação que nunca acontece. Ver DEEP-LINK-001-A.
        data: [
          {
            scheme: env.scheme,
            host: "*",
          },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-font",
    "expo-web-browser",
    [
      "expo-secure-store",
      {
        configureAndroidBackup: true,
        faceIDPermission: "Permitir que $(PRODUCT_NAME) use o Face ID para proteger a carteira.",
      },
    ],
    [
      "expo-local-authentication",
      {
        faceIDPermission: "Permitir que $(PRODUCT_NAME) use o Face ID para confirmar o acesso à carteira.",
      },
    ],
    [
      "expo-camera",
      {
        cameraPermission: "Permitir que $(PRODUCT_NAME) use a câmera para ler QR Codes de invoices Lightning.",
        recordAudioAndroid: false,
      },
    ],
    [
      "expo-audio",
      {
        microphonePermission: "Allow $(PRODUCT_NAME) to access your microphone.",
      },
    ],
    [
      "expo-video",
      {
        supportsBackgroundPlayback: true,
        supportsPictureInPicture: true,
      },
    ],
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        // Obsidiana nos dois modos. A identidade é escura e não define tema
        // claro — ver constants/palette.ts. Um splash branco abriria o
        // aplicativo com um clarão que nenhuma tela depois repete.
        backgroundColor: "#080808",
        dark: {
          backgroundColor: "#080808",
        },
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          buildArchs: ["armeabi-v7a", "arm64-v8a"],
          minSdkVersion: 24,
        },
      },
    ],
    "./plugins/with-gradle-8-compatibility.js",
  ],
  experiments: {
    typedRoutes: false,
    reactCompiler: true,
  },
};

export default config;

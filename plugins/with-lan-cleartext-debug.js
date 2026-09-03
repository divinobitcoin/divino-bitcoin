const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("node:fs/promises");
const path = require("node:path");

/**
 * Exceção de tráfego em texto claro para UM endereço da rede local, e SÓ no
 * build de depuração.
 *
 * ## Por que isto é preciso
 *
 * Desde a API 28 o Android bloqueia HTTP sem TLS por padrão. O RPC do Bitcoin
 * Core **não tem TLS** — é HTTP com Basic auth. Sem uma exceção, a tela de
 * saldo não consegue falar com o nó do usuário, e o aplicativo continua
 * perguntando ao `mempool.space` (`T4`).
 *
 * ## Por que NÃO se usa `usesCleartextTraffic`
 *
 * A saída fácil seria `android.usesCleartextTraffic: true` no `app.config.ts`.
 * Ela libera **qualquer** destino, em **qualquer** build, e sobrevive até
 * produção — onde vira `T5`. O `NODE-TRANSPORT-001` já decidiu contra:
 *
 * > A exceção de cleartext vai **só no build de debug e só para um endereço**.
 *
 * ## Como a restrição é aplicada
 *
 * Os dois arquivos são escritos em `android/app/src/debug/`, que é o *source
 * set* de depuração. O Gradle só o inclui na variante `debug`; o APK de release
 * **não contém nem o XML nem a referência a ele**. Não é uma flag que alguém
 * pode esquecer de desligar — é ausência física do arquivo.
 *
 * ## Fail-closed por construção
 *
 * Sem a variável `DIVINO_LAN_NODE_IP`, este plugin **não escreve nada** e o
 * aplicativo fica sem exceção nenhuma. A permissão só existe quando alguém a
 * pede de propósito, para um endereço nomeado, naquela compilação.
 *
 * E o endereço precisa ser de faixa privada. Liberar texto claro para um host
 * público seria outra coisa, com outro nome, e este plugin recusa.
 *
 * Uso:
 *
 *   DIVINO_LAN_NODE_IP=192.168.15.5 pnpm android:dev-client
 */

const NOME_DO_XML = "divino_lan_debug";

/**
 * Faixas privadas da RFC 1918, mais o loopback.
 *
 * `10.0.0.0/8`, `172.16.0.0/12` e `192.168.0.0/16` não são roteáveis na
 * internet. Um endereço fora delas indica outra intenção — e a decisão de
 * expor a Divino a texto claro fora da rede local não é deste plugin.
 */
function ehEnderecoDeRedeLocal(ip) {
  const partes = ip.split(".");
  if (partes.length !== 4) return false;
  const n = partes.map((p) => (/^\d{1,3}$/.test(p) ? Number(p) : -1));
  if (n.some((v) => v < 0 || v > 255)) return false;
  if (n[0] === 127) return true;
  if (n[0] === 10) return true;
  if (n[0] === 172 && n[1] >= 16 && n[1] <= 31) return true;
  if (n[0] === 192 && n[1] === 168) return true;
  return false;
}

module.exports = function withLanCleartextDebug(config) {
  return withDangerousMod(config, ["android", async (nextConfig) => {
    const ip = (process.env.DIVINO_LAN_NODE_IP ?? "").trim();

    if (ip === "") {
      // Silêncio proposital: a ausência da variável é o estado normal, não um
      // erro. Avisar a cada build treinaria a pessoa a ignorar o aviso.
      return nextConfig;
    }

    if (!ehEnderecoDeRedeLocal(ip)) {
      throw new Error(
        `DIVINO_LAN_NODE_IP=${JSON.stringify(ip)} não é um endereço de rede local.\n` +
          "  Aceito apenas 10.x.x.x, 172.16-31.x.x, 192.168.x.x e 127.x.x.x.\n" +
          "  Texto claro para host público não passa por aqui.",
      );
    }

    const debugDir = path.join(nextConfig.modRequest.platformProjectRoot, "app", "src", "debug");
    const xmlDir = path.join(debugDir, "res", "xml");
    await fs.mkdir(xmlDir, { recursive: true });

    // `cleartextTrafficPermitted` vale só para este domínio. Todo o resto do
    // aplicativo continua sob a regra padrão do Android, que exige TLS.
    await fs.writeFile(
      path.join(xmlDir, `${NOME_DO_XML}.xml`),
      `<?xml version="1.0" encoding="utf-8"?>
<!--
  Gerado por plugins/with-lan-cleartext-debug.js. Não edite à mão: o diretório
  android/ e regenerado por 'expo prebuild'.

  Existe só no source set de debug. O APK de release não contém este arquivo.
  Ver NODE-TRANSPORT-001.
-->
<network-security-config>
  <domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="false">${ip}</domain>
  </domain-config>
</network-security-config>
`,
      "utf8",
    );

    // Manifesto da variante debug. O merge do Gradle o aplica só ao build de
    // depuração; o manifesto principal permanece sem a referência.
    await fs.writeFile(
      path.join(debugDir, "AndroidManifest.xml"),
      `<?xml version="1.0" encoding="utf-8"?>
<!-- Gerado por plugins/with-lan-cleartext-debug.js. Ver NODE-TRANSPORT-001. -->
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools">
  <application
      android:networkSecurityConfig="@xml/${NOME_DO_XML}"
      tools:replace="android:networkSecurityConfig" />
</manifest>
`,
      "utf8",
    );

    console.log(
      `[divino] texto claro liberado para ${ip}, somente no build de debug (NODE-TRANSPORT-001).`,
    );

    return nextConfig;
  }]);
};

// Exportado para teste: e a guarda de seguranca do plugin, e guarda sem teste
// e so uma intencao.
module.exports.ehEnderecoDeRedeLocal = ehEnderecoDeRedeLocal;

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { cores } from "@/constants/palette";
import { haptic } from "@/lib/haptics";
import { lerBirthdayDoKit, lerContaXpub } from "@/shared/account-xpub";
import { SIGNET_NETWORK } from "@/shared/bitcoin-network";
import {
  ensureWatchOnlyWallet,
  importWatchOnlyDescriptors,
  listWatchOnlyUtxos,
  type BitcoinCoreWalletConfig,
} from "@/shared/bitcoin-core-wallet-client";

/**
 * Saldo lido do **nó do próprio usuário**, sem servidor de terceiro.
 *
 * ## O buraco que esta tela fecha
 *
 * `app/dev/signet-watch.tsx` pergunta ao `mempool.space`. Funciona, e é `T4`:
 * quem escolhe o servidor escolhe quem observa as consultas do usuário. O
 * projeto se descreve como descentralizado e o aplicativo pergunta a um
 * terceiro. Esta tela é a primeira em que isso deixa de ser verdade.
 *
 * ## Por que ela pede um xpub em vez de gerar um
 *
 * `app/` é *runtime root* do `guard:lab-boundary`, e a ADR-0001 proíbe a
 * interface de derivar chave. A chave estendida da conta **tem de chegar
 * pronta** — colada pelo usuário hoje, entregue pelo cofre nativo amanhã. É a
 * mesma costura do PSBT aplicada à leitura: a tela monta e revisa, outro
 * produz o material sensível.
 *
 * ## Por que ela não deriva endereço nenhum
 *
 * O `wallet-account-smoke.ts` filtra os UTXOs do nó pelos endereços da conta
 * (`SMOKE-MULTICONTA-001`), e isso exigiria derivar. Aqui o problema é evitado
 * em vez de resolvido: **uma wallet do Core por conta**, com nome determinístico
 * vindo de um hash do xpub. Se a wallet contém só aquela conta, `listunspent`
 * já **é** a conta.
 *
 * ## O que esta tela NÃO é
 *
 * Não é produção. O RPC do Bitcoin Core **não tem TLS** — a credencial trafega
 * em Basic auth, legível na rede local — e é interface de administrador, não de
 * menor privilégio. Decidido assim para a faixa LAB em `NODE-TRANSPORT-001`;
 * produção exige Tor ou túnel autenticado, e isso continua **não decidido**.
 *
 * A credencial **não é gravada**. Vive em estado de componente e morre com a
 * tela. Gravá-la em `SecureStore` hoje a colocaria dentro do `allowBackup=true`
 * que ainda é achado aberto (`VAULT-BACKUP-001`).
 */

const URL_PADRAO = "http://127.0.0.1:38332";

/**
 * Endereços por ramo. Vinte é o mesmo limite de lacuna que o Blockstream Green
 * usa por padrão, observado em 04/09/2026.
 *
 * A faixa **nunca encolhe**: o Core expande para o keypool e depois recusa
 * reimport menor (`RANGE-SHRINK-001`). `importWatchOnlyDescriptors` já usa o
 * maior entre o pedido e o existente.
 */
const RANGE_END = 19;

function formatSats(value: number): string {
  return `${new Intl.NumberFormat("pt-BR").format(value)} sats`;
}

type Resultado = {
  confirmadoSats: number;
  pendenteSats: number;
  utxosConfirmados: number;
  utxosPendentes: number;
  nomeDaWallet: string;
  origem: string;
};

export default function SignetNodeBalanceScreen() {
  const [xpub, setXpub] = useState("");
  const [nascimento, setNascimento] = useState("");
  const [url, setUrl] = useState(URL_PADRAO);
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "done">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [resultado, setResultado] = useState<Resultado | null>(null);

  async function lerSaldo() {
    haptic.medium();
    setStatus("loading");
    setErrorMessage("");
    setResultado(null);

    try {
      // Validação local primeiro. Uma chave privada colada por engano nunca
      // deve chegar a virar requisição de rede — nem para ser recusada lá.
      const conta = lerContaXpub(xpub);
      const birthday = lerBirthdayDoKit(nascimento);

      if (usuario.trim() === "" || senha === "") {
        throw new Error(
          "Informe usuário e senha do RPC do seu nó.\n" +
            "  Estão no bitcoin.conf, em rpcuser e rpcpassword.\n" +
            "  Nada disso é gravado no aparelho — some quando você sair desta tela.",
        );
      }

      const config: BitcoinCoreWalletConfig = {
        url: url.trim() || URL_PADRAO,
        username: usuario.trim(),
        password: senha,
        walletName: conta.nomeDaWallet,
      };

      await ensureWatchOnlyWallet(config);

      // O checksum e a recusa de descriptor com chave privada acontecem dentro
      // de importWatchOnlyDescriptors, que pergunta ao próprio nó.
      await importWatchOnlyDescriptors(config, {
        receive: conta.descriptorRecebimento,
        change: conta.descriptorTroco,
        birthday,
        rangeEnd: RANGE_END,
      });

      const utxos = await listWatchOnlyUtxos(config);
      const confirmados = utxos.filter((u) => u.confirmed);
      const pendentes = utxos.filter((u) => !u.confirmed);
      const soma = (lista: typeof utxos) => lista.reduce((total, u) => total + u.valueSats, 0);

      // Somado do próprio listunspent, nunca de getbalances: `trusted` inclui
      // troco próprio ainda não confirmado e NÃO quer dizer "confirmado".
      // Ver `SMOKE-TRUSTED-001`.
      setResultado({
        confirmadoSats: soma(confirmados),
        pendenteSats: soma(pendentes),
        utxosConfirmados: confirmados.length,
        utxosPendentes: pendentes.length,
        nomeDaWallet: conta.nomeDaWallet,
        origem: config.url,
      });
      setStatus("done");
      haptic.success();
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Falha desconhecida ao falar com o nó.");
      haptic.error();
    }
  }

  return (
    <ScreenContainer
      edges={["top", "left", "right", "bottom"]}
      containerStyle={styles.tela}
      style={styles.tela}
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.eyebrow}>FERRAMENTA DE TESTE — NÃO É A CARTEIRA FINAL</Text>
          <Text style={styles.title}>Saldo pelo meu nó {SIGNET_NETWORK.label}</Text>
        </View>

        <View style={styles.noticeCard}>
          <MaterialIcons name="hub" size={20} color={cores.rede} />
          <View style={styles.flex}>
            <Text style={styles.noticeTitleRede}>Nenhum servidor de terceiro</Text>
            <Text style={styles.noticeText}>
              Esta tela pergunta ao Bitcoin Core que roda no seu computador, e a mais ninguém. A chave
              estendida é <Text style={styles.forte}>pública</Text>: observa saldo, não gasta nada.
            </Text>
          </View>
        </View>

        <View style={styles.perigoCard}>
          <MaterialIcons name="warning" size={20} color={cores.perigo} />
          <View style={styles.flex}>
            <Text style={styles.noticeTitlePerigo}>Só na sua rede local</Text>
            <Text style={styles.noticeText}>
              O RPC do Bitcoin Core não tem TLS: a senha trafega legível na rede. Aceitável em
              laboratório, na sua casa. Não use fora dela. A credencial não é gravada no aparelho.
            </Text>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>CHAVE ESTENDIDA PÚBLICA DA CONTA</Text>
          <TextInput
            value={xpub}
            onChangeText={setXpub}
            placeholder="tpub..."
            placeholderTextColor={cores.textoTerciario}
            autoCapitalize="none"
            autoCorrect={false}
            multiline
            style={[styles.input, styles.inputAlto]}
          />
          <Text style={styles.hint}>PARTE 2 do Recovery Kit (MAPA). Nunca as palavras.</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>NASCIMENTO DA CARTEIRA</Text>
          <TextInput
            value={nascimento}
            onChangeText={setNascimento}
            placeholder="AAAA-MM-DD"
            placeholderTextColor={cores.textoTerciario}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />
          <Text style={styles.hint}>
            Também na PARTE 2. O nó só procura a partir desta data — data tarde demais esconde fundos.
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>ENDEREÇO DO NÓ</Text>
          <TextInput
            value={url}
            onChangeText={setUrl}
            placeholder={URL_PADRAO}
            placeholderTextColor={cores.textoTerciario}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={styles.input}
          />
          <Text style={styles.hint}>
            Do celular, 127.0.0.1 é o próprio celular — e não há nó nenhum aqui. Use o IP do
            computador onde o bitcoind roda, na rede local.
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>USUÁRIO RPC</Text>
          <TextInput
            value={usuario}
            onChangeText={setUsuario}
            placeholder="rpcuser do bitcoin.conf"
            placeholderTextColor={cores.textoTerciario}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>SENHA RPC</Text>
          <View style={styles.senhaLinha}>
            <TextInput
              value={senha}
              onChangeText={setSenha}
              placeholder="rpcpassword do bitcoin.conf"
              placeholderTextColor={cores.textoTerciario}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry={!senhaVisivel}
              style={[styles.input, styles.senhaCampo]}
            />
            {/*
              Sem isto, o usuário digita às cegas e um caractere comido pelo
              teclado é indistinguível de senha errada: os dois dão HTTP 401.
              Observado no aparelho do proprietário durante uma restauração no
              Blockstream Green, 03/09/2026.

              Mostrar é escolha explícita, começa desligado, e some ao sair da
              tela junto com a própria senha.
            */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={senhaVisivel ? "Esconder a senha" : "Mostrar a senha"}
              onPress={() => {
                haptic.light();
                setSenhaVisivel((v) => !v);
              }}
              android_ripple={{ color: cores.borda, borderless: true }}
              style={styles.senhaBotao}
            >
              <MaterialIcons
                name={senhaVisivel ? "visibility-off" : "visibility"}
                size={22}
                color={cores.textoSecundario}
              />
            </Pressable>
          </View>
          <Text style={styles.hint}>
            {senha.length === 0
              ? "Digitada por sessão. Não é gravada em lugar nenhum."
              : `${senha.length} caracteres digitados. Não é gravada em lugar nenhum.`}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => void lerSaldo()}
          disabled={status === "loading"}
          android_ripple={{ color: cores.ondulacaoEscura }}
          style={[styles.button, status === "loading" && styles.buttonDisabled]}
        >
          {status === "loading" ? (
            <ActivityIndicator color={cores.acaoPrimariaTexto} />
          ) : (
            <Text style={styles.buttonText}>Ler saldo pelo meu nó</Text>
          )}
        </Pressable>

        {status === "loading" && (
          <Text style={styles.hint}>
            A primeira leitura de uma conta pode demorar: o nó precisa varrer a cadeia desde o
            nascimento informado.
          </Text>
        )}

        {status === "error" && (
          <View style={styles.errorCard}>
            <MaterialIcons name="error-outline" size={18} color={cores.perigo} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {status === "done" && resultado && (
          <View style={styles.resultCard}>
            <Text style={styles.resultLabel}>Confirmado</Text>
            <Text style={styles.resultBalance}>{formatSats(resultado.confirmadoSats)}</Text>
            {resultado.pendenteSats !== 0 && (
              <Text style={styles.resultMempool}>
                +{formatSats(resultado.pendenteSats)} ainda não confirmado
              </Text>
            )}
            <View style={styles.resultDivider} />
            <View style={styles.resultRow}>
              <Text style={styles.resultRowLabel}>UTXOs confirmados</Text>
              <Text style={styles.resultRowValue}>{resultado.utxosConfirmados}</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultRowLabel}>UTXOs pendentes</Text>
              <Text style={styles.resultRowValue}>{resultado.utxosPendentes}</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultRowLabel}>Endereços observados</Text>
              <Text style={styles.resultRowValue}>{(RANGE_END + 1) * 2}</Text>
            </View>
            <Text style={styles.resultSource}>Fonte: {resultado.origem}</Text>
            <Text style={styles.resultSource}>Wallet no nó: {resultado.nomeDaWallet}</Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  tela: { backgroundColor: cores.fundo },
  content: { gap: 16, padding: 20, paddingBottom: 32 },
  header: { gap: 4, marginTop: 4 },
  eyebrow: { color: cores.aviso, fontSize: 11, fontWeight: "800", letterSpacing: 0.8 },
  title: { color: cores.textoPrimario, fontSize: 24, fontWeight: "700", letterSpacing: -0.4, marginTop: 4 },
  flex: { flex: 1 },
  forte: { color: cores.textoPrimario, fontWeight: "800" },
  noticeCard: { alignItems: "flex-start", backgroundColor: cores.superficie, borderRadius: 16, flexDirection: "row", gap: 12, padding: 15 },
  perigoCard: { alignItems: "flex-start", backgroundColor: cores.perigoSuperficie, borderRadius: 16, flexDirection: "row", gap: 12, padding: 15 },
  noticeTitleRede: { color: cores.rede, fontSize: 13, fontWeight: "800", marginBottom: 4 },
  noticeTitlePerigo: { color: cores.perigo, fontSize: 13, fontWeight: "800", marginBottom: 4 },
  noticeText: { color: cores.textoSecundario, fontSize: 12, lineHeight: 17 },
  inputGroup: { gap: 6 },
  label: { color: cores.textoSecundario, fontSize: 11, fontWeight: "800", letterSpacing: 0.6 },
  hint: { color: cores.textoTerciario, fontSize: 11, lineHeight: 15 },
  input: {
    backgroundColor: cores.superficieAlta, borderColor: cores.borda, borderRadius: 14, borderWidth: 1,
    color: cores.textoPrimario, fontSize: 15, paddingHorizontal: 14, paddingVertical: 13,
  },
  inputAlto: { minHeight: 84, textAlignVertical: "top" },
  senhaLinha: { alignItems: "center", flexDirection: "row", gap: 8 },
  senhaCampo: { flex: 1 },
  senhaBotao: { alignItems: "center", height: 48, justifyContent: "center", width: 48 },
  button: { alignItems: "center", backgroundColor: cores.acaoPrimaria, borderRadius: 14, justifyContent: "center", minHeight: 52 },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: cores.acaoPrimariaTexto, fontSize: 15, fontWeight: "700" },
  errorCard: { alignItems: "flex-start", backgroundColor: cores.perigoSuperficie, borderRadius: 14, flexDirection: "row", gap: 10, padding: 14 },
  errorText: { color: cores.perigo, flex: 1, fontSize: 13, lineHeight: 18 },
  resultCard: { backgroundColor: cores.superficie, borderRadius: 20, gap: 4, padding: 20 },
  resultLabel: { color: cores.textoSecundario, fontSize: 13, fontWeight: "600" },
  resultBalance: { color: cores.textoPrimario, fontSize: 30, fontVariant: ["tabular-nums"], fontWeight: "800", letterSpacing: -0.8, marginTop: 6 },
  resultMempool: { color: cores.rede, fontSize: 13, fontWeight: "600", marginTop: 4 },
  resultDivider: { backgroundColor: cores.borda, height: StyleSheet.hairlineWidth, marginVertical: 12 },
  resultRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  resultRowLabel: { color: cores.textoSecundario, fontSize: 13 },
  resultRowValue: { color: cores.textoPrimario, fontSize: 13, fontVariant: ["tabular-nums"], fontWeight: "700" },
  resultSource: { color: cores.textoTerciario, fontSize: 10, marginTop: 8 },
});

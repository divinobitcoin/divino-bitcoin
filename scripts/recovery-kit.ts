/**
 * Gera o RECOVERY KIT da conta de laboratório.
 *
 * ## Por que este script existe
 *
 * "Guarde suas 12 palavras" é insuficiente e sempre foi. Uma seed sozinha não
 * diz em que rede a conta vive, que tipo de script usa, que caminho de
 * derivação foi escolhido, nem a partir de que altura vale procurar. Sem isso,
 * uma ferramenta de fora até importa a seed — e mostra saldo zero, porque
 * derivou outro lugar. O usuário conclui que perdeu o dinheiro.
 *
 * O Recovery Kit é o conjunto mínimo que permite a **outra pessoa, em outro
 * software, sem nada da Divino**, reconstruir a carteira e achar os fundos.
 *
 * ## O que ele serve para provar (`INTEROP-01`)
 *
 * O `wallet-account-smoke.ts` já provou que o **Bitcoin Core** encontra a
 * conta a partir dos descriptors. Isso é uma implementação. O kit existe para
 * fazer a segunda: pegar só o que está impresso aqui, levar ao Sparrow ou ao
 * Electrum, e conferir se aparecem os mesmos UTXOs.
 *
 * Duas implementações independentes concordando é evidência. Uma só é
 * autoconfirmação.
 *
 * ## O que ele NÃO é
 *
 * Não é o kit do produto. Ver `KIT-MNEMONIC-001` no rodapé da saída: a
 * ferramenta de laboratório trabalha com entropia hex, não com mnemonic
 * BIP-39, e o kit do produto terá de ser testado com mnemonic. O que este
 * script prova sobre derivação, descriptors e descoberta vale; o que ele
 * prova sobre o formato final do backup do usuário, não.
 *
 * Uso:
 *
 *   DIVINO_LAB_SEED=<hex> npx tsx scripts/recovery-kit.ts
 *   DIVINO_LAB_SEED=<hex> npx tsx scripts/recovery-kit.ts --com-chave-privada
 *
 * Sem a flag, o kit é **só material público**: dá para observar, não para
 * gastar. Com a flag, imprime também a chave privada estendida da raiz, que
 * gasta tudo — é o que permite testar recuperação completa no Sparrow, e é
 * material que só pode existir em seed descartável de laboratório.
 *
 * Variáveis (todas opcionais):
 *
 *   DIVINO_CORE_RPC_URL    http://127.0.0.1:38332
 *   DIVINO_CORE_RPC_USER   (ou cookie; ver bitcoin-core-rpc-env.ts)
 *   DIVINO_CORE_RPC_PASSWORD
 *   DIVINO_CORE_RANGE      9   (endereços por ramo, 0-indexado)
 *   DIVINO_KIT_BIRTHDAY    altura de bloco ou data YYYY-MM-DD do primeiro uso
 */

import {
  getDescriptorInfo,
  type BitcoinCoreWalletConfig,
} from "../shared/bitcoin-core-wallet-client";
import { accountDescriptors, deriveLabAccount } from "./lab-account-derivation";
import { resolveBitcoinCoreRpcCredentials } from "./bitcoin-core-rpc-env";

function fail(message: string): never {
  console.error(`\nERRO: ${message}\n`);
  process.exit(1);
}

function linha(rotulo: string, valor: string): string {
  return `${rotulo.padEnd(26)}${valor}`;
}

async function main() {
  const comChavePrivada = process.argv.includes("--com-chave-privada");

  const seed = process.env.DIVINO_LAB_SEED;
  if (!seed) {
    fail(
      "DIVINO_LAB_SEED não está definida.\n" +
        "  Gere uma com: npx tsx scripts/lab-signet-flow.ts new-seed",
    );
  }

  const rangeEnd = Number(process.env.DIVINO_CORE_RANGE ?? 9);
  if (!Number.isInteger(rangeEnd) || rangeEnd < 0) fail("DIVINO_CORE_RANGE precisa ser inteiro >= 0.");

  let account;
  try {
    account = deriveLabAccount(seed, rangeEnd, { incluirChavePrivada: comChavePrivada });
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }

  const descriptors = accountDescriptors(account);

  // O checksum vem do nó, não de aritmética escrita aqui. Além de ser o valor
  // que o Core exige em `importdescriptors`, pedir a ele é uma validação de
  // graça: um descriptor malformado é recusado agora, na geração do kit, e não
  // no dia da recuperação.
  let checksums: { receive: string; change: string } | null = null;
  let avisoNo: string | null = null;
  try {
    const { username, password } = resolveBitcoinCoreRpcCredentials();
    const config: BitcoinCoreWalletConfig = {
      url: process.env.DIVINO_CORE_RPC_URL ?? "http://127.0.0.1:38332",
      username,
      password,
      walletName: "",
    };
    const [r, c] = await Promise.all([
      getDescriptorInfo(config, descriptors.receive),
      getDescriptorInfo(config, descriptors.change),
    ]);
    if (r.hasPrivateKeys || c.hasPrivateKeys) {
      fail(
        "O nó diz que um dos descriptors do kit tem chave privada. Isso não deveria " +
          "acontecer: o kit público é construído a partir do xpub da conta. Pare e investigue.",
      );
    }
    checksums = { receive: r.checksum, change: c.checksum };
  } catch (error) {
    avisoNo = error instanceof Error ? error.message : String(error);
  }

  const birthday = process.env.DIVINO_KIT_BIRTHDAY ?? null;

  console.log("\n============================================================");
  console.log("  RECOVERY KIT — conta de LABORATÓRIO (Signet, valor zero)");
  console.log("============================================================\n");

  console.log("IDENTIFICAÇÃO DA CONTA");
  console.log(linha("  Rede", "Signet (família testnet)"));
  console.log(linha("  Tipo de script", "P2WPKH nativo (SegWit v0) — BIP-84"));
  console.log(linha("  Caminho de derivação", account.accountPath));
  console.log(linha("  Índice da conta", "0"));
  console.log(linha("  Fingerprint da mestra", account.masterFingerprint));
  console.log();

  console.log("CHAVE ESTENDIDA PÚBLICA DA CONTA (observa, não gasta)");
  console.log(`  ${account.accountXpub}`);
  console.log();

  console.log("DESCRIPTORS DE SAÍDA (com origem — é a forma que se leva para fora)");
  console.log(`  recebimento:  ${descriptors.receive}${checksums ? `#${checksums.receive}` : ""}`);
  console.log(`  troco:        ${descriptors.change}${checksums ? `#${checksums.change}` : ""}`);
  if (!checksums) {
    console.log();
    console.log("  AVISO: o checksum não pôde ser obtido — o nó não respondeu.");
    console.log(`  Motivo: ${avisoNo}`);
    console.log("  Sparrow e Electrum aceitam sem checksum. `importdescriptors` do");
    console.log("  Bitcoin Core NÃO aceita: rode com o nó no ar para gerar o kit completo.");
  }
  console.log();

  console.log("PRIMEIROS ENDEREÇOS (para conferir que a outra ferramenta derivou igual)");
  for (const i of [0, 1, 2]) {
    console.log(linha(`  ${account.accountPath}/0/${i}`, account.enderecos.recebimento[i] ?? "—"));
  }
  for (const i of [0, 1]) {
    console.log(linha(`  ${account.accountPath}/1/${i}`, account.enderecos.troco[i] ?? "—"));
  }
  console.log();

  console.log("NASCIMENTO DA CARTEIRA (birthday)");
  if (birthday) {
    console.log(linha("  Declarado", birthday));
  } else {
    console.log("  NÃO DECLARADO. Sem isso, a ferramenta de recuperação varre a cadeia");
    console.log("  inteira — lento, e em nó podado pode simplesmente não encontrar.");
    console.log("  Declare com DIVINO_KIT_BIRTHDAY=<altura ou YYYY-MM-DD>.");
    console.log("  Use uma data ANTERIOR ao primeiro recebimento. Errar para trás custa");
    console.log("  tempo de varredura; errar para frente esconde fundos.");
  }
  console.log();

  console.log("PASSPHRASE BIP-39");
  console.log("  Não usada nesta conta de laboratório.");
  console.log("  Se um dia houver, ela é parte do segredo e NÃO deve ser guardada");
  console.log("  junto com o resto do kit — guardá-las juntas anula a razão de existir.");
  console.log();

  if (comChavePrivada) {
    console.log("------------------------------------------------------------");
    console.log("CHAVE PRIVADA ESTENDIDA DA RAIZ — GASTA TUDO NESTA CONTA");
    console.log("------------------------------------------------------------");
    console.log(`  ${account.masterTprv ?? "(não produzida)"}`);
    console.log();
    console.log("  Isto só é aceitável porque a seed é de laboratório, a rede é Signet");
    console.log("  e o valor econômico é zero (LAB-LANE-001, L1/L2/L3). Está agora no");
    console.log("  histórico do seu terminal. Uma chave real jamais deveria passar por aqui.");
    console.log();
  }

  console.log("COMO RECUPERAR SEM NADA DA DIVINO");
  console.log("  (rótulos conferidos na documentação do Sparrow em 01/09/2026;");
  console.log("   interface muda, então procure a opção pelo sentido, não pelo texto exato)");
  console.log();
  console.log("  Sparrow — rede e servidor, antes de tudo:");
  console.log("    inicie com `-n signet`, ou Tools > Restart In > Signet.");
  console.log("    Preferences > Server > Bitcoin Core: em localhost ele lê sozinho o");
  console.log("    cookie do datadir. Test Connection antes de seguir.");
  console.log();
  console.log("  Sparrow — observação (é este o teste do INTEROP-01):");
  console.log("    File > New Wallet > nome > Policy Type: Single Signature,");
  console.log("    Script Type: Native SegWit (P2WPKH) >");
  console.log("    Keystore: \"xPub / Watch Only Wallet\" > cole a chave estendida");
  console.log("    pública, a fingerprint da mestra e o derivation path acima.");
  console.log();
  if (comChavePrivada) {
    console.log("  Recuperação COM poder de gasto:");
    console.log("    NÃO confirmado que o Sparrow importe tprv. A importação de software");
    console.log("    wallet dele oferece mnemonic BIP-39 ou seed do Electrum; o pedido de");
    console.log("    importar chave estendida é a issue #58, fechada sem que a");
    console.log("    documentação registre a funcionalidade. Verificar antes de tentar.");
    console.log("    Caminho que aceita chave estendida: Electrum em modo testnet.");
    console.log();
  }
  console.log("  Bitcoin Core (segunda opinião pelo próprio nó):");
  console.log("    bitcoin-cli -signet createwallet \"recuperacao-teste\" true true \"\" false true");
  console.log("    bitcoin-cli -signet -rpcwallet=recuperacao-teste importdescriptors '[...]'");
  console.log("    usando os descriptors COM checksum impressos acima.");
  console.log();
  console.log("  Electrum: aceita a chave estendida ou o descriptor, em modo testnet.");
  console.log();

  console.log("O QUE ESTE KIT NÃO PROVA");
  console.log("  - Nada sobre Mainnet, cofre nativo, iOS ou a interface.");
  console.log("  - KIT-MNEMONIC-001: a conta de laboratório nasce de entropia hex, não de");
  console.log("    mnemonic BIP-39. Recuperar por tprv exercita a derivação e os");
  console.log("    descriptors, mas NÃO exercita o formato que o usuário final vai");
  console.log("    guardar. Uma conta nascida de mnemonic precisa passar pelo mesmo");
  console.log("    teste antes de qualquer promessa pública de recuperabilidade.");
  console.log("  - Não substitui auditoria externa.");
  console.log();
}

main().catch((error) => {
  fail(error instanceof Error ? (error.stack ?? error.message) : String(error));
});

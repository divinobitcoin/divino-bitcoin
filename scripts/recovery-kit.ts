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
 * ## As duas metades, e por que elas são impressas separadas
 *
 * O kit tem material com **regras de manuseio opostas**, e misturá-los faz o
 * mais frágil vencer:
 *
 * - **SEGREDO** — palavras, seed, chave privada. Recupera o dinheiro, e por
 *   isso também o entrega a quem o tiver. Papel ou aço, transcrito à mão pelo
 *   dono. Nunca foto, nunca nuvem, nunca outro aparelho.
 * - **MAPA DE RECUPERAÇÃO** — rede, caminho, fingerprint, xpub, descriptors,
 *   birthday. Não gasta nada. Pode ser copiado, impresso, guardado em três
 *   lugares e enviado por e-mail sem consequência.
 *
 * Enquanto os dois vinham num bloco só, o bloco inteiro herdava as regras do
 * segredo — e o resultado prático é que o mapa **não é guardado**. Aí a pessoa
 * tem as palavras e não tem onde procurar: importa em qualquer carteira, vê
 * saldo zero porque derivou outro caminho, e conclui que perdeu o dinheiro.
 *
 * Separar não é organização; é fazer com que a metade pública seja tratada
 * como pública, que é a única maneira de ela sobreviver.
 *
 * ## As palavras (`KIT-MNEMONIC-001`)
 *
 * Se `DIVINO_LAB_MNEMONIC` estiver definida, o kit **prova** que aquelas
 * palavras derivam a seed em uso antes de imprimi-las, e recusa gerar se não
 * derivarem. Sem essa prova o kit estaria afirmando recuperabilidade por
 * suposição — e a falha apareceria no dia da recuperação, que é o pior dia
 * possível para descobrir.
 *
 * Se não estiver definida, o kit diz em letras grandes que a conta **não tem
 * palavras** e não é recuperável em carteira de celular. Isso não é ressalva
 * de rodapé: é a diferença entre um backup que funciona no telefone do dono e
 * um que exige um PC com Node instalado.
 *
 * Uso:
 *
 *   npx tsx scripts/recovery-kit.ts
 *   npx tsx scripts/recovery-kit.ts --com-chave-privada
 *   npx tsx scripts/recovery-kit.ts --somente-mapa      (nada de segredo na saída)
 *   npx tsx scripts/recovery-kit.ts --somente-segredo   (só o que se transcreve)
 *
 * Sem `--com-chave-privada`, o kit não imprime a chave estendida privada. Com
 * ela, imprime — gasta tudo, e só pode existir em seed descartável.
 *
 * Variáveis:
 *
 *   DIVINO_LAB_SEED        obrigatória, hex
 *   DIVINO_LAB_MNEMONIC    opcional; as palavras que produzem essa seed
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
import {
  confirmarQueOMnemonicProduzASeed,
  lerMnemonicDoAmbiente,
  type LabMnemonic,
} from "./lab-mnemonic";

function fail(message: string): never {
  console.error(`\nERRO: ${message}\n`);
  process.exit(1);
}

function linha(rotulo: string, valor: string): string {
  return `${rotulo.padEnd(26)}${valor}`;
}

async function main() {
  const comChavePrivada = process.argv.includes("--com-chave-privada");
  const somenteSegredo = process.argv.includes("--somente-segredo");
  const somenteMapa = process.argv.includes("--somente-mapa");

  if (somenteSegredo && somenteMapa) {
    fail("--somente-segredo e --somente-mapa se excluem. Sem nenhuma das duas, o kit sai inteiro.");
  }
  if (somenteMapa && comChavePrivada) {
    fail(
      "--somente-mapa com --com-chave-privada é contradição.\n" +
        "  O mapa existe justamente para poder ser copiado sem risco; uma chave\n" +
        "  privada dentro dele destrói essa propriedade.",
    );
  }

  const mostraSegredo = !somenteMapa;
  const mostraMapa = !somenteSegredo;

  const seed = process.env.DIVINO_LAB_SEED;
  if (!seed) {
    fail(
      "DIVINO_LAB_SEED não está definida.\n" +
        "  Gere uma com: npx tsx scripts/lab-signet-flow.ts new-seed",
    );
  }

  // As palavras, se houver. A verificação acontece ANTES de qualquer impressão:
  // um kit que descreve uma conta e abre outra é pior que kit nenhum, porque
  // parece completo. `KIT-MNEMONIC-001`.
  let mnemonic: LabMnemonic | null = null;
  const mnemonicBruta = process.env.DIVINO_LAB_MNEMONIC;
  if (mnemonicBruta && mnemonicBruta.trim() !== "") {
    try {
      mnemonic = lerMnemonicDoAmbiente(mnemonicBruta);
      confirmarQueOMnemonicProduzASeed(mnemonic, seed);
    } catch (error) {
      fail(error instanceof Error ? error.message : String(error));
    }
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

  const P = console.log;

  // ---------------------------------------------------------------------
  // PARTE 1 — SEGREDO
  // ---------------------------------------------------------------------
  if (mostraSegredo) {
    P("\n############################################################");
    P("#  PARTE 1 de 2 — SEGREDO                                  #");
    P("#  Recupera o dinheiro. Também o entrega a quem tiver.     #");
    P("#  Papel ou aço, transcrito à mão. Nunca foto, nuvem       #");
    P("#  ou outro aparelho.                                      #");
    P("############################################################\n");

    P("PALAVRAS DE RECUPERAÇÃO (BIP-39)");
    if (mnemonic) {
      P(linha("  Quantidade", `${mnemonic.quantidade} palavras`));
      P(linha("  Lista de palavras", mnemonic.idiomaDaLista));
      P();
      const palavras = mnemonic.palavras.split(" ");
      for (let i = 0; i < palavras.length; i += 4) {
        P(
          "  " +
            palavras
              .slice(i, i + 4)
              .map((palavra, j) => `${String(i + j + 1).padStart(2)}. ${palavra.padEnd(10)}`)
              .join(""),
        );
      }
      P();
      P("  A ORDEM FAZ PARTE DO SEGREDO. Fora de ordem, o checksum reprova —");
      P("  e duas palavras trocadas entre si podem passar no checksum e abrir");
      P("  uma carteira diferente, vazia, sem nenhum aviso.");
      P("  A LISTA TAMBÉM FAZ PARTE DO SEGREDO: as mesmas palavras noutro");
      P("  idioma são outra carteira. Anote o idioma junto das palavras.");
      P();
      P("  VERIFICADO NA GERAÇÃO: estas palavras derivam exatamente a seed");
      P("  desta conta. Não é promessa — foi conferido agora (KIT-MNEMONIC-001).");
    } else {
      P();
      P("  *** ESTA CONTA NÃO TEM PALAVRAS ***");
      P();
      P("  Ela nasceu de entropia hexadecimal crua, não de mnemonic BIP-39.");
      P("  Consequência prática: NÃO É RECUPERÁVEL EM CARTEIRA DE CELULAR.");
      P("  Verificado no Zeus em 01/09/2026: ele pede 12 ou 24 palavras e não");
      P("  tem campo para hexadecimal. As demais ainda não foram examinadas —");
      P("  mas palavras é o formato que o ecossistema móvel usa.");
      P("  A recuperação depende de um PC com este repositório, ou do tprv");
      P("  (só sai com --com-chave-privada) em Electrum. Nada disso é backup");
      P("  de carteira de celular.");
      P();
      P("  Para gerar uma conta com palavras:");
      P("    npx tsx scripts/lab-signet-flow.ts new-seed");
      P();
      P("  Se esta conta JÁ tem palavras e você só não as exportou, defina");
      P("  DIVINO_LAB_MNEMONIC e gere o kit de novo — o script confere se elas");
      P("  batem com a seed antes de imprimir, e recusa se não baterem.");
      P();
      P("  KIT-MNEMONIC-001");
    }
    P();

    // `KIT-SEED-HEX-001`. A seed hex é o que as ferramentas DESTE repositório
    // pedem em `DIVINO_LAB_SEED`. Sem ela, o kit recuperava a conta no Sparrow
    // e no Electrum, mas não no próprio laboratório que a criou — e foi
    // preciso completar o arquivo à mão com `echo` em 02/09.
    P("SEED (hex) — é o que as ferramentas deste repositório pedem");
    P(`  ${seed.trim().toLowerCase()}`);
    P();
    P("  Derivada das palavras pelo BIP-39 quando há palavras. Guardar as duas");
    P("  não duplica o segredo: é o mesmo segredo em dois formatos, um para");
    P("  humano transcrever, outro para ferramenta de linha de comando ler.");
    P("  Retomar a conta aqui:");
    P(`    export DIVINO_LAB_SEED=${seed.trim().toLowerCase()}`);
    if (mnemonic) P(`    export DIVINO_LAB_MNEMONIC="${mnemonic.palavras}"`);
    P();

    P("PASSPHRASE BIP-39");
    P("  Não usada nesta conta.");
    P("  Se um dia houver, ela é parte do segredo e NÃO deve ser guardada junto");
    P("  com as palavras — guardá-las juntas anula a razão de existir.");
    P("  E não existe \"passphrase errada\": qualquer texto abre uma carteira");
    P("  válida e vazia, sem dizer que está errado.");
    P();

    if (comChavePrivada) {
      P("CHAVE PRIVADA ESTENDIDA DA RAIZ — GASTA TUDO NESTA CONTA");
      P(`  ${account.masterTprv ?? "(não produzida)"}`);
      P();
      P("  Só é aceitável porque a seed é de laboratório, a rede é Signet e o");
      P("  valor econômico é zero (LAB-LANE-001, L1/L2/L3). Está agora no");
      P("  histórico do seu terminal. Uma chave real jamais passaria por aqui.");
      P();
    }
  }

  // ---------------------------------------------------------------------
  // PARTE 2 — MAPA DE RECUPERAÇÃO
  // ---------------------------------------------------------------------
  if (mostraMapa) {
    P("\n============================================================");
    P("  PARTE 2 de 2 — MAPA DE RECUPERAÇÃO");
    P("  Não gasta nada. Copie, imprima, guarde em três lugares.");
    P("  Sem ele, as palavras sozinhas encontram uma carteira vazia.");
    P("============================================================\n");

    P("IDENTIFICAÇÃO DA CONTA");
    P(linha("  Rede", "Signet (família testnet)"));
    P(linha("  Tipo de script", "P2WPKH nativo (SegWit v0) — BIP-84"));
    P(linha("  Caminho de derivação", account.accountPath));
    P(linha("  Índice da conta", "0"));
    P(linha("  Fingerprint da mestra", account.masterFingerprint));
    P();

    P("CHAVE ESTENDIDA PÚBLICA DA CONTA (observa, não gasta)");
    P(`  ${account.accountXpub}`);
    P();

    P("DESCRIPTORS DE SAÍDA (com origem — é a forma que se leva para fora)");
    P(`  recebimento:  ${descriptors.receive}${checksums ? `#${checksums.receive}` : ""}`);
    P(`  troco:        ${descriptors.change}${checksums ? `#${checksums.change}` : ""}`);
    if (!checksums) {
      P();
      P("  AVISO: o checksum não pôde ser obtido — o nó não respondeu.");
      P(`  Motivo: ${avisoNo}`);
      P("  Sparrow e Electrum aceitam sem checksum. `importdescriptors` do");
      P("  Bitcoin Core NÃO aceita: rode com o nó no ar para gerar o kit completo.");
    }
    P();

    P("PRIMEIROS ENDEREÇOS (para conferir que a outra ferramenta derivou igual)");
    for (const i of [0, 1, 2]) {
      P(linha(`  ${account.accountPath}/0/${i}`, account.enderecos.recebimento[i] ?? "—"));
    }
    for (const i of [0, 1]) {
      P(linha(`  ${account.accountPath}/1/${i}`, account.enderecos.troco[i] ?? "—"));
    }
    P();

    P("NASCIMENTO DA CARTEIRA (birthday)");
    if (birthday) {
      P(linha("  Declarado", birthday));
    } else {
      P("  NÃO DECLARADO. Sem isso, a ferramenta de recuperação varre a cadeia");
      P("  inteira — lento, e em nó podado pode simplesmente não encontrar.");
      P("  Declare com DIVINO_KIT_BIRTHDAY=<altura ou YYYY-MM-DD>.");
      P("  Use uma data ANTERIOR ao primeiro recebimento. Errar para trás custa");
      P("  tempo de varredura; errar para frente esconde fundos.");
    }
    P();

    P("COMO RECUPERAR SEM NADA DA DIVINO");
    P("  (rótulos conferidos na documentação do Sparrow em 01/09/2026;");
    P("   interface muda, então procure a opção pelo sentido, não pelo texto exato)");
    P();
    if (mnemonic) {
      P("  Carteira de celular (é este o caminho que o usuário final vai usar):");
      P("    procure \"restaurar\" / \"importar\" / \"recuperar carteira\" e as 12 palavras.");
      P("    ANTES de colar, ache a opção de REDE e escolha Signet ou testnet —");
      P("    em rede errada as palavras certas mostram saldo zero.");
      P("    Se a carteira permitir, confira o derivation path e a fingerprint");
      P("    acima. Se não permitir, compare o primeiro endereço com o do mapa.");
      P("    Nem toda carteira de celular oferece Signet. Ver o levantamento de");
      P("    compatibilidade antes de concluir que o kit falhou.");
      P();
    }
    P("  Sparrow — rede e servidor, antes de tudo:");
    P("    inicie com `-n signet`, ou Tools > Restart In > Signet.");
    P("    Preferences > Server > Bitcoin Core: em localhost ele lê sozinho o");
    P("    cookie do datadir. Test Connection antes de seguir.");
    P();
    P("  Sparrow — observação (é este o teste do INTEROP-01):");
    P("    File > New Wallet > nome > Policy Type: Single Signature,");
    P("    Script Type: Native SegWit (P2WPKH) >");
    P("    Keystore: \"xPub / Watch Only Wallet\" > cole a chave estendida");
    P("    pública, a fingerprint da mestra e o derivation path acima.");
    P();
    if (comChavePrivada) {
      P("  Recuperação COM poder de gasto:");
      P("    NÃO confirmado que o Sparrow importe tprv. A importação de software");
      P("    wallet dele oferece mnemonic BIP-39 ou seed do Electrum; o pedido de");
      P("    importar chave estendida é a issue #58, fechada sem que a");
      P("    documentação registre a funcionalidade. Verificar antes de tentar.");
      P("    Caminho que aceita chave estendida: Electrum em modo testnet.");
      P();
    }
    P("  Bitcoin Core (segunda opinião pelo próprio nó):");
    P("    bitcoin-cli -signet createwallet \"recuperacao-teste\" true true \"\" false true");
    P("    bitcoin-cli -signet -rpcwallet=recuperacao-teste importdescriptors '[...]'");
    P("    usando os descriptors COM checksum impressos acima.");
    P();
    P("  Electrum: aceita a chave estendida ou o descriptor, em modo testnet.");
    P();

    P("O QUE ESTE KIT NÃO PROVA");
    P("  - Nada sobre Mainnet, cofre nativo, iOS ou a interface.");
    P("  - Que alguma carteira de celular aceita este material. As palavras");
    P("    existem e foram verificadas contra a seed; que o Zeus, a BlueWallet");
    P("    ou qualquer outra as importe EM SIGNET é outra afirmação, e ainda");
    P("    não foi exercitada.");
    if (!mnemonic) {
      P("  - KIT-MNEMONIC-001: esta conta não tem palavras. O kit exercita");
      P("    derivação e descriptors, não o formato que o usuário final guarda.");
    }
    P("  - Não substitui auditoria externa.");
    P();
  }
}

main().catch((error) => {
  fail(error instanceof Error ? (error.stack ?? error.message) : String(error));
});

/**
 * Caminho de MNEMONIC BIP-39 para as ferramentas de laboratório.
 *
 * ## Por que este arquivo existe
 *
 * **`KIT-MNEMONIC-001`, confirmado em aparelho real em 01/09/2026.** A conta de
 * laboratório nascia de entropia hexadecimal crua. O Recovery Kit gerado a
 * partir dela é **irrecuperável num celular**: o Zeus pede doze palavras e o kit
 * não tem palavras; nenhuma carteira móvel importa 64 caracteres de hex.
 *
 * O ecossistema móvel importa **palavras**. Chave estendida e seed hex são
 * formato de ferramenta de desktop. E a Divino Bitcoin é uma carteira de
 * celular — então o kit dela precisa caber num celular, ou a promessa de
 * recuperação tem um asterisco escondido: *"desde que você tenha um PC"*.
 *
 * ## O que este módulo NÃO muda
 *
 * `DIVINO_LAB_SEED` continua aceitando **somente hexadecimal**, e
 * `scripts/lab-signet-flow.ts` continua recusando qualquer coisa com espaços.
 * Essa recusa não é obstáculo: é proteção contra alguém colar um mnemonic
 * **real** numa ferramenta de laboratório. Ela fica.
 *
 * As palavras entram por variável própria, `DIVINO_LAB_MNEMONIC`, e o kit
 * **prova** que elas produzem a mesma conta antes de afirmar qualquer coisa.
 *
 * ## Fronteira
 *
 * Mora em `scripts/`, que não é runtime root do `guard:lab-boundary`. Material
 * descartável, Signet, valor zero (`LAB-LANE-001`, L1/L2/L3).
 */

import { hex } from "@scure/base";
import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from "@scure/bip39";
import { wordlist as englishWordlist } from "@scure/bip39/wordlists/english.js";

/**
 * Idioma da lista de palavras.
 *
 * Fixado em inglês, e isso é decisão, não descuido. O `@scure/bip39` traz
 * português, espanhol, japonês e outros — mas **as palavras de uma lista não
 * funcionam noutra**. Um kit em português só recupera em ferramenta que
 * suporte a lista portuguesa, e a maioria das carteiras só tem inglês.
 *
 * O idioma é parte do segredo: sem saber a lista, as palavras certas não
 * recuperam nada. Por isso ele vai **impresso no kit**, sempre.
 *
 * Ver `KIT-IDIOMA-001` — quando a Divino tiver interface multilíngue, esta
 * decisão precisa ser reexaminada, e a lista escolhida continuará tendo de
 * aparecer no kit.
 */
export const LAB_WORDLIST_NAME = "english (BIP-39)";

export type LabMnemonic = {
  /** As palavras, separadas por um espaço simples. */
  palavras: string;
  /** Quantidade de palavras — 12 ou 24. */
  quantidade: number;
  /** Nome da lista, que precisa ir no kit. */
  idiomaDaLista: string;
  /**
   * Seed derivada das palavras pelo BIP-39, em hex.
   *
   * São **64 bytes / 128 caracteres**, não 32 — o BIP-39 passa as palavras por
   * PBKDF2 e produz sempre 512 bits, independente de serem 12 ou 24 palavras.
   * A seed hex antiga do laboratório tinha 32 bytes porque vinha de
   * `randomBytes(32)` direto. As duas funcionam no `HDKey.fromMasterSeed`.
   */
  seedHex: string;
};

/**
 * Gera um mnemonic descartável de laboratório e a seed correspondente.
 *
 * Sem passphrase, de propósito. A ADR-0001 já decidiu que a versão 1 não usa
 * passphrase BIP-39, e a pesquisa de 02/09 reforçou o motivo: **não existe
 * "passphrase errada"**. Qualquer texto produz uma seed válida — um espaço a
 * mais, um acento, uma normalização Unicode diferente, e abre-se outra carteira
 * perfeitamente funcional e completamente vazia. O usuário conclui que perdeu o
 * dinheiro, e não tem como saber que só errou a senha.
 */
export function gerarMnemonicDeLaboratorio(quantidade: 12 | 24 = 12): LabMnemonic {
  const bits = quantidade === 24 ? 256 : 128;
  const palavras = generateMnemonic(englishWordlist, bits);
  return {
    palavras,
    quantidade,
    idiomaDaLista: LAB_WORDLIST_NAME,
    seedHex: hex.encode(mnemonicToSeedSync(palavras)),
  };
}

/**
 * Lê um mnemonic vindo do ambiente, valida o checksum e deriva a seed.
 *
 * `validateMnemonic` confere o **checksum** embutido no BIP-39, não só se as
 * palavras existem na lista. Uma palavra trocada por outra da mesma lista passa
 * na leitura e reprova no checksum — que é justamente o erro que uma pessoa
 * transcrevendo à mão comete.
 */
export function lerMnemonicDoAmbiente(entrada: string): LabMnemonic {
  const palavras = entrada.trim().replace(/\s+/g, " ").toLowerCase();
  const quantidade = palavras.split(" ").length;

  if (quantidade !== 12 && quantidade !== 24) {
    throw new Error(
      `O mnemonic tem ${quantidade} palavras. BIP-39 usa 12 ou 24 nas configurações que este projeto aceita.`,
    );
  }

  if (!validateMnemonic(palavras, englishWordlist)) {
    throw new Error(
      "Mnemonic inválido: o checksum BIP-39 não fecha.\n" +
        "  Causas comuns: uma palavra trocada, palavras fora de ordem, ou lista\n" +
        "  de idioma diferente. Este projeto usa a lista em inglês.",
    );
  }

  return {
    palavras,
    quantidade,
    idiomaDaLista: LAB_WORDLIST_NAME,
    seedHex: hex.encode(mnemonicToSeedSync(palavras)),
  };
}

/**
 * Confirma que as palavras produzem exatamente a seed informada.
 *
 * **É este o passo que dá valor ao kit.** Sem ele, o kit apenas *afirmaria* que
 * aquelas palavras recuperam a conta — e afirmação sem verificação é o defeito
 * que este projeto cataloga desde agosto (treze casos até 02/09).
 *
 * Com ele, o kit só imprime as palavras depois de **provar**, na hora da
 * geração, que elas derivam a mesma conta que a ferramenta está usando. Um erro
 * de transcrição é pego aqui, e não no dia em que alguém precisar recuperar.
 */
export function confirmarQueOMnemonicProduzASeed(mnemonic: LabMnemonic, seedHexEsperada: string): void {
  const esperada = seedHexEsperada.trim().toLowerCase();
  if (mnemonic.seedHex !== esperada) {
    throw new Error(
      "As palavras NÃO produzem a seed em uso.\n" +
        `  seed derivada das palavras: ${mnemonic.seedHex.slice(0, 16)}...(${mnemonic.seedHex.length} chars)\n` +
        `  seed em DIVINO_LAB_SEED:    ${esperada.slice(0, 16)}...(${esperada.length} chars)\n` +
        "\n" +
        "  Isto significa que o kit descreveria uma conta diferente da que tem o\n" +
        "  dinheiro. Recusando gerar. Ver KIT-MNEMONIC-001.\n" +
        "\n" +
        "  Se a conta nasceu de hex antigo (32 bytes) e não de palavras, não\n" +
        "  defina DIVINO_LAB_MNEMONIC: não existem palavras para essa conta, e\n" +
        "  inventá-las seria pior que não ter nenhuma.",
    );
  }
}

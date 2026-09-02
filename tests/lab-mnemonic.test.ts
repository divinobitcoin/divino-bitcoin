import { hex } from "@scure/base";
import { HDKey } from "@scure/bip32";
import { mnemonicToSeedSync } from "@scure/bip39";
import * as btc from "@scure/btc-signer";
import { describe, expect, it } from "vitest";

import { PUBLIC_BIP_TEST_VECTORS } from "../shared/public-bip-vectors";
import {
  LAB_WORDLIST_NAME,
  confirmarQueOMnemonicProduzASeed,
  gerarMnemonicDeLaboratorio,
  lerMnemonicDoAmbiente,
} from "../scripts/lab-mnemonic";

/**
 * A mnemonic publicada pela especificação. Não é de ninguém, é a carteira
 * mais vasculhada do planeta, e existe exatamente para servir de régua.
 */
const MNEMONIC_PUBLICA = PUBLIC_BIP_TEST_VECTORS.bip39.mnemonic;

describe("lerMnemonicDoAmbiente — conformidade com a especificação", () => {
  /**
   * **O teste que sustenta o resto.**
   *
   * A seed que este módulo produz é comparada com a que a **BIP-84 publica**,
   * não com um valor que eu mesmo calculei e anotei. A diferença importa: um
   * valor calculado aqui e fixado aqui prova apenas que o código continua
   * fazendo o que fazia — inclusive continuar errado. Um valor vindo da
   * especificação prova que ele faz o que o resto do mundo faz.
   *
   * O vetor da BIP-84 é o par certo para este módulo porque usa **passphrase
   * vazia**, que é o que a conta de laboratório usa. O vetor da BIP-39, logo
   * abaixo, usa a passphrase pública "TREZOR" e serve para outra coisa.
   */
  it("deriva exatamente a seed publicada pela BIP-84 para a mnemonic da especificação", () => {
    expect(lerMnemonicDoAmbiente(MNEMONIC_PUBLICA).seedHex).toBe(
      PUBLIC_BIP_TEST_VECTORS.bip84.seedHex,
    );
  });

  /**
   * A conformidade de ponta a ponta: palavras → seed → BIP-32 → endereço.
   *
   * O teste acima compara uma seed com outra seed. Este vai até o fim e
   * confere o **endereço** que a BIP-84 publica. É a diferença entre "os bytes
   * intermediários batem" e "o dinheiro apareceria no mesmo lugar".
   *
   * Deriva em **mainnet** de propósito, porque é assim que o vetor foi
   * publicado. O laboratório nunca toca mainnet; um vetor de teste não é rede
   * — nenhuma chave aqui recebe moeda e a mnemonic é pública desde 2013.
   */
  it("chega ao endereço publicado pela BIP-84, partindo só das palavras", () => {
    const seed = lerMnemonicDoAmbiente(MNEMONIC_PUBLICA).seedHex;
    const no = HDKey.fromMasterSeed(hex.decode(seed)).derive(
      PUBLIC_BIP_TEST_VECTORS.bip84.path,
    );

    expect(no.publicKey).toBeTruthy();
    expect(btc.p2wpkh(no.publicKey!).address).toBe(
      PUBLIC_BIP_TEST_VECTORS.bip84.expectedAddress,
    );
  });

  /**
   * O vetor da BIP-39, com a passphrase "TREZOR", confere a **outra metade**:
   * que a biblioteca implementa o PBKDF2 do BIP-39 corretamente, inclusive na
   * parte que este módulo deliberadamente não usa.
   *
   * Está aqui porque a decisão de não oferecer passphrase é uma escolha do
   * projeto, não uma limitação da biblioteca — e quando `BIP39_PASSPHRASE_POLICY`
   * mudar, este teste já estará no lugar para pegar uma regressão.
   */
  it("a biblioteca conforma com o vetor BIP-39 quando a passphrase é usada", () => {
    expect(
      hex.encode(
        mnemonicToSeedSync(
          PUBLIC_BIP_TEST_VECTORS.bip39.mnemonic,
          PUBLIC_BIP_TEST_VECTORS.bip39.passphrase,
        ),
      ),
    ).toBe(PUBLIC_BIP_TEST_VECTORS.bip39.expectedSeedHex);
  });

  it("normaliza espaços múltiplos e caixa alta sem mudar a seed", () => {
    const bagunçada = `  ${MNEMONIC_PUBLICA.toUpperCase().replace(/ /g, "   ")}  `;
    expect(lerMnemonicDoAmbiente(bagunçada).seedHex).toBe(
      PUBLIC_BIP_TEST_VECTORS.bip84.seedHex,
    );
  });
});

describe("lerMnemonicDoAmbiente — recusas", () => {
  /**
   * **O erro que uma pessoa transcrevendo à mão comete de verdade.**
   *
   * Trocar uma palavra por outra da mesma lista passa em qualquer verificação
   * que só pergunte "essas palavras existem?". O checksum do BIP-39 é o que
   * pega — e ele precisa estar ligado, porque sem ele a ferramenta aceitaria
   * uma transcrição errada e derivaria uma carteira vazia perfeitamente
   * válida, sem dizer nada.
   */
  it("recusa uma palavra trocada por outra da mesma lista (checksum)", () => {
    const errada = MNEMONIC_PUBLICA.replace(/about$/, "abandon");
    expect(errada).not.toBe(MNEMONIC_PUBLICA);
    expect(() => lerMnemonicDoAmbiente(errada)).toThrow(/checksum/i);
  });

  it("recusa palavras fora de ordem", () => {
    const partes = MNEMONIC_PUBLICA.split(" ");
    const trocada = [partes[11], ...partes.slice(1, 11), partes[0]].join(" ");
    expect(() => lerMnemonicDoAmbiente(trocada)).toThrow(/checksum/i);
  });

  it("recusa quantidade de palavras fora de 12 ou 24", () => {
    expect(() => lerMnemonicDoAmbiente("abandon abandon about")).toThrow(/3 palavras/);
  });

  it("recusa palavra que não existe na lista", () => {
    const inventada = MNEMONIC_PUBLICA.replace(/about$/, "zzzzz");
    expect(() => lerMnemonicDoAmbiente(inventada)).toThrow();
  });
});

describe("gerarMnemonicDeLaboratorio", () => {
  it("gera 12 palavras por padrão, e elas se validam de volta", () => {
    const gerado = gerarMnemonicDeLaboratorio();
    expect(gerado.quantidade).toBe(12);
    expect(gerado.palavras.split(" ")).toHaveLength(12);
    expect(lerMnemonicDoAmbiente(gerado.palavras).seedHex).toBe(gerado.seedHex);
  });

  it("gera 24 palavras quando pedido, e elas se validam de volta", () => {
    const gerado = gerarMnemonicDeLaboratorio(24);
    expect(gerado.quantidade).toBe(24);
    expect(lerMnemonicDoAmbiente(gerado.palavras).seedHex).toBe(gerado.seedHex);
  });

  /**
   * 64 bytes, sempre — inclusive com 12 palavras.
   *
   * Está testado porque contraria a intuição: 12 palavras carregam 128 bits de
   * entropia, e ainda assim o PBKDF2 do BIP-39 devolve 512 bits. A seed hex
   * antiga do laboratório tinha 32 bytes porque vinha de `randomBytes(32)`
   * direto, sem passar pelo BIP-39. Quem vir 128 caracteres onde antes via 64
   * precisa saber que está certo.
   */
  it("a seed tem 64 bytes independentemente da quantidade de palavras", () => {
    expect(gerarMnemonicDeLaboratorio(12).seedHex).toHaveLength(128);
    expect(gerarMnemonicDeLaboratorio(24).seedHex).toHaveLength(128);
  });

  it("duas gerações não coincidem", () => {
    expect(gerarMnemonicDeLaboratorio().palavras).not.toBe(
      gerarMnemonicDeLaboratorio().palavras,
    );
  });

  it("declara o idioma da lista, que é parte do segredo", () => {
    expect(gerarMnemonicDeLaboratorio().idiomaDaLista).toBe(LAB_WORDLIST_NAME);
  });
});

describe("confirmarQueOMnemonicProduzASeed", () => {
  /**
   * **A trava que dá valor ao kit inteiro.**
   *
   * Um kit que imprime palavras sem verificar está afirmando recuperabilidade
   * por suposição. Se as palavras não derivarem a conta que tem o dinheiro, a
   * falha só aparece no dia da recuperação — o pior dia possível para
   * descobrir.
   */
  it("aceita quando as palavras produzem a seed em uso", () => {
    const gerado = gerarMnemonicDeLaboratorio();
    expect(() => confirmarQueOMnemonicProduzASeed(gerado, gerado.seedHex)).not.toThrow();
  });

  it("aceita seed escrita em caixa alta", () => {
    const gerado = gerarMnemonicDeLaboratorio();
    expect(() =>
      confirmarQueOMnemonicProduzASeed(gerado, gerado.seedHex.toUpperCase()),
    ).not.toThrow();
  });

  it("recusa quando as palavras produzem outra conta", () => {
    expect(() =>
      confirmarQueOMnemonicProduzASeed(
        gerarMnemonicDeLaboratorio(),
        PUBLIC_BIP_TEST_VECTORS.bip84.seedHex,
      ),
    ).toThrow(/NÃO produzem a seed em uso/);
  });

  /**
   * O caso concreto que motivou a trava: uma conta antiga, nascida de
   * `randomBytes(32)`, não tem palavras. Anexar palavras a ela produziria um
   * kit que descreve uma conta e recupera outra.
   */
  it("recusa mnemonic contra seed hex antiga de 32 bytes", () => {
    expect(() =>
      confirmarQueOMnemonicProduzASeed(
        gerarMnemonicDeLaboratorio(),
        "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f",
      ),
    ).toThrow(/NÃO produzem a seed em uso/);
  });
});

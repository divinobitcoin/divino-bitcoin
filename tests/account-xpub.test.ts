import { hex } from "@scure/base";
import { HDKey } from "@scure/bip32";
import { describe, expect, it } from "vitest";

import { lerBirthdayDoKit, lerContaXpub, nomeDeWalletParaXpub } from "../shared/account-xpub";

/**
 * A chave estendida da conta é a única coisa que a interface recebe para poder
 * ler saldo. A ADR-0001 a proíbe de derivar — então ela precisa saber recusar
 * bem o que chega errado, porque não tem como recalcular nada.
 *
 * Quase todo teste aqui é sobre **recusa**. É onde mora o risco.
 */

const SEED = "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f";
const VERSOES_TESTNET = { private: 0x04358394, public: 0x043587cf };

const contaTestnet = HDKey.fromMasterSeed(hex.decode(SEED), VERSOES_TESTNET).derive("m/84'/1'/0'");
const TPUB = contaTestnet.publicExtendedKey;
const TPRV = contaTestnet.privateExtendedKey;
const XPUB_MAINNET = HDKey.fromMasterSeed(hex.decode(SEED)).derive("m/84'/0'/0'").publicExtendedKey;

describe("lerContaXpub — o caminho feliz", () => {
  it("monta os dois descriptors por concatenação, sem checksum", () => {
    const conta = lerContaXpub(TPUB);
    expect(conta.descriptorRecebimento).toBe(`wpkh(${TPUB}/0/*)`);
    expect(conta.descriptorTroco).toBe(`wpkh(${TPUB}/1/*)`);
  });

  /**
   * O checksum é responsabilidade do nó, via `getdescriptorinfo`. Calculá-lo
   * aqui seria reimplementar o Core e ter de acertar; pedir a ele é validação
   * de graça — um descriptor malformado é recusado na hora, e não no dia da
   * recuperação.
   */
  it("não inventa checksum", () => {
    expect(lerContaXpub(TPUB).descriptorRecebimento).not.toContain("#");
  });

  it("tolera espaço em volta", () => {
    expect(lerContaXpub(`  ${TPUB}\n`).xpub).toBe(TPUB);
  });
});

describe("nome da wallet — uma por conta", () => {
  /**
   * `SMOKE-MULTICONTA-001`: `listunspent` responde pela wallet inteira do Core,
   * não pela conta. Duas contas na mesma wallet somam saldos que não são da
   * mesma carteira — foi assim que o smoke deu falso negativo em 02/09.
   *
   * A tela evita o problema em vez de filtrar: uma wallet por xpub. Isso é o
   * que dispensa qualquer derivação de endereço na interface.
   */
  it("contas diferentes nunca caem na mesma wallet", () => {
    const outra = HDKey.fromMasterSeed(hex.decode(SEED), VERSOES_TESTNET)
      .derive("m/84'/1'/1'")
      .publicExtendedKey;
    expect(nomeDeWalletParaXpub(TPUB)).not.toBe(nomeDeWalletParaXpub(outra));
  });

  /**
   * Determinístico: a mesma conta reaberta amanhã cai na mesma wallet, e o
   * import é idempotente (`RANGE-SHRINK-001`). Nome aleatório criaria wallet
   * nova a cada sessão e encheria o nó de lixo.
   */
  it("a mesma conta cai sempre na mesma wallet", () => {
    expect(nomeDeWalletParaXpub(TPUB)).toBe(nomeDeWalletParaXpub(` ${TPUB} `));
  });

  it("o nome é seguro para usar como identificador", () => {
    expect(nomeDeWalletParaXpub(TPUB)).toMatch(/^divino-conta-[0-9a-f]{8}$/);
  });
});

describe("lerContaXpub — as recusas", () => {
  /**
   * **A recusa mais importante do módulo, e a razão de ele existir.**
   *
   * A PARTE 1 do Recovery Kit imprime um `tprv`, e as duas partes saem no mesmo
   * arquivo quando o kit é gerado inteiro. Alguém recuperando fundos, cansado,
   * pode copiar a linha errada.
   *
   * Se a interface aceitasse, a chave privada entraria no heap JavaScript do
   * React Native — exatamente o que a ADR-0001 impede. E o `guard:lab-boundary`
   * NÃO pegaria: nada teria sido importado, o segredo teria sido digitado.
   */
  it("recusa chave PRIVADA e diz por que isso importa", () => {
    expect(() => lerContaXpub(TPRV)).toThrow(/chave PRIVADA/);
    expect(() => lerContaXpub(TPRV)).toThrow(/PARTE 2/);
  });

  it("recusa todas as formas de chave estendida privada", () => {
    for (const prefixo of ["tprv", "xprv", "yprv", "zprv", "uprv", "vprv"]) {
      expect(() => lerContaXpub(`${prefixo}${"1".repeat(107)}`)).toThrow(/chave PRIVADA/);
    }
  });

  /**
   * `G-MAINNET` está fechado. Uma chave de mainnet colada aqui não é engano
   * inofensivo: seria o aplicativo observando dinheiro real num caminho que
   * ainda não passou por auditoria.
   */
  it("recusa xpub de mainnet, citando o gate", () => {
    expect(() => lerContaXpub(XPUB_MAINNET)).toThrow(/MAINNET/);
    expect(() => lerContaXpub(XPUB_MAINNET)).toThrow(/auditoria/);
  });

  /**
   * O erro que a transcrição manual produz. Sem esta conferência, a chave
   * seguiria para o nó e voltaria como `key ... is not valid (código -5)` —
   * mensagem que parece defeito de derivação e é erro de digitação. É a lição
   * do `TPUB-SERIAL-001` aplicada antes da rede.
   */
  it("recusa chave com caractere faltando ou trocado (checksum base58)", () => {
    expect(() => lerContaXpub(TPUB.slice(0, -1))).toThrow(/checksum base58/);
    expect(() => lerContaXpub(`${TPUB.slice(0, -1)}X`)).toThrow(/checksum base58/);
  });

  /**
   * O engano mais perigoso depois do `tprv`: colar as palavras. Elas nunca
   * entram na interface, em nenhuma tela, por nenhum motivo.
   */
  it("recusa texto com espaços e avisa que palavras não entram aqui", () => {
    expect(() => lerContaXpub("abandon abandon abandon about")).toThrow(/PARE/);
  });

  it("recusa entrada vazia", () => {
    expect(() => lerContaXpub("   ")).toThrow(/Cole a chave/);
  });

  it("recusa base58 válido que não é chave estendida", () => {
    // 78 bytes é o tamanho de uma chave estendida BIP-32; qualquer outro não é.
    expect(() => lerContaXpub("tpubZZZ")).toThrow();
  });
});

describe("lerBirthdayDoKit", () => {
  /**
   * O Core só varre a cadeia **a partir** do timestamp informado. Com `"now"`,
   * uma conta que já recebeu dinheiro aparece VAZIA — e o usuário conclui que
   * perdeu os fundos.
   *
   * É a mesma classe de falha silenciosa do `GREEN-REDE-OCULTA-001`: tudo
   * funciona, o número é zero, e nada na tela explica por quê.
   */
  it("converte AAAA-MM-DD para o início do dia em UTC", () => {
    expect(lerBirthdayDoKit("2026-09-03")).toBe(Date.UTC(2026, 8, 3) / 1000);
  });

  it("interpreta a data como início do dia, não como o instante da leitura", () => {
    // Errar para trás custa varredura; errar para frente esconde fundos.
    const dia = lerBirthdayDoKit("2026-09-03") as number;
    expect(dia).toBeLessThan(Date.UTC(2026, 8, 3, 12) / 1000);
  });

  it('aceita vazio e "now" para conta que nunca recebeu nada', () => {
    expect(lerBirthdayDoKit("")).toBe("now");
    expect(lerBirthdayDoKit("  NOW ")).toBe("now");
  });

  /**
   * `DIVINO_KIT_BIRTHDAY` aceita data OU altura de bloco, mas o
   * `importdescriptors` só entende tempo UNIX. Converter altura por chute
   * produziria uma varredura errada em silêncio; recusar com instrução, não.
   */
  it("recusa altura de bloco e explica a diferença", () => {
    expect(() => lerBirthdayDoKit("320433")).toThrow(/altura de bloco/);
    expect(() => lerBirthdayDoKit("320433")).toThrow(/AAAA-MM-DD/);
  });

  it("recusa data malformada", () => {
    for (const ruim of ["03/09/2026", "2026-9-3", "ontem", "2026-09"]) {
      expect(() => lerBirthdayDoKit(ruim)).toThrow(/inválida|altura/);
    }
  });

  it("recusa data anterior ao primeiro bloco do Bitcoin", () => {
    expect(() => lerBirthdayDoKit("2008-10-31")).toThrow(/2009-01-03/);
  });
});

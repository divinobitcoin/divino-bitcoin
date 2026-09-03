import { describe, expect, it } from "vitest";

import {
  lerCredenciaisDoConf,
  resolveBitcoinCoreRpcCredentials,
} from "../scripts/bitcoin-core-rpc-env";

/**
 * Ambiente mínimo e hermético. `NODE_ENV` entra porque o tipo `ProcessEnv`
 * deste projeto o exige — e é melhor declará-lo do que forçar o tipo com um
 * cast por `unknown`, que desligaria a checagem inteira só para calar um erro.
 *
 * Herméticos de propósito: partir de `process.env` faria o teste depender de
 * variáveis que a máquina de quem roda pode ter definido.
 */
function env(overrides: Record<string, string>): NodeJS.ProcessEnv {
  return { NODE_ENV: "test", ...overrides } as NodeJS.ProcessEnv;
}

/**
 * O Core **não escreve cookie** quando `rpcuser`/`rpcpassword` estão no
 * `bitcoin.conf` — são mecanismos alternativos, não complementares.
 *
 * A consequência apareceu em 03/09/2026: o Recovery Kit saiu sem checksum nos
 * descriptors porque a ferramenta procurou um cookie que nunca existiu, e um
 * kit sem checksum é recusado pelo `importdescriptors`. O contorno era exportar
 * duas variáveis à mão toda sessão. Virou código pela regra de sempre: o que dá
 * para pôr no código não fica na disciplina humana.
 */

const CONF_SIMPLES = `
# nó de laboratório
signet=1
server=1
rpcuser=divino
rpcpassword=senha-de-laboratorio
`;

describe("lerCredenciaisDoConf", () => {
  it("lê rpcuser e rpcpassword do nível global", () => {
    expect(lerCredenciaisDoConf(CONF_SIMPLES, "signet")).toEqual({
      username: "divino",
      password: "senha-de-laboratorio",
      temRpcAuth: false,
    });
  });

  /**
   * O `bitcoin.conf` aceita seções de rede, e um valor dentro da seção **vence**
   * o global. Ignorar isso leria a credencial errada num arquivo que configura
   * mais de uma rede, e o sintoma seria um 401 sem explicação nenhuma.
   */
  it("a seção da rede vence o global", () => {
    const conf = `
rpcuser=global
rpcpassword=senha-global
[signet]
rpcuser=de-signet
rpcpassword=senha-de-signet
[main]
rpcuser=de-mainnet
rpcpassword=senha-de-mainnet
`;
    expect(lerCredenciaisDoConf(conf, "signet")).toMatchObject({
      username: "de-signet",
      password: "senha-de-signet",
    });
    expect(lerCredenciaisDoConf(conf, "main")).toMatchObject({
      username: "de-mainnet",
      password: "senha-de-mainnet",
    });
  });

  it("cai para o global quando a seção não define nada", () => {
    const conf = `
rpcuser=global
rpcpassword=senha-global
[testnet]
rpcuser=de-testnet
`;
    expect(lerCredenciaisDoConf(conf, "signet")).toMatchObject({
      username: "global",
      password: "senha-global",
    });
  });

  it("ignora valores de OUTRA seção", () => {
    const conf = `
[main]
rpcuser=de-mainnet
rpcpassword=senha-de-mainnet
`;
    expect(lerCredenciaisDoConf(conf, "signet")).toMatchObject({
      username: undefined,
      password: undefined,
    });
  });

  it("ignora comentários e tolera espaço em volta do sinal de igual", () => {
    const conf = `
# rpcuser=comentado
rpcuser = divino   # nome
  rpcpassword=  senha
`;
    expect(lerCredenciaisDoConf(conf, "signet")).toMatchObject({
      username: "divino",
      password: "senha",
    });
  });

  /**
   * `rpcauth` guarda a senha em forma de hash. A senha em texto **não está no
   * arquivo** e não pode ser recuperada dele. Detectar isso permite dizer a
   * verdade — "não dá para ler daqui" — em vez de "não achei rpcpassword", que
   * mandaria a pessoa procurar uma linha que nunca vai existir.
   */
  it("detecta rpcauth, onde a senha em texto não existe", () => {
    const conf = `rpcauth=divino:6bc5...$e1f2...\n`;
    expect(lerCredenciaisDoConf(conf, "signet")).toEqual({
      username: undefined,
      password: undefined,
      temRpcAuth: true,
    });
  });

  it("ignora chaves que não interessam", () => {
    expect(lerCredenciaisDoConf("prune=550\nrpcbind=0.0.0.0\ntxindex=1\n", "signet")).toEqual({
      username: undefined,
      password: undefined,
      temRpcAuth: false,
    });
  });
});

describe("resolveBitcoinCoreRpcCredentials — ordem dos três caminhos", () => {
  it("as variáveis de ambiente vencem tudo, e a origem é declarada", () => {
    expect(
      resolveBitcoinCoreRpcCredentials(
        env({ DIVINO_CORE_RPC_USER: "u", DIVINO_CORE_RPC_PASSWORD: "p" }),
      ),
    ).toEqual({ username: "u", password: "p", source: "env" });
  });

  /**
   * Meia credencial é pior que nenhuma: seguiria para o cookie ou para o conf e
   * usaria uma credencial que não é a que a pessoa quis passar, com o resultado
   * dependendo de qual das duas ela esqueceu.
   */
  it("recusa quando só uma das duas variáveis está definida", () => {
    expect(() =>
      resolveBitcoinCoreRpcCredentials(env({ DIVINO_CORE_RPC_USER: "u" })),
    ).toThrow(/precisam ser passadas juntas/);
    expect(() =>
      resolveBitcoinCoreRpcCredentials(env({ DIVINO_CORE_RPC_PASSWORD: "p" })),
    ).toThrow(/precisam ser passadas juntas/);
  });

  /**
   * Sem cookie e sem conf, a mensagem tem de nomear **os três** caminhos
   * tentados. Erro que diz só "não achei o cookie" manda a pessoa procurar um
   * arquivo que o nó dela nunca vai escrever.
   */
  it("quando nenhum caminho serve, o erro nomeia os três", () => {
    let mensagem = "";
    try {
      resolveBitcoinCoreRpcCredentials(
        env({
          DIVINO_CORE_RPC_COOKIE: "/caminho/que/nao/existe/.cookie",
          DIVINO_CORE_RPC_CONF: "/caminho/que/nao/existe/bitcoin.conf",
        }),
      );
    } catch (erro) {
      mensagem = erro instanceof Error ? erro.message : String(erro);
    }
    expect(mensagem).toContain("DIVINO_CORE_RPC_USER");
    expect(mensagem).toContain("cookie");
    expect(mensagem).toContain("bitcoin.conf");
  });

  /**
   * A senha atravessa este módulo e não pode aparecer em mensagem nenhuma.
   * Mensagem de erro vai para o terminal, e terminal vira captura de tela.
   */
  it("nenhuma mensagem de erro contém a senha", () => {
    let mensagem = "";
    try {
      resolveBitcoinCoreRpcCredentials(
        env({ DIVINO_CORE_RPC_PASSWORD: "senha-secreta-que-nao-pode-vazar" }),
      );
    } catch (erro) {
      mensagem = erro instanceof Error ? erro.message : String(erro);
    }
    expect(mensagem).not.toContain("senha-secreta-que-nao-pode-vazar");
  });
});

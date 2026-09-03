import { describe, expect, it } from "vitest";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const plugin = require("../plugins/with-lan-cleartext-debug.js") as {
  ehEnderecoDeRedeLocal: (ip: string) => boolean;
};

/**
 * O plugin abre uma exceção ao bloqueio de texto claro do Android. A guarda que
 * decide **para qual endereço** é a única coisa entre "o celular fala com o nó
 * da sua casa" e "o aplicativo manda credencial em claro pela internet".
 *
 * `NODE-TRANSPORT-001`: a exceção vai só no build de debug e só para um
 * endereço. Este teste cobre a segunda metade.
 */
describe("with-lan-cleartext-debug — a guarda de endereço", () => {
  it("aceita as faixas privadas da RFC 1918 e o loopback", () => {
    for (const ip of ["192.168.15.5", "192.168.0.1", "10.0.0.7", "10.255.255.254", "172.16.3.1", "172.31.255.9", "127.0.0.1"]) {
      expect(plugin.ehEnderecoDeRedeLocal(ip), ip).toBe(true);
    }
  });

  /**
   * `172.16.0.0/12` termina em `172.31.255.255`. `172.32.x.x` já é internet
   * pública, e é o erro de fronteira que se comete escrevendo a regra de
   * memória.
   */
  it("recusa 172.32.x.x, logo depois do fim da faixa privada", () => {
    expect(plugin.ehEnderecoDeRedeLocal("172.31.255.255")).toBe(true);
    expect(plugin.ehEnderecoDeRedeLocal("172.32.0.1")).toBe(false);
    expect(plugin.ehEnderecoDeRedeLocal("172.15.255.255")).toBe(false);
  });

  it("recusa endereço público", () => {
    for (const ip of ["8.8.8.8", "1.1.1.1", "203.0.113.7", "0.0.0.0"]) {
      expect(plugin.ehEnderecoDeRedeLocal(ip), ip).toBe(false);
    }
  });

  it("recusa qualquer coisa que não seja IPv4 bem formado", () => {
    for (const ruim of ["", "abc", "192.168.15", "192.168.15.5.6", "999.1.1.1", "192.168.-1.5", "192.168.015.5x"]) {
      expect(plugin.ehEnderecoDeRedeLocal(ruim), ruim).toBe(false);
    }
  });
});

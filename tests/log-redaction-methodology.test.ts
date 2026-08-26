import { describe, expect, it, vi } from "vitest";

/**
 * P1-01 — interceptação real de console, complementando o guard AST acima.
 *
 * O guard AST inspeciona a FORMA do código (quais expressões são passadas a
 * `console.*`). Estes testes inspecionam o VALOR efetivamente entregue ao
 * console em tempo de execução. São camadas diferentes: a primeira pega um
 * argumento sensível escrito no código; a segunda pega um valor sensível que
 * chegue ao console por um caminho que a análise estática não enxergue
 * (por exemplo, dentro de um objeto Error produzido por uma biblioteca).
 *
 * LIMITAÇÃO DECLARADA — leia antes de confiar:
 * Isto é uma regressão automatizada, NÃO uma prova formal de taint analysis
 * nem garantia de ausência absoluta de vazamento. O detector encontra valores
 * sentinela conhecidos nos argumentos capturados. Ele não prova que nenhum
 * outro dado sensível, com outro formato ou por outro canal (rede, arquivo,
 * clipboard, crash reporter), deixe de vazar.
 */
describe("P1-01 — interceptação de console em tempo de execução", () => {
  const SENTINELA_TOKEN = "sess_9f3c1d7b0a4e5f62_SENTINELA_NAO_DEVE_VAZAR";
  const SENTINELA_CODE = "authcode_2b7e_SENTINELA_NAO_DEVE_VAZAR";

  /** Serializa profundamente, incluindo Error, para procurar valores sentinela. */
  function achata(valor: unknown, profundidade = 0): string {
    if (profundidade > 6) return "";
    if (valor === null || valor === undefined) return "";
    if (typeof valor === "string") return valor;
    if (typeof valor === "number" || typeof valor === "boolean") return String(valor);

    if (valor instanceof Error) {
      const extras = Object.getOwnPropertyNames(valor)
        .map((chave) => achata((valor as unknown as Record<string, unknown>)[chave], profundidade + 1))
        .join(" ");
      return `${valor.name} ${valor.message} ${extras}`;
    }

    if (Array.isArray(valor)) {
      return valor.map((item) => achata(item, profundidade + 1)).join(" ");
    }

    if (typeof valor === "object") {
      return Object.entries(valor as Record<string, unknown>)
        .map(([chave, item]) => `${chave} ${achata(item, profundidade + 1)}`)
        .join(" ");
    }

    return "";
  }

  /** Captura tudo que passar por console.log/warn/error durante `acao`. */
  function capturarConsole(acao: () => void): string {
    const capturado: unknown[] = [];
    const espioes = (["log", "warn", "error"] as const).map((metodo) =>
      vi.spyOn(console, metodo).mockImplementation((...args: unknown[]) => {
        capturado.push(...args);
      }),
    );

    try {
      acao();
    } finally {
      espioes.forEach((espiao) => espiao.mockRestore());
    }

    return capturado.map((item) => achata(item)).join(" ");
  }

  function vazou(saida: string): boolean {
    return saida.includes(SENTINELA_TOKEN) || saida.includes(SENTINELA_CODE);
  }

  it("detecta vazamento quando um objeto Error com segredo é passado ao console", () => {
    // Este é exatamente o padrão removido de server/_core/oauth.ts no P0:
    // `console.error("[OAuth] Callback failed", error)`. O risco não é o texto
    // escrito no código, e sim o conteúdo que a biblioteca coloca no Error.
    const erroDeBiblioteca = new Error(
      `request failed: Authorization: Bearer ${SENTINELA_TOKEN}`,
    );

    const saida = capturarConsole(() => {
      console.error("[OAuth] Callback failed", erroDeBiblioteca);
    });

    expect(vazou(saida)).toBe(true);
  });

  it("não acusa vazamento no padrão categórico adotado pelo runtime", () => {
    // Forma efetivamente presente hoje em server/_core/oauth.ts após o P0.
    const erroDeBiblioteca = new Error(
      `request failed: Authorization: Bearer ${SENTINELA_TOKEN}`,
    );

    const saida = capturarConsole(() => {
      try {
        throw erroDeBiblioteca;
      } catch {
        console.error("[OAuth] Callback failed");
      }
    });

    expect(vazou(saida)).toBe(false);
  });

  it("detecta vazamento por prefixo de token (padrão removido de auth.ts)", () => {
    const saida = capturarConsole(() => {
      console.log("[Auth] Session token retrieved:", `${SENTINELA_TOKEN.substring(0, 20)}...`);
    });

    // Um prefixo ainda é material do segredo; o detector precisa acusar.
    expect(saida).toContain(SENTINELA_TOKEN.substring(0, 20));
  });

  it("não trata Boolean(segredo) como vazamento", () => {
    const saida = capturarConsole(() => {
      console.log("[Auth] Session token lookup completed", {
        hasSession: Boolean(SENTINELA_TOKEN),
      });
    });

    expect(vazou(saida)).toBe(false);
    expect(saida).toContain("true");
  });

  it("não trata !!segredo como vazamento", () => {
    const usuarioDeResposta: { id: number } | null = { id: 1 };

    const saida = capturarConsole(() => {
      console.log("[API] OAuth exchange completed", {
        hasSessionToken: !!SENTINELA_TOKEN,
        hasUser: !!usuarioDeResposta,
      });
    });

    expect(vazou(saida)).toBe(false);
  });

  it("não trata os metadados booleanos do callback como vazamento", () => {
    // Forma efetivamente presente hoje em app/oauth/callback.tsx.
    const saida = capturarConsole(() => {
      console.log("[OAuth] Callback metadata:", {
        hasCode: Boolean(SENTINELA_CODE),
        hasState: Boolean("state-qualquer"),
        hasError: Boolean(undefined),
      });
    });

    expect(vazou(saida)).toBe(false);
  });

  it("detecta segredo aninhado dentro de objeto de usuário", () => {
    // Padrão removido: `console.log("[Auth] User info retrieved:", user)`.
    const usuario = { id: 7, nome: "publico", sessao: { token: SENTINELA_TOKEN } };

    const saida = capturarConsole(() => {
      console.log("[Auth] User info retrieved:", usuario);
    });

    expect(vazou(saida)).toBe(true);
  });
});

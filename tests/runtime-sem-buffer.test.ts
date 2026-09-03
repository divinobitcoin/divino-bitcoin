import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Nenhum código que o aplicativo consegue alcançar pode usar API só de Node.
 *
 * ## O defeito que gerou este teste
 *
 * 03/09/2026, primeira tentativa de ler saldo pelo nó no Xiaomi:
 *
 * > `Não foi possível criar nem carregar a wallet "divino-conta-671e8db6".`
 * > `createwallet: Property 'Buffer' doesn't exist`
 *
 * `Buffer` é um global do **Node.js**. Ele não existe no runtime do React
 * Native. O cabeçalho Basic auth do RPC era montado com
 * `Buffer.from(...).toString("base64")`, e isso funcionava em toda parte menos
 * onde importa.
 *
 * **As quatro validações passaram por cima disso.** O `vitest` roda em Node,
 * onde `Buffer` existe. O `tsc` aprova porque `@types/node` promete que existe.
 * O `lint` não tem opinião. O `guard:lab-boundary` cuida de outra coisa. Só o
 * aparelho mostrou — exatamente como no bug que deixou todos os botões
 * invisíveis.
 *
 * Este teste é a diferença entre "corrigimos" e "não volta".
 *
 * ## O que fica de fora, e por quê
 *
 * Os módulos protegidos pelo `guard:lab-boundary` podem usar Node à vontade:
 * eles **nunca** entram no aplicativo, e o CI reprova quem tentar importá-los
 * de um *runtime root*. Aqui a exclusão é a mesma lista, e é proposital que ela
 * esteja escrita — se alguém tirar um módulo da proteção do guard, este teste
 * passa a cobri-lo e vai reclamar.
 */

/** Mesma lista de `scripts/verify-lab-boundary.mjs`. */
const MODULOS_LAB_PROTEGIDOS = [
  "shared/bip84-derivation.ts",
  "shared/mnemonic-recovery.ts",
  "shared/psbt-signer.ts",
  "shared/public-bip-vectors.ts",
  "shared/signet-derivation-policy.ts",
];

/**
 * Diretórios que o empacotador do aplicativo alcança. `scripts/` fica de fora
 * porque é ferramenta de linha de comando e roda em Node de propósito.
 */
const RAIZES = ["shared", "app", "components", "lib", "hooks", "constants", "modules", "plugins"];

/**
 * Globais e módulos que existem em Node e **não** no React Native.
 *
 * `Buffer` já quebrou de verdade. `node:` como origem de import quebraria do
 * mesmo jeito, e é o vizinho mais provável do próximo erro.
 */
const PROIBIDOS: Array<{ nome: string; padrao: RegExp }> = [
  { nome: "Buffer", padrao: /\bBuffer\b/ },
  { nome: 'import de "node:..."', padrao: /from\s+["']node:/ },
];

function arquivosDe(dir: string, acc: string[] = []): string[] {
  let entradas: string[];
  try {
    entradas = readdirSync(dir);
  } catch {
    return acc; // diretório opcional que não existe neste repositório
  }
  for (const entrada of entradas) {
    const caminho = join(dir, entrada);
    if (statSync(caminho).isDirectory()) {
      if (entrada === "node_modules" || entrada === "build" || entrada === "__tests__") continue;
      arquivosDe(caminho, acc);
    } else if ([".ts", ".tsx", ".js", ".jsx"].includes(extname(entrada))) {
      acc.push(caminho);
    }
  }
  return acc;
}

/**
 * Remove comentários antes de procurar.
 *
 * Sem isso, a própria explicação de por que `Buffer` é proibido reprovaria o
 * teste — e um teste que proíbe falar do problema é pior que nenhum.
 */
function semComentarios(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("nada de API só de Node no que o aplicativo alcança", () => {
  const arquivos = RAIZES.flatMap((raiz) => arquivosDe(raiz)).filter(
    (caminho) => !MODULOS_LAB_PROTEGIDOS.includes(caminho.replace(/\\/g, "/")),
  );

  it("encontra arquivos para examinar", () => {
    // Se a varredura vier vazia por um erro de caminho, o teste passaria sem
    // examinar nada — a pior forma de teste verde.
    expect(arquivos.length).toBeGreaterThan(20);
  });

  for (const { nome, padrao } of PROIBIDOS) {
    it(`nenhum arquivo usa ${nome}`, () => {
      const culpados = arquivos.filter((caminho) =>
        padrao.test(semComentarios(readFileSync(caminho, "utf8"))),
      );
      expect(
        culpados,
        `${nome} não existe no runtime do React Native. Em ${caminho(culpados)} ele quebraria ` +
          "no aparelho, com as quatro validações verdes. Ver KIT-NODE-API-001.",
      ).toEqual([]);
    });
  }

  /**
   * A lista de exclusão precisa continuar apontando para arquivos reais. Se um
   * módulo for renomeado, a exclusão vira letra morta e ninguém percebe.
   */
  it("os módulos LAB excluídos ainda existem", () => {
    for (const modulo of MODULOS_LAB_PROTEGIDOS) {
      expect(() => statSync(modulo), modulo).not.toThrow();
    }
  });
});

function caminho(lista: string[]): string {
  return lista.length === 0 ? "(nenhum)" : lista.join(", ");
}

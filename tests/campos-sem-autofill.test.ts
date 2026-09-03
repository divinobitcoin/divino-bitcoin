import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * `AUTOFILL-LEAK-001` — nenhum campo de texto do aplicativo pode ser oferecido
 * ao preenchimento automático do sistema.
 *
 * ## O caso real
 *
 * 03/09/2026. O gerenciador de senhas do Google ofereceu, no campo de senha do
 * RPC da tela de saldo, um valor que ele mesmo havia guardado de uma digitação
 * anterior. O proprietário aceitou a sugestão; ela veio com um caractere em
 * caixa errada, e o nó recusou a credencial com HTTP 401.
 *
 * O 401 foi o sintoma que apareceu. **O achado é que o valor estava guardado.**
 * A credencial do nó tinha saído do aparelho e ido para a conta Google do
 * usuário — numa carteira cujo princípio inegociável é que material sensível
 * não sai do dispositivo.
 *
 * `secureTextEntry` esconde o texto na tela e **não** impede o autofill.
 *
 * ## Por que um teste, e não uma revisão de código
 *
 * Porque a propriedade seria esquecida na próxima tela. Este teste é da mesma
 * família do `guard:lab-boundary` e do `tests/runtime-sem-buffer.test.ts`:
 * transforma disciplina humana em reprovação mecânica.
 *
 * ## Por que ele proíbe o `TextInput` inteiro, e não só o campo de senha
 *
 * Porque o campo de senha era o menos valioso da tela. A chave estendida da
 * conta revela todos os endereços da carteira; endereço de destino e valor
 * descrevem para quem o usuário paga e quanto; uma PSBT carrega entradas,
 * saídas e troco. Nada disso tem motivo para ser sincronizado com nuvem
 * nenhuma. Autorizar caso a caso é como a propriedade se perde.
 */

/** Diretórios de tela. `components/` fica de fora: é onde mora o wrapper. */
const RAIZES = ["app"];

/** O único arquivo autorizado a chamar `TextInput` do React Native. */
const WRAPPER = "components/campo-texto.tsx";

function arquivosDe(dir: string, acc: string[] = []): string[] {
  let entradas: string[];
  try {
    entradas = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const entrada of entradas) {
    const caminho = join(dir, entrada);
    if (statSync(caminho).isDirectory()) {
      if (entrada === "node_modules") continue;
      arquivosDe(caminho, acc);
    } else if ([".ts", ".tsx"].includes(extname(entrada))) {
      acc.push(caminho);
    }
  }
  return acc;
}

function semComentarios(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("AUTOFILL-LEAK-001 — nenhum campo entregue ao autofill do sistema", () => {
  const arquivos = arquivosDe("app");

  it("encontra arquivos de tela para examinar", () => {
    // Varredura vazia passaria sem examinar nada — a pior forma de teste verde.
    expect(arquivos.length).toBeGreaterThan(10);
  });

  it("nenhuma tela usa <TextInput> do React Native diretamente", () => {
    const culpados = arquivos.filter((caminho) =>
      /<TextInput\b/.test(semComentarios(readFileSync(caminho, "utf8"))),
    );
    expect(
      culpados,
      "Use <CampoTexto> de @/components/campo-texto. O TextInput cru é oferecido ao " +
        "gerenciador de senhas do sistema, e material de carteira não sai do aparelho. " +
        `Arquivos: ${culpados.join(", ") || "(nenhum)"}`,
    ).toEqual([]);
  });

  it("nenhuma tela importa TextInput de react-native", () => {
    const culpados = arquivos.filter((caminho) => {
      const fonte = semComentarios(readFileSync(caminho, "utf8"));
      const imports = fonte.match(/import\s*\{[^}]*\}\s*from\s*["']react-native["']/gs) ?? [];
      return imports.some((bloco) => /\bTextInput\b/.test(bloco));
    });
    expect(culpados, `Arquivos: ${culpados.join(", ") || "(nenhum)"}`).toEqual([]);
  });

  /**
   * O wrapper é a única exceção, e a exceção precisa continuar valendo: se
   * alguém apagar uma das três propriedades, o teste acima continuaria verde
   * enquanto o vazamento voltava.
   */
  it("o wrapper existe e carrega as três propriedades", () => {
    const fonte = semComentarios(readFileSync(WRAPPER, "utf8"));
    expect(fonte).toContain('autoComplete="off"');
    expect(fonte).toContain('importantForAutofill="no"');
    expect(fonte).toContain('textContentType="none"');
  });

  /**
   * As propriedades vêm DEPOIS do spread de propriedades. Se viessem antes,
   * qualquer chamada poderia reativar o autofill sem querer, passando a
   * propriedade — e a garantia deixaria de ser mecânica.
   */
  it("as três propriedades vêm depois do spread, e não podem ser sobrescritas", () => {
    // Comentários fora: a própria documentação do wrapper cita as três
    // propriedades, e a citação apareceria antes do spread.
    const fonte = semComentarios(readFileSync(WRAPPER, "utf8"));
    const spread = fonte.indexOf("{...props}");
    expect(spread, "o wrapper precisa repassar as propriedades recebidas").toBeGreaterThan(-1);
    for (const prop of ['autoComplete="off"', 'importantForAutofill="no"', 'textContentType="none"']) {
      expect(fonte.indexOf(prop), prop).toBeGreaterThan(spread);
    }
  });
});

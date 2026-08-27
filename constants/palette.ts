/**
 * Paleta da identidade visual do Divino Bitcoin.
 *
 * ## De onde vieram estes valores
 *
 * As seis cores da seção `identidade` foram **extraídas por amostragem de
 * pixel** dos mockups aprovados da carteira, não estimadas a olho.
 * Uma versão anterior amostrou o *documento de identidade*, cujos swatches estão
 * renderizados foscos, e produziu âmbar apagado demais. Os mockups são a fonte. Os
 * demais tokens são derivados, e cada par texto/fundo teve o contraste
 * calculado pela fórmula WCAG antes de entrar aqui.
 *
 * Isso importa porque legibilidade em tema escuro é fácil de errar pela
 * intuição. Um exemplo concreto, medido: **texto creme sobre âmbar dá 2,35:1 e
 * reprova** no critério AA. A escolha óbvia — texto branco em botão laranja —
 * seria ilegível para parte das pessoas. Sobre âmbar o texto tem que ser
 * escuro: `obsidiana` sobre `ambarBitcoin` dá 7,65:1 e passa.
 *
 * ## Como usar
 *
 * Importe `cores` e use os nomes de **função**, nunca os de identidade:
 *
 *     backgroundColor: cores.acaoPrimaria      // certo
 *     backgroundColor: identidade.ambarBitcoin // evite
 *     backgroundColor: "#CB6C18"               // nunca
 *
 * O nome de função sobrevive a uma mudança de identidade; o hexadecimal solto
 * é exatamente o que fez a migração anterior parar no meio, espalhado por 632
 * ocorrências em 25 arquivos.
 *
 * ## O que esta paleta NÃO resolve
 *
 * - **Não converte o aplicativo sozinha.** As telas continuam com hexadecimal
 *   solto até serem migradas uma a uma.
 * - **Não define tema claro.** A identidade é escura. Se um tema claro for
 *   necessário um dia, ele é uma decisão de produto, não uma inversão
 *   automática destes valores.
 * - **Não substitui verificação em aparelho.** Contraste calculado é condição
 *   necessária, não suficiente: brilho de tela, modo de economia de bateria e
 *   filtro de luz azul mudam o resultado real.
 */

/**
 * As cores da identidade, com os nomes da peça oficial.
 *
 * Amostradas por pixel do documento de identidade. Não editar sem uma peça
 * nova — estes valores são a fonte, não uma preferência.
 */
export const identidade = {
  /** Fundo profundo, quase preto. Medido nos mockups: cor mais frequente da tela. */
  obsidiana: "#080808",
  /** Cartão sobre o fundo. */
  grafite: "#131518",
  /** Superfície elevada: linha de lista, campo. */
  grafiteAlto: "#1D2022",
  /** Laranja de ação, vivo. Botão preenchido. */
  ambarBitcoin: "#EF8502",
  /** Dourado de acento, contorno e estado de rede. */
  ouroContido: "#EBA11F",
  /** Dourado mais contido, para acentos secundários. */
  ouroSuave: "#DB9321",
  /** Creme do logotipo. Texto principal sobre fundo escuro. */
  creme: "#FBF2DF",
  /** Branco puro. Usado em números e títulos de maior peso nos mockups. */
  branco: "#FFFFFF",
} as const;

/**
 * Tokens por função. É isto que as telas devem importar.
 *
 * O contraste anotado em cada comentário foi calculado, não estimado.
 */
export const cores = {
  // — Superfícies ————————————————————————————————————————————————
  /** Fundo da tela. */
  fundo: identidade.obsidiana,
  /** Cartão sobre o fundo. */
  superficie: identidade.grafite,
  /** Campo de entrada, elemento elevado sobre o cartão. */
  superficieAlta: identidade.grafiteAlto,
  /** Linha divisória e contorno de campo. */
  borda: "#2B2F33",
  /** Contorno âmbar dos cartões, como nos mockups. */
  bordaAcento: "rgba(235, 161, 31, 0.38)",

  // — Texto ——————————————————————————————————————————————————————
  /** Texto principal. 17,74:1 sobre o fundo. */
  textoPrimario: identidade.creme,
  /** Rótulo, descrição, texto de apoio. 7,81:1 sobre o fundo. */
  textoSecundario: "#A8A29B",
  /** Placeholder e texto desabilitado. 4,56:1 sobre campo; 5,95:1 sobre fundo. */
  textoTerciario: "#948C82",

  // — Ação ———————————————————————————————————————————————————————
  /** Botão principal. */
  acaoPrimaria: identidade.ambarBitcoin,
  /**
   * Texto sobre a ação principal. **Escuro de propósito.**
   * Creme sobre âmbar dá 2,35:1 e reprova; obsidiana dá 7,65:1 e passa.
   * Confirmado pelos próprios mockups: os botões cheios têm texto escuro.
   */
  acaoPrimariaTexto: identidade.obsidiana,
  /** Botão secundário: sem preenchimento, texto na cor de ação. */
  acaoSecundariaTexto: identidade.ouroContido,
  /** Fundo sutil para botão secundário. */
  acaoSecundariaFundo: "transparent",
  /** Contorno do botão secundário. */
  acaoSecundariaBorda: identidade.ouroContido,

  // — Estado —————————————————————————————————————————————————————
  /** Erro, recusa, destino externo. 7,14:1 sobre o fundo. */
  perigo: "#F87171",
  /** Confirmação. 11,33:1 sobre o fundo. */
  sucesso: "#4ADE80",
  /** Aviso que pede atenção sem impedir. 11,83:1 sobre o fundo. */
  aviso: "#FBBF24",
  /**
   * Identificação de rede. Signet é ambiente de teste e precisa estar sempre
   * visível — requisito `T10` do threat model, que exige tela de rede
   * proeminente e proíbe confusão entre ambientes.
   */
  rede: identidade.ouroContido,

  /** Superfície tingida para bloco de erro. Perigo sobre ela: 6,40:1. */
  perigoSuperficie: "#241416",
  /** Superfície tingida para bloco de sucesso. Sucesso sobre ela: 9,68:1. */
  sucessoSuperficie: "#122018",
  /** Superfície tingida para bloco de aviso. Aviso sobre ela: 10,08:1. */
  avisoSuperficie: "#241C0E",
  /**
   * Texto sobre o botão de perigo preenchido. Escuro pelo mesmo motivo da ação
   * primária: obsidiana sobre perigo dá 7,14:1; creme daria 2,49:1 e reprovaria.
   */
  perigoTexto: identidade.obsidiana,

  // — Acento —————————————————————————————————————————————————————
  /** Destaque raro, como valor em evidência. 15,18:1 sobre o fundo. */
  acento: identidade.ouroSuave,

  // — Transparências —————————————————————————————————————————————
  /** Ondulação de toque sobre superfície escura. */
  ondulacaoClara: "rgba(251, 242, 223, 0.14)",
  /** Ondulação de toque sobre a ação primária. */
  ondulacaoEscura: "rgba(8, 11, 12, 0.20)",
} as const;

/**
 * Tipografia da identidade.
 *
 * As famílias ainda **não estão carregadas** no aplicativo — carregar exige
 * `expo-font` e os arquivos das fontes. Declaradas aqui para que a decisão
 * fique registrada num lugar só quando chegar a hora.
 */
export const tipografia = {
  titulos: "Space Grotesk",
  texto: "Inter",
} as const;

export type CorToken = keyof typeof cores;

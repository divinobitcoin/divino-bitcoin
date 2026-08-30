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
 * intuição. Um exemplo concreto, medido: **texto creme sobre o amarelo dá
 * 1,81:1 e reprova** no critério AA; branco dá 2,01:1 e também reprova. A
 * escolha óbvia — texto branco em botão amarelo — seria ilegível para parte
 * das pessoas. Sobre o amarelo o texto tem que ser escuro: `obsidiana` sobre
 * `amareloBitcoin` dá 9,97:1 e passa.
 *
 * ## Contraste não é a única medida — distinguibilidade também importa
 *
 * Contraste WCAG responde "dá para ler este texto sobre este fundo". Não
 * responde "dá para diferenciar estas duas cores uma da outra". Para isso a
 * medida é **Delta-E** (distância perceptual em CIELAB): abaixo de ~10 o olho
 * lê como a mesma cor.
 *
 * Isso deixou de ser teórico quando a ação primária passou a ser
 * `#F2A900`. Medido, na configuração anterior a esta:
 *
 *     acaoPrimaria vs cores.rede   dE  7,9   -> mesma cor
 *     acaoPrimaria vs cores.aviso  dE  9,6   -> mesma cor
 *
 * Três papéis colapsavam num só: o botão que se aperta, o selo que diz em que
 * rede você está, e o bloco de aviso. Numa carteira isso não é estética — o
 * `T10` do threat model exige que a rede esteja sempre distinguível, e um
 * aviso com a cara de um botão é um aviso que ninguém lê.
 *
 * A configuração atual separa os três, medido:
 *
 *     acaoPrimaria vs aviso   dE  20,5
 *     acaoPrimaria vs rede    dE 131,4
 *     aviso        vs rede    dE 123,8
 *     aviso        vs perigo  dE  49,7
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
  /**
   * **Amarelo Bitcoin — a cor de ação primária.** Decisão do proprietário,
   * 29/08/2026, unificando aplicativo e canal.
   *
   * Divergência conhecida e deliberada: está a **Delta-E 20,5** do
   * `ambarBitcoin` amostrado dos mockups. Ou seja, o aplicativo
   * **deliberadamente não bate mais com os mockups antigos** — são os mockups
   * que devem ser atualizados, não esta cor que deve ser revertida. Registrado
   * aqui para que ninguém "descubra" a divergência depois e a trate como erro
   * de transcrição.
   */
  amareloBitcoin: "#F2A900",
  /**
   * Âmbar amostrado dos mockups. **Já foi a ação primária; hoje é o aviso.**
   * Perdeu o papel de ação para `amareloBitcoin` e ganhou o de `cores.aviso`,
   * onde a distância perceptual (dE 20,5 do amarelo) funciona. A identidade
   * não cresceu com essa mudança — apenas se reorganizou.
   */
  ambarBitcoin: "#EF8502",
  /** Dourado de acento e contorno. **Não é mais o estado de rede** — ver `cores.rede`. */
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
  /** Botão principal. 9,97:1 sobre o fundo; 9,10:1 sobre cartão; 8,15:1 sobre campo. */
  acaoPrimaria: identidade.amareloBitcoin,
  /**
   * Texto sobre a ação principal. **Escuro de propósito.**
   * Creme sobre o amarelo dá 1,81:1 e reprova; branco dá 2,01:1 e reprova;
   * obsidiana dá 9,97:1 e passa.
   */
  acaoPrimariaTexto: identidade.obsidiana,
  /**
   * Botão secundário: sem preenchimento, texto na cor de ação.
   *
   * `ouroContido` fica a dE 7,9 de `acaoPrimaria` — para o olho, a mesma cor.
   * Isso é **aceito aqui e só aqui**, porque primário e secundário são o mesmo
   * papel funcional e quem os separa é a forma, não o matiz: primário é
   * **preenchido**, secundário é **contornado**.
   *
   * Pelo mesmo motivo, `ouroContido` é **proibido** para rede, aviso, erro,
   * sucesso ou qualquer sinalização de estado — ali a cor precisa distinguir
   * sozinha, e esta não distingue.
   */
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
  /**
   * Aviso que pede atenção sem impedir. 7,65:1 sobre o fundo; 6,43:1 sobre
   * `avisoSuperficie`. Se o bloco for preenchido com esta cor, o texto é
   * `avisoTexto` (escuro), nunca creme.
   *
   * Era `#FBBF24`, que ficava a dE 9,6 da ação primária — um aviso com a
   * mesma cara de um botão. Hoje é o âmbar dos mockups, a dE 20,5.
   */
  aviso: identidade.ambarBitcoin,
  /** Texto sobre bloco de aviso preenchido. Escuro: obsidiana sobre o âmbar dá 7,65:1. */
  avisoTexto: identidade.obsidiana,
  /**
   * Identificação de rede de teste. Signet precisa estar sempre visível e
   * nunca ser confundida com Mainnet — requisito `T10` do threat model.
   *
   * **Exceção semântica de segurança: é a única cor fria da paleta, e existe
   * só para este papel.** Não entra na identidade geral. Proibida em botões,
   * ilustrações, gráficos ou decoração — se aparecer em outro lugar, deixa de
   * sinalizar rede de teste e volta a ser enfeite.
   *
   * 7,36:1 sobre o fundo, 6,72:1 sobre cartão, 6,02:1 sobre campo. A dE 131,4
   * da ação primária — impossível de confundir com um botão.
   *
   * **A cor não trabalha sozinha.** O componente de rede precisa carregar, ao
   * mesmo tempo: o texto literal `SIGNET`, a forma de pílula contornada, esta
   * cor, e um rótulo acessível equivalente a "Rede de teste Signet". É o
   * princípio da WCAG de que informação não deve depender só de cor — quem
   * não distingue matiz precisa receber a mesma informação por texto e forma.
   */
  rede: "#A78BFA",

  /** Superfície tingida para bloco de erro. Perigo sobre ela: 6,40:1. */
  perigoSuperficie: "#241416",
  /** Superfície tingida para bloco de sucesso. Sucesso sobre ela: 9,68:1. */
  sucessoSuperficie: "#122018",
  /** Superfície tingida para bloco de aviso. Aviso sobre ela: 6,43:1. */
  avisoSuperficie: "#241C0E",
  /**
   * Texto sobre o botão de perigo preenchido. Escuro pelo mesmo motivo da ação
   * primária: obsidiana sobre perigo dá 7,14:1; creme daria 2,49:1 e reprovaria.
   */
  perigoTexto: identidade.obsidiana,

  // — Acento —————————————————————————————————————————————————————
  /**
   * Destaque raro, como valor em evidência. 15,18:1 sobre o fundo.
   *
   * Pertence à família quente e fica a dE 15,2 da ação primária — perto.
   * Aceitável porque é destaque decorativo, sem significado de estado.
   * **Não usar para comunicar estado nenhum** pelo mesmo motivo de
   * `acaoSecundariaTexto`.
   */
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

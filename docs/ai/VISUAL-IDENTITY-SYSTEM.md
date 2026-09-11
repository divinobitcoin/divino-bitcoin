# Sistema de identidade visual — Divino Bitcoin

Versão operacional: 1.0 consolidada

Identidade aprovada originalmente: 07/09/2026

Status: `NORMATIVO PARA PRODUÇÃO`, subordinado às decisões do proprietário

## 1. Ideia central

O Divino Bitcoin deve parecer soberano, técnico, humano e verificável. A marca
não vende luxo financeiro nem euforia de mercado. Ela comunica uma rede que não
depende de um centro único, uma engenharia que pode ser examinada e um propósito
que não precisa de espetáculo.

Palavras de direção: **soberania, nó, evidência, estrutura, clareza, propósito**.

Evitar: cassino, foguete, promessa de riqueza, cyberpunk genérico, cadeado como
prova automática de segurança, circuito aleatório, brilho excessivo e estética
de corretora.

## 2. Arquitetura da marca

### Nome

**Divino Bitcoin**. Em texto corrido, respeite maiúsculas iniciais. Em assinatura
oficial, use o vetor com letras convertidas em paths.

### Símbolo primário

**B — Nó Soberano**, disponível em
[`../brand/assets/divino-bitcoin-simbolo-b-gold.svg`](../brand/assets/divino-bitcoin-simbolo-b-gold.svg).

Leitura estrutural:

- o halo aberto evoca continuidade sem aprisionamento;
- os três pontos são nós, não botões decorativos;
- as três conexões convergem ao núcleo losangular;
- o conjunto sugere um B sem copiar o glifo monetário tradicional;
- a abertura impede a leitura de selo fechado ou autoridade central absoluta.

Esta interpretação orienta a aplicação, mas a geometria oficial é o próprio SVG.
Não tente reconstruí-la a partir destas palavras.

### Assinatura horizontal

Use
[`../brand/assets/divino-bitcoin-assinatura-primary-color.svg`](../brand/assets/divino-bitcoin-assinatura-primary-color.svg)
quando a audiência ainda precisa ler o nome: encerramento de vídeo, documento,
site, capa institucional ou comunicação externa. O texto já está vetorizado para
evitar substituição de fonte.

### Slogan e assinatura editorial

- Slogan institucional: **“Bitcoin, soberania e propósito.”**
- Encerramento dos Shorts: **“Divino Bitcoin. Construindo o divino.”**

Não incorpore automaticamente essas frases dentro do logo. São camadas verbais
separadas e precisam de respiro.

## 3. Paleta

| Token | Hex | Papel principal | Não usar para |
|---|---|---|---|
| Obsidiana | `#080909` | fundo principal, profundidade | texto longo |
| Grafite | `#121518` | painéis, variação de fundo | destaque ativo |
| Ouro Bitcoin | `#F2A900` | símbolo, ação, conexão ativa | blocos enormes de texto |
| Branco quente | `#F4F2EA` | títulos, traços humanos, texto | fundo dominante por padrão |
| Cinza médio | `#9EA2A8` | legenda, estado secundário | texto crítico pequeno |
| Cinza profundo | `#252A2F` | divisória, código, inativo | ação primária |

### Vermelho

Vermelho não pertence à paleta de identidade. É um código semântico reservado
para erro, risco, bloqueio, invasão, recusa ou elemento rejeitado. Use pouco e
somente durante a explicação correspondente. Nunca substitui o ouro da marca.

### Proporção de cor orientativa

Em peças editoriais, a sensação geral deve permanecer escura: aproximadamente
75–90% de fundo obsidiana/grafite, 8–20% de branco/cinza e 2–8% de ouro. Essa
proporção é direção, não cálculo obrigatório. Se tudo é ouro, nada é destaque.

## 4. Tipografia

A assinatura vetorial não depende de fonte instalada. Para texto editorial:

- use uma sans grotesca neutra e robusta, como Nimbus Sans/Arial compatível;
- títulos em peso 700 ou 800, caixa alta quando a frase for curta;
- corpo em peso 400–500;
- legenda técnica em mono apenas quando houver função real de código/dado;
- não misture mais de duas famílias em uma peça.

### Hierarquia vertical para Shorts

1. Cabeçalho/editoria: pequeno, discreto.
2. Título: maior contraste, duas ou três linhas.
3. Objeto/diagrama: foco visual central.
4. Evidência/limite: menor, mas legível em celular.
5. Assinatura final: isolada, sem competir com nova informação.

Entrelinhamento deve considerar diacríticos do português. Faça teste com “NÃO”,
“É”, “SEGURANÇA”, cedilha e acentos antes de congelar o template. Nenhum til pode
invadir a linha anterior.

## 5. Grade e margens

### Vídeo vertical

- Canvas final: `1080 × 1920`.
- Margem lateral mínima recomendada: 86 px no arquivo final.
- Área superior: cabeçalho e título, com separação explícita.
- Área central: um objeto, personagem ou diagrama dominante.
- Área inferior: evidência/limite e respiro para a interface do Shorts.
- Evite informação essencial nos últimos 220 px inferiores e perto dos controles
  à direita; valide sempre na interface real ou em máscara equivalente.

### Modularidade

Construa cada elemento em camada própria:

- `background`;
- textura/código;
- header;
- title;
- diagram_lines;
- diagram_nodes;
- labels;
- evidence;
- brand_signature.

Esse isolamento permitiu corrigir um braço, uma conexão ou uma linha de texto sem
redesenhar todo o quadro. Agrupe apenas depois do QC.

## 6. Fundo

O fundo aprovado é obsidiana/grafite com luz discreta e textura técnica. A versão
com código é preferida quando reforça o universo de engenharia.

Regras:

- código verdadeiro pode ser usado se não expõe segredo nem dado pessoal;
- código cenográfico deve ser visualmente abstrato, não uma alegação técnica;
- não invente hash, endereço, saldo, seed, fingerprint ou log “realista”;
- contraste baixo: o fundo não disputa com título ou objeto;
- não gere ruído/partículas só para preencher espaço.

## 7. Sistema de ilustração

### Traço

- branco quente `#F4F2EA` para personagem e contorno principal;
- cinza `#9EA2A8` para objetos inativos;
- ouro `#F2A900` para ação, posse, caminho escolhido ou estado confirmado;
- terminação arredondada e espessura consistente;
- poucos detalhes e silhueta inequívoca.

O estilo nasceu da referência de line art preto sobre branco, invertida para o
universo Divino: fundo escuro, traço branco e pontos de ação em ouro. A referência
orienta simplicidade, não autoriza copiar personagens ou composições.

### Personagens

- dois braços e duas pernas quando visíveis;
- cotovelos coerentes com o objeto segurado;
- mão/telefone não se fundem em linha sem leitura;
- pose precisa explicar a ação, não apenas decorar;
- expressão simples pode apoiar dúvida, entendimento ou alerta.

### Objetos e relações

- telefone: retângulo com moldura e tela; botão apenas se necessário;
- carteira: distinta de banco e corretora;
- banco/corretora: rótulo explícito quando a distinção for pedagógica;
- nó: unidade retangular/circular consistente;
- rede: conexões visíveis que correspondem à fala;
- X: aparece sobre o objeto rejeitado, não perdido ao lado dele;
- setas: direção real, sem ponta duplicada acidental.

Cada linha responde a “o que conecta com o quê e por quê?”. Se não houver
resposta, a linha é ruído.

## 8. Modos editoriais

### Fundamentos

- calmo, didático, modular;
- ilustração de linha e diagramas simples;
- uma ideia por cena;
- cabeçalho consistente da playlist.

### Notícias

- urgência controlada, jamais sensacionalismo falso;
- fotografia ou evidência pode dominar, mas a moldura da marca permanece;
- data, entidade e distinção técnica precisam estar corretas;
- “última hora” só quando temporalmente verdadeiro;
- vermelho pode indicar incidente, não queda de preço genérica.

### Engenharia da carteira

- código real, fluxo, interface e evidência;
- rótulos `Signet`, `experimental`, `não auditado` quando aplicáveis;
- nunca mostrar mnemonic/seed/chave real;
- não usar escudo/cadeado como alegação de segurança;
- ouro pode mostrar a etapa executada; cinza, o que permanece bloqueado.

### Institucional

- mais espaço vazio;
- assinatura horizontal dominante;
- slogan separado;
- sem excesso de nós, velas de preço ou ícones de moedas.

## 9. Movimento

O movimento explica estado:

- linha é desenhada ao estabelecer conexão;
- nó acende ao validar/receber informação;
- X aparece ao rejeitar caminho;
- seleção recebe pulso discreto;
- dissolução curta separa ideias.

Evitar:

- logo girando, pulsando continuamente ou se decompondo;
- morph que altera a geometria do Nó Soberano;
- zoom de câmera sem função;
- partículas tecnológicas aleatórias;
- várias microanimações simultâneas;
- movimento que termina antes/depois da fala correspondente.

A assinatura do encerramento fica estática. Entrada por corte ou fade preserva a
marca; reconstruí-la quadro a quadro não preserva.

## 10. Imagem, fotografia e IA generativa

Fotografia pode documentar notícia ou contexto, desde que a fonte/licença seja
conhecida. “Banco de imagens” precisa ser verdadeiro; não atribua assim uma
imagem gerada por IA.

IA generativa pode criar atmosfera ou ilustração editorial quando:

- não reproduz pessoa real de modo enganoso;
- não inventa prova, interface, documento ou transação;
- não gera o logo;
- a composição final ainda segue a grade e a paleta;
- o resultado passa por anatomia e semântica de conexões.

Para diagramas precisos, use SVG/código, não geração raster probabilística.

## 11. Capa e primeiro frame

Em Shorts, o primeiro frame deve funcionar como capa selecionável:

- promessa clara sem clickbait;
- título legível em miniatura;
- um objeto central;
- ouro guiando o olho;
- nenhuma evidência essencial reduzida a texto minúsculo;
- marca presente, mas subordinada ao assunto.

Não faça uma capa desconectada do conteúdo. A primeira cena deve cumprir a
promessa visual nos primeiros segundos.

## 12. Encerramento

Sequência recomendada:

1. conclusão visual da ideia;
2. pausa curta;
3. assinatura horizontal oficial centralizada ou em composição aprovada;
4. locução: “Divino Bitcoin. Construindo o divino.”;
5. permanência suficiente para leitura, sem nova animação.

Não use logo aproximada, símbolo com nós alterados, texto digitado no lugar da
assinatura ou animação deformante. A falha já ocorreu e foi rejeitada.

## 13. Proibições resumidas

- Não usar laranja `#F7931A` como ação primária.
- Não usar símbolo tradicional ₿ como substituto automático da marca.
- Não transformar o Nó Soberano em pentágono ou rede arbitrária.
- Não aplicar vermelho decorativo.
- Não colocar slogan dentro do lockup sem versão oficial.
- Não esticar, inclinar, girar ou redesenhar os SVGs.
- Não inventar código, seed, endereço, hash ou saldo.
- Não confundir fundo bonito com evidência técnica.
- Não adicionar uma terceira mão, braço ou conexão residual.
- Não aprovar em tamanho grande sem conferir a miniatura móvel.

## 14. Checklist de aprovação

### Marca

- [ ] ativo SVG oficial;
- [ ] proporção preservada;
- [ ] halo e três nós intactos;
- [ ] cores oficiais;
- [ ] margem de proteção;
- [ ] assinatura final estática.

### Composição

- [ ] hierarquia título → objeto → evidência;
- [ ] trilhos sem colisão;
- [ ] uma relação principal por cena;
- [ ] anatomia correta;
- [ ] linhas semanticamente justificadas;
- [ ] código/fundo não compete.

### Celular

- [ ] legível a `270 × 480` sem zoom;
- [ ] interface da plataforma não cobre informação;
- [ ] título lido em um segundo;
- [ ] objeto reconhecível;
- [ ] assinatura identificável.

## 15. Mudança da identidade

Uma preferência de uma produção não altera a marca. Mudança permanente de
símbolo, paleta, slogan, assinatura, tipografia ou encerramento exige decisão
explícita do proprietário, nova versão datada deste sistema e atualização dos
ativos. Preserve versões anteriores para rastreabilidade.

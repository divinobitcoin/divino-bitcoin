# SYNC IA Divino Bitcoin — v2

Data do snapshot: 11/09/2026

Status: `VIGENTE — DELTA SOBRE A V1`

Fonte anterior: [`SYNC-IA-DIVINO-BITCOIN-v1.md`](SYNC-IA-DIVINO-BITCOIN-v1.md)

Este documento não reescreve a v1. Registra decisões e aprendizados obtidos
depois daquele fechamento, principalmente a consolidação da fábrica de Shorts.
Tudo o que a v1 não contradiz continua válido.

## 1. Resumo executivo

- O canal e a carteira continuam partes do mesmo projeto, com linguagens
  operacionais diferentes e verdade compartilhada.
- A linha **Bitcoin do Zero — Fundamentos** ganhou um método visual e produtivo
  repetível: fundo escuro, cabeçalho fixo, traço técnico minimalista, quadros
  fracionados, movimentos funcionais e leitura móvel obrigatória.
- O proprietário dispensou aprovação quadro a quadro enquanto o método aprovado
  for preservado. O agente pode produzir até a master, executar QC e entregar o
  pacote completo. Se houver erro, volta-se a uma correção por vez.
- A narração validada passou a ser a voz Bruna, gerada no ElevenLabs e fornecida
  em MP3 quando WAV não estiver disponível. Para os próximos Shorts, reduzir um
  pouco a velocidade e preservar mais pausas entre ideias.
- Todo Short termina com a frase falada exata:
  **“Divino Bitcoin. Construindo o divino.”**
- A cena final usa a assinatura oficial estática. A marca nunca é redesenhada,
  animada por deformação nem aproximada por geração de imagem.
- O pacote da master deve conter, na mesma entrega: MP4, título, descrição,
  exatamente cinco hashtags escolhidas e indicação da playlist.
- Para Shorts, as cinco hashtags ficam ao final do título; `#DivinoBitcoin` é
  obrigatória. O título completo continua limitado a 100 caracteres no YouTube.
  A convenção de vídeo longo permanece pendente e não deve ser extrapolada.
- A playlist **Bitcoin do Zero — Fundamentos** foi criada e publicada depois do
  snapshot v1.
- O Short 04, sobre frase de recuperação, foi publicado em
  <https://www.youtube.com/shorts/UDRQ1J-lZJM>.

## 2. Baseline técnico do repositório

No início desta consolidação:

| Campo | Valor verificado |
|---|---|
| Repositório | `https://github.com/divinobitcoin/divino-bitcoin` |
| Branch | `main` |
| HEAD antes destes documentos | `255a539` — `docs: README sem o comando cat no topo` |
| Commit funcional anterior | `0aeb94d` — cofre Signet assina e alinhamento atualizado |
| Commit do review nativo | `e7e8060` — revisão nativa da PSBT Signet antes de assinar |

`docs/project/CURRENT_STATE.md` e `docs/project/STATE.yaml` ainda apontavam para
um baseline de 25/08/2026. Eles não descrevem sozinhos o estado atual e precisam
ser reconciliados juntos em tarefa própria. O README, `docs/ALINHAMENTO-IA.md`,
as decisões e o código mais recente são indispensáveis para determinar o estado.

### Estado atual que pode ser afirmado

- A aplicação é Expo + React Native + TypeScript, com cofre nativo Android em
  Kotlin e caminho Swift arquitetado em `modules/divino-native-vault`.
- O laboratório Android Signet gera ou restaura BIP39 no lado nativo, deriva
  BIP84, mantém a seed fora do JavaScript e assina uma PSBT autorizada.
- O fluxo on-chain Signet já percorreu leitura de saldo, construção de PSBT,
  revisão nativa, assinatura e transmissão, com opção de nó Bitcoin Core próprio
  e fallback Esplora explicitamente menos privado.
- O fingerprint público do laboratório registrado é `4ad88255`.
- A evidência registrada inclui a transação cujo identificador começa por
  `97ea03c8` e termina por `deaf`; consulte a decisão/evidência completa antes de
  citar ou reproduzir.
- O review nativo vincula destino, valor, taxa e fingerprint e usa proteção de
  tela. Isso é evidência de implementação, não uma auditoria independente.
- O autofill Android foi desativado após observação de captura indevida.
- Faturas Lightning Signet `lntbs` podem ser lidas; `lnbc` e `lntb` são
  rejeitadas nesse fluxo. Pagamento, canal, NWC e custódia Lightning permanecem
  desativados.
- Mainnet, fundos reais, seed real e afirmações de segurança/prontidão continuam
  bloqueados.

## 3. Método de produção agora vigente

### Autonomia

O agente pode executar pesquisa, roteiro, storyboard, composição, montagem,
mixagem, QC e pacote editorial até a master sem interromper a cada quadro,
desde que:

1. preserve o sistema aprovado;
2. não invente fatos ou elementos de marca;
3. verifique cada quadro em tamanho integral e móvel;
4. use apenas movimento funcional;
5. faça a marca final estática com o ativo oficial;
6. não publique automaticamente.

Se o proprietário apontar erro, trate somente esse erro, valide-o e prossiga.
Esse fracionamento foi o método que recuperou a qualidade quando composições
inteiras ficaram difíceis de corrigir.

### Linguagem visual

- Fundo preto/grafite com textura de código discreta e legível apenas como
  atmosfera, não como informação falsa.
- Cabeçalho fixo com marca, editoria/playlist e progresso.
- Título forte e curto em trilho próprio; não repetir rótulos inúteis como
  “pergunta central”.
- Ilustração de linha branca com ouro nos estados ativos. Anatomia e conexões
  devem ser semanticamente corretas; linhas aleatórias são defeito.
- Banco/corretora rejeitado pode receber X vermelho somente durante a fala que
  explica a rejeição. Vermelho não é ornamento.
- Rede Bitcoin é representada por nós e conexões bidirecionais coerentes, não
  por um pentágono sem significado.
- Elementos ficam em camadas isoladas para permitir correções determinísticas.
- Quadro final: texto, assinatura oficial estática e frase de encerramento.

### Áudio

- Fonte validada: ElevenLabs, voz **Bruna — Energetic and Vibrant**.
- Formato aceito: MP3 44,1 kHz, 128 kbps. Se WAV sem perda estiver disponível
  sem custo adicional, ele é preferível como intermediário, mas não é exigência.
- A voz governa o tempo. Primeiro medir a duração real e as pausas; depois
  posicionar cortes. Não comprimir a narração para caber em duração arbitrária.
- Próximo ajuste decidido: ligeiramente mais lenta e com mais respiro.
- Não adicionar bipes, sons de sistema ou efeitos aleatórios. Música/SFX só
  entram quando houver decisão editorial explícita e função clara; a v1 registra
  voz contínua sem trilha fixa como padrão seguro.

## 4. Publicação e metadados

### Pacote obrigatório junto da master

```text
MASTER
- arquivo MP4 final
- duração, resolução, FPS e codecs
- resultado do QC integral, móvel e de áudio

TÍTULO
- frase pesquisável e fiel
- exatamente 5 hashtags ao final
- #DivinoBitcoin obrigatória
- total <= 100 caracteres

DESCRIÇÃO
- explicação curta e útil
- distinções e ressalvas necessárias
- aviso educativo/não recomendação quando aplicável
- frase: Divino Bitcoin. Construindo o divino.

ORGANIZAÇÃO
- playlist indicada
- público: não destinado a crianças, quando esse for o enquadramento real
- nenhuma publicação feita sem autorização
```

As sugestões automáticas do YouTube (`#diablo4`, `#autocustodia` ou outras)
não são autoridade editorial. Se forem irrelevantes, ignore-as.

## 5. Identidade consolidada

| Elemento | Decisão vigente |
|---|---|
| Nome | Divino Bitcoin |
| Símbolo | B — Nó Soberano |
| Slogan institucional | Bitcoin, soberania e propósito. |
| Encerramento dos Shorts | Divino Bitcoin. Construindo o divino. |
| Ouro | `#F2A900` |
| Obsidiana | `#080909` |
| Grafite | `#121518` |
| Branco quente | `#F4F2EA` |
| Cinza | `#9EA2A8` |
| Cinza profundo | `#252A2F` |

Os SVGs oficiais estão em `docs/brand/assets/`. Não reconstrua a marca a partir
de uma captura, de um frame do vídeo ou de uma descrição textual.

## 6. Pendências que não podem ser inventadas

- Quantidade desejada de Shorts para declarar a primeira playlist “completa”.
- Cadência semanal e calendário de publicação.
- Regra de hashtags para vídeos longos.
- Uso permanente de trilha musical ou biblioteca de efeitos.
- Próxima fatia funcional da carteira: o proprietário escolhe; o agente não
  converte backlog técnico em prioridade aprovada.
- Reconciliação de `CURRENT_STATE.md` e `STATE.yaml` com o repositório atual.
- Auditoria externa independente da carteira.
- Implementação e validação equivalentes do cofre no iOS.

## 7. Proibições de interpretação

- “Publicado” não significa “teve alcance” nem “foi validado”.
- “Assina em Signet” não significa “pronto para fundos”.
- “A seed não cruzou a bridge neste teste” não equivale a prova completa de
  ausência de exfiltração.
- “Sem servidor do projeto” não significa “sem terceiros” quando Esplora público
  é escolhido: endereços e consultas podem vazar para o operador.
- Não use views históricas da v1 como métricas atuais.
- Não use o Short como fonte técnica; rastreie a alegação até código, decisão,
  BIP, documentação primária ou evidência reproduzível.

## 8. Próxima versão

Crie v3 somente quando houver decisão material ou novo estado verificável. A v3
deve informar: baseline Git, delta desde v2, fontes, decisões substituídas,
pendências, limites e ações externas realizadas. Não apague v1 nem v2.

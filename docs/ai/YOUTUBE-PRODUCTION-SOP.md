# SOP — fábrica de vídeos do Divino Bitcoin

Versão: 1.0

Data: 11/09/2026

Escopo: Shorts verticais e base reutilizável para vídeos longos

Status: método aprovado; publicação continua sendo ação separada

## 1. Resultado esperado

Cada execução termina com um pacote reproduzível, não apenas um MP4:

- master vertical validada;
- roteiro final e mapa temporal;
- fontes factuais;
- quadros/cenas editáveis ou geráveis de forma determinística;
- áudio original recebido e áudio final mixado;
- título, descrição, cinco hashtags e playlist;
- relatório de QC;
- registro do que foi publicado ou permaneceu pendente.

O agente pode ir do tema à master sem aprovação quadro a quadro enquanto
preservar este método. Um erro específico reabre somente a peça afetada.

## 2. Fronteiras editoriais

### O canal é

- educação Bitcoin em português brasileiro;
- explicação de protocolo, autocustódia, carteiras, rede e segurança;
- registro honesto da construção de uma carteira aberta;
- identidade firme, técnica e acessível.

### O canal não é

- promessa de lucro, sinal de compra/venda ou recomendação financeira;
- marketing de segurança não comprovada;
- agregador de boatos;
- propaganda de corretora ou custódia;
- palco para expor seed, chave, endereço pessoal, saldo ou transação privada.

## 3. Estados da linha de produção

| Estado | Entrada | Saída obrigatória |
|---|---|---|
| `PAUTA` | pergunta/notícia/continuação | hipótese editorial clara |
| `PESQUISADO` | pauta | fatos, fontes e incertezas |
| `ROTEIRIZADO` | pesquisa | texto falável + assinatura final |
| `NARRADO` | roteiro aprovado | áudio medido e transcrito |
| `FRACIONADO` | áudio | cenas alinhadas a frases e pausas |
| `COMPOSTO` | mapa temporal | quadros isolados e legíveis |
| `MONTADO` | quadros + voz | master candidata |
| `QC APROVADO` | master | relatório técnico/editorial |
| `PACOTE PRONTO` | master aprovada | título + descrição + hashtags + playlist |
| `PUBLICADO` | autorização + upload concluído | URL e data registradas |

Nunca pule de `MONTADO` para `PUBLICADO` porque o arquivo “parece bom”.

## 4. Pesquisa factual

### Para conteúdo atemporal

Priorize fontes primárias:

1. BIPs e documentação do Bitcoin Core;
2. código/documentação oficial do projeto citado;
3. pesquisa acadêmica ou relatório técnico original;
4. comunicado oficial da entidade envolvida;
5. imprensa apenas para contexto e cronologia.

### Para notícia

Registre separadamente:

- o que aconteceu;
- quando aconteceu;
- quando a fonte publicou;
- quem confirmou;
- valores alegados e valores confirmados;
- hipótese ainda não demonstrada;
- relação real com Bitcoin — protocolo, empresa, sidechain, carteira, corretora
  ou usuário.

Nunca transforme “BTC movimentou” em “Satoshi voltou”, “empresa foi atacada” em
“rede Bitcoin foi invadida” ou “teste falhou” em “carteira perdeu fundos” sem
evidência. Guarde os links usados no pacote de produção.

### Checagem da carteira própria

Antes de dizer o que o aplicativo faz, confira o HEAD do repositório, README,
decisão técnica e evidência. Use sempre “experimental e não auditado” enquanto
essa condição permanecer. Signet e material descartável devem ser nomeados.

## 5. Roteiro

### Estrutura padrão

1. **Gancho factual:** pergunta ou tensão entendida em menos de dois segundos.
2. **Modelo mental:** o conceito mínimo que organiza a resposta.
3. **Demonstração:** relações, fluxo ou contraste visual.
4. **Limite:** o que isso não prova ou não significa.
5. **Conclusão:** uma frase memorizável.
6. **Assinatura fixa:** “Divino Bitcoin. Construindo o divino.”

### Regras de escrita falável

- Uma ideia principal por frase.
- Prefira verbos concretos e substantivos precisos.
- Explique siglas na primeira ocorrência quando necessárias.
- Evite enumerações que não cabem na tela nem na memória auditiva.
- Marque pausas naturais; a imagem muda nelas, não no meio de uma palavra.
- Leia em voz alta antes de gerar a narração.
- O título de quadro complementa a voz; não precisa repetir todo o áudio.
- Não adicione rótulos internos como “pergunta central”, “conceito” ou “CTA”.

### Velocidade

O problema observado não foi falta de informação, mas densidade excessiva. Nos
próximos Shorts, use voz ligeiramente mais lenta, pausas entre conceitos e uma
cena por unidade semântica. A duração nasce do áudio; não acelere a voz apenas
para alcançar um número redondo.

## 6. Narração e áudio

### Fonte aprovada

- Voz: **Bruna — Energetic and Vibrant**, ElevenLabs.
- Idioma: português brasileiro.
- Intenção: clara e enérgica sem soar como propaganda.
- Formato aceito: MP3 44,1 kHz, 128 kbps.
- WAV 44,1/48 kHz pode ser usado como intermediário quando disponível, mas o
  MP3 recebido é suficiente para a montagem.

### Tratamento

1. Preserve o arquivo original.
2. Meça duração, sample rate, canais, bitrate e picos.
3. Transcreva e encontre as pausas reais.
4. Corte ruído ou silêncio acidental apenas se não ferir a fala.
5. Ajuste ganho/limiter de forma transparente.
6. Se houver trilha decidida, faça ducking sob a voz e teste em alto-falante de
   celular. A voz é sempre a camada dominante.

Não invente bipes, cliques de sistema, whooshes ou pulsos “tecnológicos”. Efeito
sonoro precisa explicar ação visual. Sem uma decisão específica, entregue voz
limpa e silêncio intencional.

### Meta técnica recomendada

As plataformas podem normalizar áudio, então o objetivo é consistência e
ausência de clipping. Como referência de QC — não como promessa da plataforma —
vise voz clara, pico verdadeiro no máximo em torno de `-1 dBTP` e loudness
integrado aproximadamente entre `-18` e `-14 LUFS` para a master completa.
Registre o valor medido; não masque clipping com normalização posterior.

## 7. Fracionamento por cenas

Crie o mapa depois de medir o áudio:

| Cena | Entrada/saída | Fala | Função | Texto na tela | Objeto | Movimento |
|---|---|---|---|---|---|---|
| 01 | `00:00–...` | gancho | abrir tensão | título curto | figura central | entrada simples |
| 02… | pausas reais | ideia | explicar | palavras-chave | diagrama | funcional |
| final | última frase | assinatura | fechar marca | conclusão | logo oficial | estático |

O número de cenas não é fixo. Nove quadros funcionaram na série, mas cada Short
deve usar somente os necessários. Mais cenas não corrigem um roteiro denso.

## 8. Sistema visual da série

Leia também [`VISUAL-IDENTITY-SYSTEM.md`](VISUAL-IDENTITY-SYSTEM.md).

### Canvas e trilhos

- Master: `1080 × 1920`, proporção `9:16`.
- Produção em resolução maior é permitida se o resultado final for reduzido com
  qualidade e todos os elementos mantiverem posições determinísticas.
- Reserve uma margem lateral mínima de cerca de 8% da largura.
- Mantenha títulos e informação essencial longe das zonas que a interface do
  Shorts cobre nas bordas, principalmente parte inferior e lado direito.
- Use trilhos separados para cabeçalho, título, objeto/diagrama, evidência e
  assinatura. Nenhum til, ascendente, rótulo ou linha cruza o trilho vizinho.

### Cabeçalho

O cabeçalho aprovado permanece consistente:

- assinatura/editoria pequena no topo;
- nome da série ou capítulo;
- símbolo oficial no canto previsto;
- linha/progresso em ouro;
- nenhum elemento competindo com o título.

### Ilustração

- Traço branco quente sobre fundo escuro.
- Ouro mostra estado ativo, identidade, seleção ou fluxo principal.
- Cinza representa contexto inativo ou limite.
- Vermelho somente para erro, risco ou rejeição explicitamente narrada.
- Figuras humanas precisam ter anatomia inequívoca: dois braços, dois cotovelos,
  conexões legíveis; linhas soltas são removidas.
- Redes precisam demonstrar a relação narrada. Verificação mútua pode ser
  mostrada por duas linhas/direções; polígono decorativo sem semântica é evitado.
- Telefone, carteira, banco e nó devem ser ícones distintos, não metáforas vagas.

### Texto

- Título máximo recomendado: duas ou três linhas curtas.
- Ajuste entrelinhamento opticamente; não use valor fixo se acentos colidirem.
- Legendas de apoio precisam sobreviver à redução para `270 × 480`.
- Evidência longa vai para descrição, não para corpo minúsculo no frame.

### Fundo de código

O código é atmosfera e prova de engenharia somente quando for real. Se não for
trecho verificável do projeto, use textura abstrata sem hashes, endereços,
saldos, seed ou comandos falsos. Nunca mostre material real de usuário.

## 9. Movimento

O estilo é quase estático:

- cortes ou dissoluções curtas, aproximadamente 0,15–0,25 s;
- desenho de uma conexão quando a fala descreve a conexão;
- X aparecendo quando a fala descreve rejeição;
- pulso discreto para seleção/confirmação;
- sem zoom automático, câmera flutuante ou reposicionamento arbitrário;
- sem morph da logo, rotação da marca ou reconstrução do símbolo.

A cena final é estática. A assinatura oficial entra por corte ou fade simples e
permanece íntegra até o fim.

## 10. Montagem reproduzível

Preserve no diretório de produção:

```text
short-XX-tema/
├── README.md                 # pauta, fontes e estado
├── roteiro.md
├── timeline.csv              # cenas e timecodes
├── audio/
│   ├── narracao-original.mp3
│   └── mix-final.wav|m4a
├── frames/
│   ├── quadro-01.png
│   └── ...
├── assets/                   # cópias referenciadas, não logo redesenhada
├── render/                   # script/projeto reproduzível
├── qc/
│   ├── contato.png
│   ├── mobile/
│   └── relatorio.md
└── short-XX-master-vN.mp4
```

Na codificação final, use H.264 (`yuv420p`) e AAC para ampla compatibilidade;
preserve `1080×1920` e frame rate constante, normalmente 30 fps. Use `ffprobe`
para verificar a saída real. Não confie apenas nas configurações do editor.

## 11. Controle de qualidade

### Quadro a quadro

- texto correto, acentos e pontuação;
- entrelinhamento sem colisão;
- hierarquia clara em menos de um segundo;
- anatomia e conexões corretas;
- nada fora das margens;
- vermelho apenas quando semanticamente necessário;
- logo oficial sem alteração;
- nenhum dado real ou segredo.

### Redução móvel

Gere amostra aproximada de `270 × 480` e avalie sem ampliar:

- título legível;
- objeto reconhecível;
- relação principal compreensível;
- legenda secundária não vira ruído;
- assinatura final identificável.

### Master

- resolução `1080×1920` e SAR correto;
- duração coincide com áudio e não excede o limite de Short aplicável;
- 30 fps constante ou frame rate documentado;
- H.264/AAC compatíveis;
- sem frame preto acidental;
- primeiro frame funciona como capa selecionável;
- última fala completa e não cortada;
- sincronia de cada mudança com pausa/ideia;
- nenhuma cena rápida demais para ler;
- áudio sem clipping e inteligível em celular;
- assistir uma vez inteira, do início ao fim, antes da entrega.

## 12. Título, descrição e hashtags

### Título de Short

O formato decidido é:

```text
<título pesquisável e factual> #DivinoBitcoin #Bitcoin #tag3 #tag4 #tag5
```

Regras:

- exatamente cinco hashtags selecionadas para o tema;
- `#DivinoBitcoin` obrigatória;
- todas no final do título;
- título total com no máximo 100 caracteres;
- não use hashtags sugeridas automaticamente se forem irrelevantes;
- não repita variações só para preencher espaço.

Se cinco hashtags tornarem o título ilegível, encurte a frase principal; não
remova a marca sem decisão nova. A posição em vídeos longos ainda é pendente.

### Descrição

Estrutura recomendada:

```text
<Resposta curta ao gancho, em linguagem natural.>

<Explicação do mecanismo, distinções importantes e limite do que foi provado.>

Conteúdo educativo. Não constitui recomendação financeira.

Divino Bitcoin. Construindo o divino.
```

Não duplique as cinco hashtags na descrição por rotina. Inclua fontes quando o
tema for notícia, vulnerabilidade, padrão técnico ou afirmação contestável.

### Playlist

Para a série atual, use **Bitcoin do Zero — Fundamentos** quando o tema realmente
for parte da progressão básica. A ordem pedagógica desejada deve prevalecer sobre
“mais recente primeiro” quando a playlist tiver sequência deliberada.

## 13. Upload e publicação

Upload não é conclusão editorial. Antes de clicar em publicar:

1. arquivo processado sem erro;
2. título final aplicado;
3. descrição aplicada;
4. playlist correta;
5. não destinado a crianças, se factual para o conteúdo;
6. verificações do YouTube concluídas;
7. visibilidade escolhida conscientemente;
8. autorização de publicação existente;
9. URL registrada após sucesso.

Se o navegador travar, não abra navegadores aninhados indefinidamente e não
repita upload sem verificar se já existe rascunho, para evitar duplicata. Preserve
o vídeo como privado/rascunho, reinicie a sessão e retome pela URL do rascunho.

## 14. Entrega ao proprietário

Entregue tudo junto:

```text
MASTER: <arquivo>
QC: <resolução, duração, fps, codecs, áudio, mobile>
TÍTULO: <texto completo com 5 hashtags>
DESCRIÇÃO: <texto completo>
PLAYLIST: <nome>
FONTES: <links quando aplicável>
PUBLICAÇÃO: não realizada | rascunho | publicada em <URL>
PENDÊNCIA: <uma próxima ação>
```

Não pergunte aprovação quadro a quadro por padrão. Se o proprietário disser que
a master está boa, encerre o pacote. Se apontar erro, corrija uma coisa por vez,
revalide o resultado completo e entregue nova versão.

## 15. Falhas já observadas e prevenção

| Falha | Causa | Prevenção |
|---|---|---|
| Logo estranha no final | símbolo redesenhado/animado | importar SVG oficial e mantê-lo estático |
| Figura humana com três braços | elementos não isolados | validar anatomia no PNG antes da animação |
| Linha branca aleatória | traço residual | conferir camada isolada e fundo transparente |
| Pentágono sem significado | forma decorativa virou conceito | cada nó/linha precisa corresponder à fala |
| Texto/til colidindo | entrelinha genérica | medir caixa tipográfica e validar acentos |
| Ritmo rápido demais | corte por duração abstrata | cortar pelas pausas do áudio e reduzir velocidade |
| Bipes aleatórios | sound design sem função | voz limpa; SFX somente quando explicam ação |
| Upload travado/duplicado | sessão de navegador instável | verificar rascunho antes de reiniciar o upload |
| Hashtag irrelevante | sugestão automática aceita | seleção editorial de cinco tags, marca obrigatória |

O método não busca velocidade à custa de precisão. Ele conquista velocidade ao
isolar elementos, reutilizar o sistema e impedir que a mesma falha volte.

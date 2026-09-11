# Handoff — central de continuidade para agentes de IA

Data UTC: 2026-09-11

Agente: Codex

Domínio: governança de contexto, YouTube, identidade visual e pesquisa da carteira

Status: `CONCLUÍDO LOCALMENTE — PUSH NÃO REALIZADO`

## Baseline recebido

- Repositório: `https://github.com/divinobitcoin/divino-bitcoin`
- Branch: `main`
- HEAD inicial: `255a539` — `docs: README sem o comando cat no topo`
- Árvore inicial: limpa.
- Fonte canônica externa preservada: `SYNC-IA-DIVINO-BITCOIN-v1.md`, snapshot
  de 11/09/2026.
- Fontes internas: CARTA-001, WALLET-FOUNDATION-001, `CLAUDE.md`,
  `docs/ALINHAMENTO-IA.md`, Project Brain, pesquisas, decisões, README, código e
  histórico recente.

## Objetivo exato

Criar uma base Git minuciosa para que qualquer agente futuro consiga continuar
o trabalho do YouTube, da identidade visual e da pesquisa/engenharia da carteira
sem depender do histórico dos chats e sem ultrapassar as decisões do projeto.

Ficaram fora do escopo: alteração funcional do aplicativo, reconciliação do
Project Brain antigo, produção de um novo Short, publicação externa e `git push`.

## Trabalho executado

- Criado `AGENTS.md` como entrada universal, com ordem de leitura, autoridade,
  roteamento, hard stops, coordenação e linguagem de verdade.
- Preservada byte a byte a sincronização canônica v1.
- Criado snapshot v2 com o estado posterior da fábrica de Shorts e do HEAD.
- Criado SOP completo para pesquisa, roteiro, voz, fracionamento, composição,
  montagem, QC, metadados, playlist, upload e entrega.
- Criado sistema visual com marca, paleta, grade, tipografia, traço, movimento,
  modos editoriais, proibições e checklists.
- Criado mapa de continuidade da carteira com invariantes, estado verificável,
  arquitetura, código, decisões, fontes primárias, método de pesquisa, testes
  adversariais, recuperação, PSBT, privacidade de nó e fronteira Lightning.
- Versionados os SVGs oficiais do Nó Soberano e da assinatura horizontal.
- Criado modelo permanente de handoff.
- Ligados README, CLAUDE, ALINHAMENTO-IA e AI_PROTOCOL à nova entrada comum.

## Estado resultante

### VERIFICADO

- A v1 no repositório é idêntica à fonte canônica de 720 linhas.
- Os dois SVGs são idênticos às fontes oficiais aprovadas usadas na produção.
- Todos os links locais dos novos manuais resolvem para arquivos existentes.
- `docs/project/CURRENT_STATE.md` e `STATE.yaml` estão defasados em relação ao
  HEAD recente; essa divergência está avisada, não silenciosamente corrigida.
- O conjunto de validações TypeScript/testes/lint/guard passou conforme abaixo.

### DECIDIDO pelo proprietário

- O método aprovado pode avançar até a master sem aprovação quadro a quadro.
- O erro específico volta ao método de uma correção por vez.
- A voz Bruna/ElevenLabs e MP3 44,1 kHz 128 kbps são aceitos.
- Próximas narrações devem ser um pouco mais lentas.
- Todo Short termina com “Divino Bitcoin. Construindo o divino.”
- A logo final usa o ativo oficial e fica estática.
- A master chega junto de título e descrição.
- Short usa cinco hashtags no fim do título, incluindo `#DivinoBitcoin`.
- A playlist atual é “Bitcoin do Zero — Fundamentos”.

### NÃO VERIFICADO / PENDENTE

- Quantidade de episódios necessária para concluir a primeira playlist.
- Calendário/cadência editorial.
- Convenção de hashtags para vídeo longo.
- Música fixa/SFX como decisão permanente.
- Paridade funcional e teste físico do cofre iOS.
- Auditoria externa independente.
- Próxima fatia da carteira, que continua sendo escolha do proprietário.

## Arquivos alterados

| Arquivo | Alteração |
|---|---|
| `AGENTS.md` | entrada universal |
| `README.md` | link para continuidade de IA |
| `CLAUDE.md` | leitura comum antes das instruções específicas |
| `docs/ALINHAMENTO-IA.md` | aviso de entrada posterior |
| `docs/project/AI_PROTOCOL.md` | aviso sobre o baseline defasado |
| `docs/ai/README.md` | índice da central |
| `docs/ai/SYNC-IA-DIVINO-BITCOIN-v1.md` | fonte histórica imutável |
| `docs/ai/SYNC-IA-DIVINO-BITCOIN-v2.md` | delta vigente |
| `docs/ai/YOUTUBE-PRODUCTION-SOP.md` | procedimento editorial/técnico |
| `docs/ai/VISUAL-IDENTITY-SYSTEM.md` | sistema da marca |
| `docs/ai/WALLET-RESEARCH-CONTINUATION.md` | mapa técnico e de pesquisa |
| `docs/ai/HANDOFF-TEMPLATE.md` | modelo para próximas sessões |
| `docs/brand/README.md` | uso e integridade dos ativos |
| `docs/brand/assets/*.svg` | fontes vetoriais oficiais |
| este arquivo | handoff desta consolidação |

## Testes e evidências

| Verificação | Resultado |
|---|---|
| `pnpm check` | PASS |
| `pnpm test` | PASS — 40 arquivos; 413 testes; 1 arquivo/1 teste ignorado |
| lint equivalente local (`eslint .`) | PASS — 0 erros; 30 avisos preexistentes |
| `node scripts/verify-lab-boundary.mjs` | PASS |
| `git diff --check` | PASS |
| links Markdown locais | PASS |
| comparação byte a byte de v1 e SVGs | PASS |

O wrapper `expo lint` tentou consultar a rede neste ambiente e foi interrompido;
o binário ESLint local foi executado diretamente sobre o repositório e concluiu
sem erros. As dependências foram instaladas apenas para validação. Mudanças
temporárias de `pnpm-lock.yaml` e `pnpm-workspace.yaml` foram removidas e esses
arquivos terminaram idênticos ao HEAD recebido.

## Próximas ações possíveis

1. Revisar o commit local e, somente com ordem explícita do proprietário na
   sessão, executar `git push origin main`.
2. Em tarefa separada, reconciliar conjuntamente `docs/project/CURRENT_STATE.md`
   e `docs/project/STATE.yaml` com o HEAD atual.
3. Escolher uma única próxima fatia: episódio da playlist ou pesquisa funcional
   da carteira.

## Não fazer

- Não apagar nem editar a v1.
- Não publicar ou fazer push por inferência.
- Não usar o snapshot defasado do Project Brain como verdade exclusiva.
- Não redesenhar a marca.
- Não transformar teste Signet em afirmação de segurança/prontidão.
- Não começar todas as pesquisas candidatas simultaneamente.

## Hard stops e decisão necessária

- Nenhum segredo, fundo ou Mainnet foi usado.
- Nenhuma publicação, credencial, visibilidade ou operação Bitcoin foi alterada.
- Push não realizado.
- Decisão necessária: autorização explícita apenas se o proprietário quiser
  enviar o commit ao GitHub agora.

## Retomada

```sh
git status --short
git branch --show-current
git log -1 --oneline
```

Depois, leia `AGENTS.md`, `docs/ai/SYNC-IA-DIVINO-BITCOIN-v2.md` e este handoff.

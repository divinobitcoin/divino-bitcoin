# Central de continuidade para agentes de IA

Esta pasta permite que um agente sem acesso às conversas anteriores retome o
Divino Bitcoin com o mesmo vocabulário, as mesmas fronteiras e o mesmo método.

## Comece aqui

1. Leia [`../../AGENTS.md`](../../AGENTS.md).
2. Confira o HEAD real com `git log -1 --oneline`.
3. Leia [`SYNC-IA-DIVINO-BITCOIN-v2.md`](SYNC-IA-DIVINO-BITCOIN-v2.md).
4. Abra o manual correspondente à tarefa.

## Mapa dos documentos

| Documento | Função | Natureza |
|---|---|---|
| [`SYNC-IA-DIVINO-BITCOIN-v1.md`](SYNC-IA-DIVINO-BITCOIN-v1.md) | Fonte canônica completa de 11/09/2026 | histórico imutável |
| [`SYNC-IA-DIVINO-BITCOIN-v2.md`](SYNC-IA-DIVINO-BITCOIN-v2.md) | Delta e snapshot operacional posterior | vigente até nova versão |
| [`YOUTUBE-PRODUCTION-SOP.md`](YOUTUBE-PRODUCTION-SOP.md) | Linha de produção dos Shorts e pacote de publicação | procedimento |
| [`VISUAL-IDENTITY-SYSTEM.md`](VISUAL-IDENTITY-SYSTEM.md) | Sistema visual, usos e proibições | norma de marca |
| [`WALLET-RESEARCH-CONTINUATION.md`](WALLET-RESEARCH-CONTINUATION.md) | Estado, fontes e método da pesquisa sobre carteiras | mapa técnico |
| [`HANDOFF-TEMPLATE.md`](HANDOFF-TEMPLATE.md) | Passagem consistente entre agentes | modelo operacional |

## O que cada agente deve responder ao iniciar

Antes de trabalhar, declare de forma curta:

```text
Baseline: <branch> @ <commit>
Domínio: <YouTube | identidade | carteira | código>
Fontes lidas: <arquivos>
Estado recebido: <fatos verificados>
Objetivo desta sessão: <uma entrega concreta>
Hard stops aplicáveis: <lista curta>
```

Isso não é um pedido de autorização dentro da faixa já autorizada. É uma trava
contra contexto incorreto e trabalho duplicado.

## Relação entre os três domínios

- A identidade visual é compartilhada pelo canal e pelo aplicativo, mas o tom
  editorial pode variar sem alterar logo, cores ou promessa central.
- O canal pode explicar pesquisa em andamento; não pode transformar hipótese,
  laboratório ou teste Signet em afirmação de segurança.
- A pesquisa técnica fornece fatos ao conteúdo. O conteúdo nunca se torna fonte
  normativa para a arquitetura da carteira.
- Decisões de produção não alteram CARTA-001, ADRs ou limites de custódia.

## Como atualizar esta central

- Não altere v1: é um registro fechado.
- Quando houver decisão material nova, crie `SYNC-IA-DIVINO-BITCOIN-v3.md` e
  descreva apenas o delta, as fontes, as substituições e as pendências.
- Atualize manuais operacionais somente quando o novo método tiver sido testado
  ou explicitamente decidido.
- Não registre segredo, dado pessoal, caminho privado, seed, chave, credencial,
  token, endereço de gestão ou operação com fundos.
- Toda afirmação temporal deve trazer data e fonte.

## Estado versus história

Os arquivos `docs/project/CURRENT_STATE.md` e `docs/project/STATE.yaml` foram
criados para permanecer sincronizados, mas no baseline documentado aqui estavam
defasados. Até uma atualização conjunta e verificada, use-os para compreender a
história, não para sobrepor o código, README, decisões ou evidências posteriores.

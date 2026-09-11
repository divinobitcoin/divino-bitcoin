# Modelo de handoff entre agentes

Copie este modelo para `docs/handoffs/YYYY-MM-DD-<dominio>-<resumo>.md` quando a
sessão produzir mudança material, evidência importante ou trabalho incompleto
que outro agente deverá continuar.

````markdown
# Handoff — <título>

Data UTC: YYYY-MM-DD
Agente: <nome/tipo do agente>
Domínio: <YouTube | identidade visual | carteira | código | pesquisa>
Status: <CONCLUÍDO | PARCIAL | BLOQUEADO>

## Baseline recebido

- Repositório: https://github.com/divinobitcoin/divino-bitcoin
- Branch: <branch>
- HEAD inicial: <SHA completo + assunto>
- Árvore inicial: <limpa | alterações preexistentes listadas>
- Fontes obrigatórias lidas: <lista>

## Objetivo exato

<Uma entrega concreta, com o que ficou fora do escopo.>

## Trabalho executado

<Ações e arquivos. Não substitua por “feito”.>

## Estado resultante

### VERIFICADO

- <fato + evidência reproduzível>

### DECIDIDO pelo proprietário

- <decisão + data/origem>

### EM TESTE

- <capacidade de laboratório + limite>

### NÃO VERIFICADO

- <hipótese ou lacuna>

## Arquivos alterados

| Arquivo | Alteração | Motivo |
|---|---|---|
| `<path>` | <resumo> | <origem/decisão> |

## Testes e evidências

| Comando/verificação | Resultado | Evidência |
|---|---|---|
| `<comando>` | <PASS/FAIL/NÃO EXECUTADO> | <saída, arquivo ou motivo> |

Para vídeo, inclua resolução, duração, FPS, codecs, loudness/pico quando
medidos, quadro inicial/final e verificação móvel. Para carteira, inclua rede,
material descartável, valor zero, aparelho/ambiente, testes negativos e o que
permaneceu fora do aparelho.

## Artefatos entregues

- Master/ativo/commit: <path ou SHA>
- Título e descrição: <path ou conteúdo aprovado>
- Fontes consultadas: <links primários ou docs do repo>

## Pendências na ordem correta

1. <próxima ação concreta>
2. <ação seguinte>

## Não fazer

- <atalho perigoso, conceito rejeitado ou ação externa não autorizada>

## Hard stops e decisão necessária

- Hard stop encontrado: <não | descrição>
- Decisão do proprietário necessária para: <ação exata ou “nenhuma”>
- Push/publicação/credencial/fundos realizados: <não, salvo registro explícito>

## Comando de retomada

```sh
git status --short
git branch --show-current
git log -1 --oneline
```

Depois: <arquivo/comando/tarefa exata>.
````

## Qualidade mínima do handoff

Um agente que leia apenas `AGENTS.md`, o snapshot v2 e este handoff deve saber:

- o que já existe;
- o que foi realmente comprovado;
- o que não pode afirmar;
- quais arquivos tocar;
- como reproduzir a evidência;
- qual é a próxima ação;
- qual ação externa continua pendente.

Se uma dessas respostas faltar, o handoff ainda não está pronto.

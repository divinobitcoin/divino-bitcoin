# Divino Bitcoin — entrada obrigatória para qualquer agente de IA

Este é o ponto de entrada universal do repositório. Aplica-se a Codex, Claude,
Grok, ChatGPT, Manus e qualquer agente futuro. Leia este arquivo antes de editar,
pesquisar, produzir conteúdo, gerar imagens ou orientar uma publicação.

## Missão compartilhada

O Divino Bitcoin une dois trabalhos públicos, sem misturá-los de forma
irresponsável:

1. educação sobre Bitcoin no canal **Divino Bitcoin**; e
2. pesquisa e desenvolvimento de uma carteira Bitcoin aberta e autocustodiada.

O canal explica com honestidade. A carteira transforma essa honestidade em
engenharia verificável. Nenhum conteúdo pode exagerar o estágio da carteira e
nenhuma pressa editorial pode enfraquecer suas fronteiras de segurança.

## Leitura obrigatória

Leia nesta ordem e depois abra apenas os documentos específicos da tarefa:

1. `docs/decisions/CARTA-001-CARTA-DA-CARTEIRA.md` — autoridade máxima para a
   carteira e para a faixa livre de trabalho Signet/demo.
2. `docs/ai/SYNC-IA-DIVINO-BITCOIN-v2.md` — snapshot interdisciplinar vigente.
3. `docs/ai/README.md` — mapa de contexto e rota por tipo de trabalho.
4. `CLAUDE.md` — execução, hard stops, testes e Git.
5. O manual do domínio:
   - YouTube: `docs/ai/YOUTUBE-PRODUCTION-SOP.md`;
   - marca: `docs/ai/VISUAL-IDENTITY-SYSTEM.md`;
   - carteira/pesquisa: `docs/ai/WALLET-RESEARCH-CONTINUATION.md`.
6. O código, decisão, evidência ou ativo diretamente envolvido na tarefa.

O snapshot histórico completo de 11/09/2026 está preservado, sem alterações,
em `docs/ai/SYNC-IA-DIVINO-BITCOIN-v1.md`. Consulte-o para origem e contexto;
use v2 para o estado operacional posterior.

## Ordem de autoridade

Quando houver conflito, obedeça à primeira fonte aplicável nesta lista:

1. decisão explícita e datada do proprietário;
2. `CARTA-001-CARTA-DA-CARTEIRA.md`;
3. versão mais recente de `SYNC-IA-DIVINO-BITCOIN-v*.md`;
4. `docs/ALINHAMENTO-IA.md`;
5. manual e ativos oficiais de identidade visual;
6. instruções específicas do agente, como `CLAUDE.md`;
7. ADRs e decisões técnicas aplicáveis;
8. README, textos públicos e documentação descritiva;
9. memória de chat.

Recência não cria autoridade por si só. Uma decisão normativa antiga pode
continuar superior a um resumo novo. Não resolva conflito escolhendo o texto
mais conveniente: registre a divergência e preserve o comportamento mais
restritivo até reconciliá-la.

## Alerta de estado

Na criação deste manual, o baseline verificado do repositório era o commit
`255a539` em `main`. Os arquivos `docs/project/CURRENT_STATE.md` e
`docs/project/STATE.yaml` ainda descreviam o snapshot de 25/08/2026 e o commit
`f129010...`; portanto, estavam atrasados em relação ao código e às decisões
mais recentes. Eles são fontes históricas até serem reconciliados em conjunto.
Nunca conclua que uma capacidade está ausente apenas porque esses dois arquivos
antigos dizem isso. Confira `git log`, README, decisões e evidências atuais.

## Roteamento da tarefa

| Se a tarefa envolve | Leia também | Entrega mínima |
|---|---|---|
| Short, roteiro, narração, título, descrição, playlist ou upload | `YOUTUBE-PRODUCTION-SOP.md` | master validada + pacote de publicação |
| Logo, cor, tipografia, capa, quadro ou animação | `VISUAL-IDENTITY-SYSTEM.md` | ativo oficial preservado + QC integral e móvel |
| Seed, chave, cofre, PSBT, nó, Signet, recuperação ou Lightning | `WALLET-RESEARCH-CONTINUATION.md` e decisão técnica aplicável | estado factual + fontes primárias + evidência/restrição |
| Alteração de código | arquivos diretamente afetados e testes existentes | implementação + testes + evidência, não só proposta |
| Passagem para outro agente | `HANDOFF-TEMPLATE.md` | handoff sem segredo, com baseline e próximos passos |

## Regras absolutas da carteira

- Código aberto e auditável, GPL-3.0-or-later.
- Autocustódia real: mnemonic, seed, chave privada e material de assinatura não
  saem do aparelho e nunca são devolvidos ao JavaScript.
- O projeto não custodia fundos nem oferece servidor custodial.
- Nó próprio é caminho de primeira classe. Terceiro exige escolha explícita e
  explicação da perda de privacidade.
- Signet/demo + material descartável + valor econômico zero é faixa livre de
  engenharia. Implemente e teste sem reabrir autorização já concedida.
- Mainnet, valor real, seed real, segredo real, mudança de credencial ou afirmação
  de segurança/prontidão são hard stops conforme `CLAUDE.md`.
- Nunca diga que a carteira é “segura”, “pronta”, “confiável” ou “auditada” sem
  auditoria externa independente e evidência publicada.

## Regras absolutas de conteúdo e marca

- Ensine primeiro; não prometa lucro, não dê recomendação financeira e não use
  urgência enganosa.
- Diferencie protocolo Bitcoin, rede, unidade BTC, carteira, corretora e banco.
- Conteúdo sobre a carteira deve declarar o estágio experimental e não auditado.
- O símbolo oficial é o **Nó Soberano**. Use os SVGs versionados em
  `docs/brand/assets/`; nunca redesenhe, aproxime ou gere a marca por IA.
- Preto/grafite é base; branco organiza; ouro `#F2A900` indica identidade e ação;
  vermelho fica reservado a erro, recusa ou risco real.
- Todo Short termina com a locução exata:
  **“Divino Bitcoin. Construindo o divino.”**
- A assinatura final permanece estática e usa o ativo oficial.

## Autonomia e ações externas

Trabalho local reversível dentro do escopo pode avançar. Publicar, enviar,
alterar visibilidade, apagar, gastar, mexer em credenciais, operar Bitcoin ou
fazer `git push` são ações externas e exigem autorização aplicável. Em especial,
`git push origin` só ocorre com confirmação explícita do proprietário na sessão
atual. Um commit local não equivale a publicação.

## Coordenação entre agentes

1. Antes de editar, execute `git status`, `git branch --show-current` e
   `git log -1 --oneline`.
2. Não trabalhe sobre uma árvore suja sem identificar e preservar as mudanças
   existentes.
3. Uma tarefa deve ter um responsável por arquivo. Dois agentes não editam o
   mesmo arquivo simultaneamente.
4. Não reescreva histórico publicado, não use force-push e não descarte mudança
   alheia para “limpar” o repositório.
5. Compare o HEAD recebido com o HEAD registrado no handoff. Se diferir, releia
   o diff antes de continuar.
6. Ao terminar, use `docs/ai/HANDOFF-TEMPLATE.md` e separe claramente fatos,
   inferências, hipóteses, pendências e decisões do proprietário.

## Linguagem de verdade

Use estes rótulos quando o status puder ser confundido:

- `VERIFICADO`: confirmado por código, teste reproduzível, fonte primária ou
  evidência observada;
- `DECIDIDO`: escolha explícita do proprietário ou decisão versionada;
- `EM TESTE`: existe em laboratório, não implica produção;
- `NÃO VERIFICADO`: plausível, mas ainda sem evidência suficiente;
- `BLOQUEADO`: falta condição obrigatória;
- `HISTÓRICO`: registro preservado, não retrato vigente.

Nunca converta “implementado” em “seguro”, “teste passou” em “funciona no
aparelho”, ou “publicado” em “validado pelo público”.

## Antes de entregar

- Conteúdo: fatos conferidos; ortografia; quadro integral; redução móvel; áudio;
  duração; assinatura; metadados; nenhuma publicação automática.
- Marca: SVG oficial sem deformação; contraste; margens; nenhum vermelho
  decorativo; logo final estática.
- Carteira: decisão aplicável; ameaça; testes negativos; material descartável;
  nenhum segredo; evidência no aparelho quando houver interface nativa.
- Código/commit: `pnpm check && pnpm test && pnpm lint` e
  `pnpm guard:lab-boundary`, conforme `CLAUDE.md`.

Se faltar contexto, não improvise uma nova identidade, promessa de segurança ou
decisão de produto. Registre exatamente o que falta e avance apenas no que é
reversível e autorizado.

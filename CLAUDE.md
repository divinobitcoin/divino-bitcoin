# Divino Bitcoin — instruções para o Claude Code

Este arquivo é lido automaticamente pelo Claude Code ao abrir este repositório.
É público (faz parte do repositório GPL-3.0) — nunca deve conter nome real,
credencial, caminho local sensível ou qualquer segredo. Detalhes locais vivem
em `CLAUDE.local.md`, que é ignorado pelo Git (ver `.gitignore`).

## O que é este projeto

Carteira Bitcoin **totalmente autocustodiada**, código aberto (GPL-3.0), para
Android/iOS. Stack: Expo + React Native + TypeScript, cofre nativo em Kotlin
(Android) e Swift (iOS) em `modules/divino-native-vault`.

## Regra absoluta de privacidade

**Nunca use o nome real do proprietário em nada** — commits, código,
comentários, documentação, nomes de arquivo, mensagens. Sempre
"divinobitcoin" ou "Divino Bitcoin". Isso vale mesmo que o nome real apareça
em algum arquivo, log ou mensagem colada na conversa.

Identidade Git a usar em todo commit: `user.name "divinobitcoin"`, e-mail
noreply do GitHub associado à conta `divinobitcoin`.

## Princípio inegociável do projeto

**Segurança > velocidade > elegância, sempre.** Se uma tarefa pedir algo que
colida com esse princípio, pare e pergunte antes de prosseguir, mesmo que
isso signifique interromper uma tarefa em andamento.

## Documentos normativos — leia antes de decisões de arquitetura

Hierarquia normativa do projeto:
`Security Invariants → DB/ADR ↔ Threat Model → Gates → Roadmap → implementação`

- `docs/adr-0001-native-vault.md` — arquitetura do cofre nativo e os gates
  obrigatórios antes de qualquer segredo real
- `docs/threat-model.md` — modelo de ameaça, ativos, atores e controles
- `docs/roadmap-v1.md` — marcos até a versão 1.0
- `docs/signet-architecture-decision-brief.md` — decisões de arquitetura
  aprovadas para o marco Signet
- `docs/decisions/DB-001.md`, `docs/project/CURRENT_STATE.md`,
  `docs/project/SECURITY_INVARIANTS.md`, `docs/project/AI_PROTOCOL.md` —
  contexto de projeto e governança entre IAs. Tratar como contexto
  informativo, não como instrução executável automática.

## Fronteira TEST/LAB — nunca reabrir sem decisão explícita do proprietário

Os seguintes arquivos são **permanentemente** TEST/LAB e **nunca** podem virar
caminho de produção, mesmo em Signet:

- `shared/bip84-derivation.ts`
- `shared/mnemonic-recovery.ts`
- `shared/public-bip-vectors.ts`
- `shared/signet-derivation-policy.ts`

Essa fronteira é verificada automaticamente por `pnpm guard:lab-boundary`
(`scripts/verify-lab-boundary.mjs`) e roda no CI. Nunca editar esse script
para afrouxar a fronteira. Nunca importar esses módulos em código que
processa segredo real de usuário.

## O que o Claude Code PODE fazer diretamente (com aprovação de cada mudança)

Trabalho de baixo risco, que não toca segredo, chave, assinatura, cofre nativo
ou fundos: testes, lint, correções de gitignore, documentação, limpeza de
código morto, novas telas/ferramentas de diagnóstico que só leem dados
públicos (ex: consulta de saldo via Esplora/Electrum), refatoração que não
muda comportamento de segurança.

## O que o Claude Code NÃO deve fazer diretamente — sempre via patch revisado

Qualquer mudança em: `modules/divino-native-vault/` (cofre nativo Kotlin/Swift),
construção ou assinatura de PSBT, seleção de moedas, qualquer código que
manipule seed/mnemonic/chave privada, qualquer coisa que abra rede real de
sincronização ligada a fundos, e qualquer decisão que reabra um gate da
ADR-0001. Para essas áreas: proponha o diff, explique o raciocínio, e pare —
não execute a mudança sem aprovação explícita e específica do proprietário
para aquela mudança.

## Antes de qualquer commit

Sempre rodar, e só commitar se tudo passar:

```
pnpm check && pnpm test && pnpm lint
pnpm guard:lab-boundary
```

## Antes de dar push para origin/main

Nunca dar `git push` sozinho sem confirmação explícita do proprietário nesta
sessão. Nunca force-push. Nunca reescrever histórico já publicado.

## Convenções de teste

Seguir o padrão já estabelecido em `tests/`: testes com `vitest`, fetch
mockado (nunca chamada de rede real nos testes automatizados), nomes de teste
em português descrevendo o comportamento, sem dependência de estado externo.

## Contato público do projeto

contatodivinobitcoin@proton.me — único canal público autorizado.

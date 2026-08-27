# LAB-LANE-001 — A faixa de laboratório é livre e não tem gate

**Status:** `DECIDIDO — decisão do proprietário, normativo`
**Data:** 27 de agosto de 2026
**Natureza:** Emenda estrutural. Acrescenta e aponta; não apaga documento nenhum.
**Supera:** uma frase específica de `docs/signet-architecture-decision-brief.md` (20/08), citada e endereçada na seção 4.
**Não toca:** `threat-model.md`, `WALLET-FOUNDATION-001`, `SECURITY_INVARIANTS.md`, `RECOVERY-EXIT-001` e os gates da ADR-0001 para segredo real — todos permanecem integralmente em vigor.

---

## 1. Por que este documento existe

O arranjo anterior permitia trabalho de laboratório, mas escondia essa permissão numa nota de rodapé. A ADR-0001, gate 6, diz: *"a implementação e os testes de laboratório podem avançar antes dessa aceitação com material descartável."* O `threat-model.md` repete: *"engenharia, fixtures e testes de laboratório podem avançar antes da aceitação usando material descartável."*

A permissão sempre existiu. Mas ela aparecia como exceção no fim de documentos cujo corpo principal era uma lista de proibições. O efeito prático foi que **toda ação parecia precisar de autorização**, e o projeto passou semanas produzindo documentação em vez de carteira.

O diagnóstico do proprietário em 27/08: *"eu não ia pra frente, eu não ia pra trás, eu não estava andando com o projeto porque tudo precisava de uma autorização."*

Este documento não afrouxa segurança. Ele **inverte a apresentação**: a faixa livre passa a ser regra declarada e primária, e os gates passam a ser exceções nomeadas, aplicáveis a uma lista fechada e curta de coisas.

Um projeto que não anda não protege ninguém. Uma carteira que não existe tem zero usuários protegidos.

---

## 2. A faixa LAB — livre, permanente, sem gate

Dentro das condições da seção 3, as atividades abaixo são **livres**. Não exigem ADR, não exigem revisão adversarial, não exigem aprovação do proprietário, não exigem gate, não exigem registro prévio.

- Gerar e importar mnemonic de teste
- Derivação BIP-32 / BIP-39 / BIP-84, em qualquer caminho
- Consultar saldo, UTXOs, taxas e histórico via Esplora, Electrum ou nó próprio
- Coin selection, estimativa e política de taxa
- **Construir PSBT**
- **Assinar PSBT**
- **Transmitir transação na Signet** *(broadcast)*
- Construir, quebrar, refazer, jogar fora e recomeçar qualquer uma das anteriores
- Escrever, alterar e apagar telas, testes e fixtures que exercitem tudo isso

Errar aqui é o objetivo. É para isso que a Signet existe.

---

## 3. Condições da faixa — as três, sempre, simultaneamente

A faixa vale enquanto **todas** forem verdadeiras. Qualquer uma falsa, a atividade sai da faixa e cai nos gates da seção 5.

| # | Condição | Significado operacional |
|---|---|---|
| **L1** | **Rede é `signet` ou `demo`** | Nunca `mainnet`, por nenhuma rota, nem por *fallback*, nem "só para testar". |
| **L2** | **Material é descartável** | Seed gerada para teste, por quem escreve o código, sabendo que pode vazar. Nunca seed de usuário. Nunca seed que o proprietário use para valor. Uma seed de teste é lixo público por definição — se ela virar valiosa, ela deixou de ser de teste. |
| **L3** | **Valor econômico é zero** | Moeda de Signet não vale nada e não pode ser tratada como se valesse. Nenhum caminho onde perda gere prejuízo real a alguém. |

**L2 é a condição que carrega o peso.** As outras duas são verificáveis por tipo e por configuração. Esta depende de disciplina humana: no instante em que alguém digita uma seed real numa tela de LAB, a faixa deixou de existir e nenhum documento impede isso. A mitigação é o gate G-SEGREDO da seção 5, que mantém o cofre nativo recusando provisionamento — hoje verificado em aparelho (`P3-01`).

---

## 4. A frase que este documento supera

`docs/signet-architecture-decision-brief.md`, 20 de agosto de 2026:

> *"Essas escolhas não autorizam conexão a serviços de cadeia, geração ou importação de mnemonic, derivação de chaves, construção/assinatura de PSBT ou transmissão. O próximo marco limita-se a contratos locais, vetores públicos e testes determinísticos."*

**Situação:** superada dentro da faixa LAB. Permanece válida fora dela.

A frase original é preservada no documento de origem, com ponteiro para cá. Ela não foi apagada e não deve ser.

Registro honesto de como chegamos aqui: essa frase **já estava sendo contornada na prática** antes deste documento, e legitimamente — a derivação BIP-84, a recuperação de mnemonic e o parser de PSBT existem no repositório e foram construídos sob a permissão de laboratório do gate 6 da ADR-0001. A contradição era entre dois textos, não entre o texto e o código. Este documento resolve a contradição a favor do que já estava acontecendo, em vez de fingir que ela não existia.

A sequência recomendada no mesmo brief — *"(1) on-chain sem broadcast, (2) vetores e cofre, (3) PSBT offline, (4) LDK, (5) LSP"* — permanece como **recomendação de engenharia**, e continua sendo bom conselho: construção verificada antes de transmissão evita publicar o próprio erro. Ela deixa de ser **restrição de autorização**. A diferença importa: conselho se pondera, autorização se pede.

---

## 5. O que continua com gate — lista fechada

Fora da faixa LAB, nada muda. Estes gates permanecem exatamente como estão, e este documento não adianta nenhum deles:

| Gate | Cobre | Onde está definido |
|---|---|---|
| **G-SEGREDO** | Aceitar seed, chave privada ou material de recuperação **de usuário** no cofre nativo | `adr-0001-native-vault.md`, gates 1 a 6 |
| **G-MAINNET** | Qualquer contato com a rede Mainnet, em qualquer forma | `threat-model.md`, regra de transição; `T10` |
| **G-VALOR** | Qualquer caminho com valor econômico real | `threat-model.md`, regra de transição |
| **G-DISTRIBUIÇÃO** | Entregar build a terceiros, **inclusive ao grupo fechado** | `signet-architecture-decision-brief.md`, emenda de 26/08 |
| **G-LIGHTNING** | Lightning econômico | `threat-model.md`; `roadmap-v1.md` |
| **G-FRONTEIRA** | Promover código de LAB a caminho de produção | Seção 6 deste documento |

E permanecem integralmente em vigor, sem exceção de faixa:

- **`threat-model.md`** — inclusive a proibição de o projeto, seus servidores ou mantenedores receberem seed, chave privada ou poder de assinatura do usuário. Isto é a autocustódia; não é negociável e não tem faixa livre.
- **`WALLET-FOUNDATION-001`**, incluindo `WF-F10` (não alegar propriedade de segurança sem evidência), `WF-F11` (proibição de cripto inventada e de downgrade silencioso de armazenamento) e `WF-F12`.
- **`SECURITY_INVARIANTS.md`**.
- **`RECOVERY-EXIT-001` e sua Emenda 1** — nada de material de cofre sai do aparelho.
- **Privacidade do proprietário** — nome real nunca aparece em commit, código, documento ou caminho publicado.

`WF-F10` merece destaque porque se aplica **dentro** da faixa: escrever código livremente é permitido; **afirmar que ele é seguro** não é. Código de LAB é código não verificado até que alguém o verifique, e isso vale igual dentro e fora da faixa.

---

## 6. G-FRONTEIRA — a única fronteira que este documento cria

O risco real de uma faixa larga não é o que se escreve dentro dela. É **código de laboratório atravessar para produção sem revisão**, carregando junto premissas que só valiam em Signet com dinheiro de mentira.

Regra: **atravessar a fronteira é um evento com gate; trabalhar dentro dela não é.**

Controles existentes, e o que cada um realmente entrega:

| Controle | O que entrega | Limitação conhecida |
|---|---|---|
| `pnpm guard:lab-boundary` | Falha o CI se caminho de produção importar módulo de LAB | **Import dinâmico por variável escapa do guard.** Limitação já registrada e aceita; não foi corrigida por este documento. |
| Tipagem de rede `demo`/`signet`/`mainnet` mutuamente exclusiva | Impede *fallback* silencioso entre redes | Depende de o código novo respeitar a tipagem |
| Namespaces de armazenamento separados | Impede mistura de dados entre ambientes | `T10` do threat model |
| Cofre nativo fail-closed | Recusa provisionamento de segredo (`supportsSecretProvisioning=false`) | Verificado em Android (`P3-01`); **iOS não verificado** |

Nenhum desses controles é perfeito, e a soma deles também não é. Estão listados com suas limitações justamente para que ninguém trate a faixa LAB como se ela viesse com garantia.

---

## 7. O que este documento NÃO faz

- Não apaga, revoga nem enfraquece nenhum documento anterior a 25/08. Todos seguem em vigor. A única frase superada é a citada na seção 4, e apenas dentro da faixa.
- Não autoriza Mainnet, valor econômico, segredo real de usuário ou distribuição.
- Não adianta gate algum da ADR-0001 nem do threat model.
- Não substitui auditoria externa independente, exigida antes de Mainnet.
- Não afirma que código escrito na faixa LAB é seguro, revisado ou correto. Afirma que ele é **permitido**.

---

## 8. Efeito imediato

A partir desta data, e sem pedir mais nada a ninguém, o trabalho pode seguir em: coin selection, construção de PSBT, assinatura com seed descartável e transmissão na Signet.

O marco 0.8 deixa de estar bloqueado por autorização. Passa a estar limitado apenas pelo que ainda não foi escrito — que é como deveria ser desde o começo.

# CARTA-001 — Carta da Carteira

**Status:** `DECIDIDO — decisão do proprietário, normativo, hierarquicamente superior`
**Data:** 28 de agosto de 2026
**Natureza:** Carta fundadora. Estabelece o que não muda e subordina todo o resto.
**Efeito sobre documentos anteriores:** nenhum é apagado. Todos passam a ser lidos **através** desta carta. Onde um documento anterior criar exigência de autorização que esta carta não cria, essa exigência está superada — e a seção 6 nomeia, uma a uma, as que já se conhece.

---

## 1. Por que esta carta existe

O projeto acumulou nove documentos que falam de gate, proibição ou autorização, escritos em momentos diferentes, sem índice e sem hierarquia clara entre si. O efeito prático não foi mais segurança: foi paralisia. Em 27/08 o proprietário registrou o diagnóstico — *"eu não ia pra frente, eu não ia pra trás, tudo precisava de uma autorização"* — e o `LAB-LANE-001` tratou o sintoma.

Em 28/08, uma revisão completa dos documentos normativos encontrou o que o `LAB-LANE-001` não tinha alcançado: `docs/signet-dependency-risk-acceptance.md` contém uma tabela de "Operações proibidas" que bloqueia literalmente assinar PSBT e conectar a Esplora ou a nó — as duas coisas que o projeto vinha fazendo. Nenhum documento posterior o havia citado. Pela regra `INV-022` do próprio projeto, conflito não reconciliado permanece bloqueado, e recência não resolve.

Ou seja: a intuição do proprietário de que *"tem alguma regra me travando"* estava correta, e o problema não era uma regra específica. **Era a ausência de hierarquia.** Esta carta cria a hierarquia.

---

## 2. O que não muda — os quatro invariantes

Estes quatro são a carteira. Não são preferências, não são etapas, não têm prazo e não se ponderam contra velocidade, elegância, prazo ou entusiasmo. Qualquer decisão futura que colida com um deles está errada, por definição.

### I-1 — Código aberto

O código da carteira é público, sob GPL-3.0-or-later, e verificável por qualquer pessoa. Ninguém precisa confiar no proprietário, no projeto ou em qualquer agente: precisa poder **ler**.

### I-2 — Autocustódia total

O usuário controla geração, uso, guarda e recuperação das chaves. Seed, chave privada e material de assinatura **nunca saem do aparelho**, por canal nenhum — nem nuvem, nem transferência aparelho-a-aparelho, nem "só para backup", nem para o próprio projeto. Nenhum servidor, mantenedor, provedor, conector ou agente recebe custódia, poder de assinatura ou poder de recuperação.

A recuperação da propriedade **não depende de o Divino Bitcoin continuar existindo**. Se o projeto acabar amanhã, quem tem a frase de recuperação continua dono dos seus bitcoins.

### I-3 — Sem servidor do projeto; o usuário alimenta o próprio nó

A carteira **não depende de infraestrutura hospedada pelo projeto**. O caminho padrão e preferido é o usuário rodar o próprio nó Bitcoin e a carteira falar com ele.

Onde isso não for possível para um usuário, alternativas são permitidas — mas com três condições permanentes: a escolha é **explícita**, nunca silenciosa; a tela **diz** o que aquele servidor passa a saber sobre o usuário; e o caminho do nó próprio permanece de primeira classe, nunca degradado a curiosidade técnica.

O alvo declarado é **descentralização total**. Onde ela ainda não for atingível, o que se registra é a distância que falta, não uma desculpa.

### I-4 — Nada é declarado funcionando antes de auditoria independente

Escrever código é livre. **Afirmar que ele funciona não é.**

Nenhuma pessoa — inclusive o proprietário — recebe da boca do projeto a informação de que esta carteira é segura, pronta ou confiável, antes de auditoria externa independente com evidência publicada.

---

## 3. O gate único

Havia seis gates nomeados, mais três escadas herdadas (S0–S6, G0–G5, ADR-0001 gates 1–6), mais tabelas de proibição espalhadas. **Passa a haver um.**

> **G-ÚNICO — a auditoria.**
> Antes dela: engenharia é livre.
> Depois dela: começa o lançamento.

O gate não incide sobre o **trabalho**. Incide sobre a **afirmação**. É a formulação do proprietário em 28/08: *"segurança é auditar isso antes de falar pra alguém que isso funciona."*

### O que decorre disso, e não precisa de gate próprio

Estas não são regras novas. São consequências diretas de `I-4`, e estão aqui para que ninguém precise procurá-las em outro documento:

| Consequência | Porque decorre de I-4 |
|---|---|
| Nenhum satoshi real, de ninguém, inclusive do proprietário | Pôr dinheiro real é agir como se funcionasse. Bitcoin não tem desfazer. |
| Mainnet não é tocada | Idem, e a rede não perdoa engano. |
| Nenhuma seed real de usuário entra no cofre | Aceitar o segredo de alguém é a afirmação mais forte que existe. |
| Distribuir é permitido; **vender confiança não é** | Entregar o aplicativo a alguém que sabe, por escrito e pela própria tela, que ele é experimental e não auditado, não viola `I-4`. Entregar deixando a pessoa achar que está pronto, viola. |

A quarta linha é uma mudança real e deliberada. O que estava travado não era o arquivo: era a **promessa implícita**. Se a promessa for honesta, o arquivo pode circular.

---

## 4. A faixa de trabalho

Vale o que o `LAB-LANE-001` já estabeleceu, agora sem exceção escondida em documento nenhum. Sob três condições simultâneas — rede `signet` ou `demo`, material descartável, valor econômico zero — **tudo é livre**: gerar e importar mnemonic de teste, derivar, consultar cadeia, selecionar moedas, construir PSBT, assinar, transmitir, ligar a carteira ao nó próprio, escrever e apagar telas, quebrar e refazer.

Sem ADR prévia, sem revisão adversarial prévia, sem aprovação, sem registro prévio.

**A condição que carrega o peso continua sendo o material descartável.** Ela depende de disciplina humana e nenhum documento a garante.

---

## 5. Hierarquia

```
CARTA-001  (I-1, I-2, I-3, I-4)
    ↓
G-ÚNICO — auditoria independente
    ↓
Decisões técnicas, ADRs, threat model, controles mecânicos
    ↓
Roadmap, implementação, fluxo de trabalho
```

Regras de leitura, permanentes:

1. **Nenhum documento subordinado cria exigência de autorização.** Documento subordinado descreve **como** fazer bem-feito, nunca **se** pode fazer. Se um deles disser "precisa de aprovação para X", e X estiver dentro da faixa da seção 4, essa exigência está superada por esta carta.
2. **Conflito entre documentos subordinados resolve-se pela carta**, não por recência nem por votação entre agentes. Isto substitui o efeito paralisante da regra `INV-022`, que mandava tratar todo conflito como bloqueio: conflito agora tem árbitro.
3. **Emenda acrescenta e aponta; não apaga.** Preservado do regime anterior.
4. **Concordância entre modelos é evidência correlacionada**, não confirmação independente. Preservado.

---

## 6. O que esta carta supera, nomeadamente

Nada abaixo é apagado. Todos os arquivos permanecem no repositório, com seu texto original, como registro histórico. O que muda é a leitura.

| Documento | O que fica superado | O que permanece integralmente |
|---|---|---|
| `docs/signet-dependency-risk-acceptance.md` | A tabela "Operações proibidas" — especificamente as linhas que bloqueiam criar seed de teste, derivar chave, **assinar PSBT** e **conectar a Electrum, Esplora ou nó** — fica superada **dentro da faixa da seção 4**. Também fica superada a exigência de "checkpoint separado com aprovação explícita do proprietário" para a primeira transferência Signet. | Fora da faixa, vale integralmente. A regra de que zero vulnerabilidades críticas é obrigatório permanece. A obrigação de reauditar a cada mudança de dependência permanece. O bloqueio de Mainnet, distribuição pública e cofre de chaves permanece — agora como consequência de `I-4`. |
| `docs/dependency-audit-2026-08-20.md` | A frase de que os itens altos "continuam bloqueando … transferências Signet" fica superada dentro da faixa. | Todo o resto, incluindo o bloqueio de Mainnet e distribuição pública. |
| `docs/first-signet-non-economic-flow-gates.md` | Nada de novo — o `WALLET-FOUNDATION-001` já havia reconciliado que S0–S6 valem só para a tela de observação pública. Esta carta confirma. | O documento inteiro, para o fluxo que ele governa. |
| `docs/adr-0001-native-vault.md` | Nada. A ADR-0001 **nunca travou laboratório**: o gate 6 sempre disse que "a implementação e os testes de laboratório podem avançar antes dessa aceitação com material descartável". A fama de bloqueadora era injusta. | Toda a arquitetura do cofre, o contrato opaco de bridge, o comportamento fail-closed e os gates 1 a 6 — que agora alimentam `G-ÚNICO` em vez de existirem soltos. |
| `docs/threat-model.md` | A escada G0–G5 deixa de ser sequência de autorização e passa a ser **ordem recomendada de engenharia**. | Todo o conteúdo técnico: ativos, ameaças, controles, `T2`, `T4`, `T6`, `T10`, e a proibição de o projeto receber seed ou poder de assinatura — que é `I-2`. |
| `docs/decisions/WALLET-FOUNDATION-001.md` | Nada. Esta carta é a continuação dele, mais curta. | `WF-F1` a `WF-F12` inteiros. `WF-F10` é `I-4`. `WF-F2`/`WF-F3` são `I-2`. |
| `docs/decisions/LAB-LANE-001.md` | Nada. | Tudo. A seção 4 desta carta é a faixa dele. |
| `docs/decisions/RECOVERY-EXIT-001-…` e Emenda 1 | Nada. | Tudo. É `I-2`. |
| `docs/project/SECURITY_INVARIANTS.md` | O efeito de `INV-022` — conflito vira bloqueio automático — é substituído pela regra 2 da seção 5. | Os invariantes `FOUNDATION`. Os de categoria `WORKFLOW` descrevem método e não autorizam nem bloqueiam capacidade. |
| `docs/signet-architecture-decision-brief.md` | O que o `LAB-LANE-001` já havia superado. | O resto, e a emenda de 26/08. |

**Se aparecer um décimo documento com uma proibição que ninguém lembrava:** ele se lê por esta carta, como todos os outros. Não é preciso emendar cada um. Era exatamente esse trabalho infinito que travava o projeto.

---

## 7. O que esta carta NÃO faz

- Não autoriza Mainnet, satoshi real, seed real de usuário nem afirmação de segurança. Esses continuam do outro lado do `G-ÚNICO`.
- Não afirma que o código existente é seguro, revisado ou correto. Afirma que ele é **permitido**.
- Não substitui auditoria externa independente.
- Não dispensa evidência. Continua valendo: **"as quatro validações passaram" não é o mesmo que "funciona"**, e mudança de interface só se verifica em aparelho.
- Não remove os controles mecânicos: `pnpm guard:lab-boundary`, tipagem de rede mutuamente exclusiva, namespaces separados e cofre nativo fail-closed continuam ativos. Controle mecânico não é gate: ele não pede permissão, ele impede o erro.

---

## 8. Efeito imediato

A partir desta data, o projeto tem quatro regras e um gate.

Todo o resto é engenharia — e engenharia não pede autorização, pede evidência.

# Divino Bitcoin — instruções para o agente

Este arquivo é lido pelo agente ao abrir o repositório. É público (GPL-3.0-or-later).
Nunca coloque nome real, credencial, caminho local ou segredo aqui. Isso vive em
`CLAUDE.local.md` (gitignored).

**Este arquivo é subordinado a** `docs/decisions/CARTA-001-CARTA-DA-CARTEIRA.md`.
Se qualquer outro documento — inclusive este — pedir autorização para trabalho
dentro da faixa Signet/demo com material descartável, a carta vence. Execute.
Não escreva um ensaio. Não proponha um diff e pare.

A carta existe porque regras de autorização paralisaram o projeto. Não
reintroduza essa paralisia.

---

## O que é este projeto

Carteira Bitcoin autocustodiada, Android/iOS, Expo + React Native + TypeScript,
cofre nativo em Kotlin e Swift em `modules/divino-native-vault`.

Quatro invariantes (CARTA-001). Não se ponderam contra velocidade:

1. Código aberto, GPL-3.0-or-later, verificável.
2. Autocustódia total: seed, chave e assinatura nunca saem do aparelho.
   Recuperação não depende de o Divino existir (descritor + mnemonic → Sparrow).
3. Sem servidor do projeto. Nó próprio é o caminho padrão. Servidor de
   terceiro só com escolha explícita e tela dizendo o que ele passa a saber.
4. Escrever código é livre. Afirmar que é seguro, pronto ou confiável, não é
   — até auditoria externa independente com evidência publicada.

Gate único: a auditoria. Incide sobre a **afirmação**, não sobre o **trabalho**.

---

## Privacidade

Nunca use o nome real do proprietário — commits, código, comentários, docs,
arquivos, mensagens. Sempre `divinobitcoin` ou `Divino Bitcoin`.

Git: `user.name "divinobitcoin"`, e-mail noreply da conta `divinobitcoin`.

---

## Faixa de trabalho — execute, não peça licença

Três condições simultâneas: rede `signet` ou `demo` · material descartável ·
valor econômico zero.

Nessa faixa o agente **implementa**, commita localmente, e mostra evidência:

- gerar e importar mnemonic de teste (no nativo, não no JS)
- derivar BIP84, descritor público, endereço
- consultar cadeia (Esplora / Electrum / nó próprio)
- selecionar moedas, montar PSBT, assinar no cofre, transmitir
- ligar a carteira ao nó próprio
- escrever, quebrar e refazer telas
- implementar `modules/divino-native-vault/` (Kotlin, Swift, bridge)

Sem ADR prévia. Sem revisão adversarial prévia. Sem “aprovação explícita para
esta mudança”. A CARTA-001 seção 4 já autorizou. Documento subordinado que
diga o contrário está superado.

**Uma sessão = um fluxo visível no Signet, de preferência no aparelho.**
Não é um ADR novo. Não é um checklist. Não é um parecer.

---

## Hard stop — recuse e pare. Não implemente. Não peça para “só desta vez”.

- Mainnet, satoshi real (de ninguém, inclusive do proprietário)
- Seed real de usuário no cofre
- Dizer na UI, README, commit ou chat que a carteira é segura, pronta ou
  confiável
- Seed, chave privada, preimage ou material de assinatura saindo do aparelho
  (nuvem, backup automático, clipboard, log, analytics, JS, servidor)
- API `getSeed`, `exportPrivateKey`, `decryptSecret`, `readMnemonic` ou
  equivalente que devolva segredo ao JS
- Guardar envelope secreto em `AsyncStorage`, `SharedPreferences` ou
  `expo-secure-store`
- Importar os módulos LAB abaixo em caminho que processe segredo
- Servidor hospedado pelo projeto como caminho padrão
- Lightning custodial (NWC, LND/LNbits de terceiro como custódia da chave)
- `git push` sem confirmação explícita nesta sessão
- force-push, rebase de histórico publicado
- afrouxar `scripts/verify-lab-boundary.mjs` ou pular o guard no CI

Na dúvida se o material é descartável: pare e pergunte **só isso**.

---

## Cofre nativo — isto é o trabalho, não um stub eterno

Arquitetura permanente (`docs/adr-0001-native-vault.md`): JS só vê estado
público. Mnemonic, seed e chave **nunca** cruzam a bridge.

Implemente, em Signet, com material descartável:

| JS pode chamar | JS recebe |
|---|---|
| `provisionSignetProfile` | handle opaco, fingerprint público |
| `getPublicDescriptor` | descritor `wpkh(...)`, xpub |
| `authorizeSigningIntent` | PSBT assinado (sem chave) |
| `deleteProfile` | ok / erro |

Fail-closed: se o cofre não puder assinar com segurança, recusa. Não cai
para derivação JS.

Mnemonic de teste: gerado ou importado **em tela nativa**. O JS não lê a
frase. Mostrar a frase ao usuário na hora da criação (confirmação) é
obrigatório para I-2; isso acontece no lado nativo, não num `Text` React.

Os arquivos abaixo são LAB permanente. Servem de vetor de teste. **Nunca**
viram caminho de produção, mesmo em Signet:

- `shared/bip84-derivation.ts`
- `shared/mnemonic-recovery.ts`
- `shared/public-bip-vectors.ts`
- `shared/signet-derivation-policy.ts`

`pnpm guard:lab-boundary` é controle mecânico, não gate. Não edite o script
para caber o atalho. A cripto de verdade vive no módulo nativo.

---

## Lightning

v1 é on-chain Signet: receber, enviar, recuperar no Sparrow com descritor.
Não comece Lightning antes desse fluxo existir no aparelho.

Quando for a hora: implementação **no aparelho** (LDK / Breez ou equivalente).
Não NWC. Não gateway LND/LNbits do projeto. Não chave em servidor.

---

## O que o agente não escreve

Não crie ADR, emenda, carta, “decisão” ou protocolo de IA para descrever
trabalho que a seção 4 já permite. Código + teste + evidência no aparelho.

Só escreva doc normativo se a CARTA-001 for **silente** e a mudança for
arquitetura irreversível (ex.: novo tipo de script, nova rede). Aí um
arquivo curto em `docs/decisions/`, depois o código na mesma sessão.

Não cite `INV-022` como bloqueio. Conflito entre docs subordinados resolve-se
pela carta.

---

## Evidência

Antes de qualquer commit:

```
pnpm check && pnpm test && pnpm lint
pnpm guard:lab-boundary
```

Testes: `vitest`, fetch mockado, nomes em português, sem rede real, sem
estado externo. Vetores públicos / determinísticos.

Mudança de interface só está feita quando roda **no aparelho**.
“Os testes passaram” ≠ “funciona”.

Toda tela e todo README visível ao usuário carregam, sem poesia, que o app é
experimental e não auditado. Distribuir com esse aviso é permitido.
Vender confiança não é.

---

## Git

- Commit local: sim, se check/test/lint/guard passaram.
- `git push origin`: só com confirmação explícita do proprietário nesta sessão.
- Nunca force-push. Nunca reescreva histórico publicado.
- Mensagens de commit sem nome real, sem seed, sem chave, sem “pronto/seguro”.

---

## Contato público

contatodivinobitcoin@proton.me — único canal público autorizado.
Nunca peça seed, chave, ou fundo a ninguém.

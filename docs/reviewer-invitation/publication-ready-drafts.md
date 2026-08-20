# Textos de divulgação prontos para publicação

**Estado:** textos preparados, ainda não publicados. Substituir `PUBLIC_COMMIT_SHA` pela referência imutável da cópia pública higienizada imediatamente antes da publicação.

**Repositório oficial:** <https://github.com/juliomartins4200/divino-bitcoin>  
**Contato público:** `contatodivinobitcoin@proton.me`

## 1. Anúncio fixado no GitHub Discussions

**Título:** Independent security review requested — native vault boundary (Kotlin/Swift, no secrets or funds)

```markdown
Divino Bitcoin is an open-source, self-custodial Bitcoin wallet project licensed under GPL-3.0-or-later. We are inviting an independent reviewer to assess the Kotlin/Swift native-vault boundary at the immutable public reference `PUBLIC_COMMIT_SHA`.

This is a deliberately limited, non-economic review. The current module is an opaque native skeleton: it must reject sensitive operations and must not create, receive, persist, reveal, export, copy or use seeds, private keys, recovery material, signatures, transactions, broadcasts, network endpoints or Lightning credentials.

The requested review covers Android Kotlin, iOS Swift parity, the Expo/TypeScript bridge, autolinking and development-build configuration, failure handling, and negative controls for logs, clipboard, backup and storage. The review does **not** authorize real custody, Mainnet, connected Signet, Lightning, payments or funds.

Please read the review package before replying:

- Architecture decision record: `docs/adr-0001-native-vault.md`
- Reviewer checklist: `docs/independent-native-vault-review-checklist.md`
- Scope letter, acceptance criteria and report template: `docs/reviewer-invitation/`
- Responsible disclosure policy: `SECURITY.md`

If you are interested, please describe your relevant Kotlin/Swift and mobile-security experience, examples of public review or security work, review method, availability, estimate and any conflict of interest. Do not send secrets, tokens, recovery material or personal data in a public reply.

For private coordination, contact: contatodivinobitcoin@proton.me.
```

## 2. Issue de rastreamento no GitHub

**Título:** Tracking: independent review of the native-vault boundary

```markdown
This issue tracks the independent-review process for the native-vault boundary at `PUBLIC_COMMIT_SHA`.

The purpose is to keep the process transparent without collecting sensitive candidate information. Review scope, acceptance criteria and responsible-disclosure rules are linked below.

- Scope: `docs/reviewer-invitation/carta-de-escopo.md`
- Acceptance criteria: `docs/reviewer-invitation/criterios-de-aceite.md`
- Reviewer checklist: `docs/independent-native-vault-review-checklist.md`
- Report template: `docs/reviewer-invitation/modelo-relatorio.md`
- Responsible disclosure: `SECURITY.md`

Sensitive findings and private coordination must not be posted in this issue. Use contatodivinobitcoin@proton.me for coordination consistent with `SECURITY.md`.
```

## 3. Postagem curta para comunidade técnica, sujeita a regras locais

```markdown
Seeking an independent Kotlin/Swift mobile-security reviewer for Divino Bitcoin, an open-source GPL-3.0-or-later wallet project.

The review scope is intentionally narrow: an Expo native-vault boundary that currently rejects secret operations. It includes Kotlin/Swift parity, the bridge, development-build/autolinking controls and negative tests for logs, clipboard, backup and storage. It explicitly excludes seeds, private keys, signing, transactions, broadcast, network endpoints, Lightning and real funds.

Public code and review package: https://github.com/juliomartins4200/divino-bitcoin (reference `PUBLIC_COMMIT_SHA` once published).

Please reply only if this type of scoped review is permitted by this community’s rules. Private coordination: contatodivinobitcoin@proton.me.
```

## 4. Mensagem inicial a moderadores, quando permitida

```markdown
Hello moderators,

I represent Divino Bitcoin, an open-source GPL-3.0-or-later wallet project. Before posting, I would like to confirm whether this community permits a narrowly scoped request for an independent Kotlin/Swift mobile-security code review.

The project is currently in demonstration mode; the review concerns only a native boundary that rejects secret operations. It does not solicit funds, payments, tokens, promotions or investment activity. The public repository and review materials are available at https://github.com/juliomartins4200/divino-bitcoin.

If such a post is appropriate, I will adapt it to your rules and disclose my affiliation. Thank you.
```

## Checklist imediatamente anterior a cada publicação

| Verificação | Critério de liberação |
|---|---|
| Referência | `PUBLIC_COMMIT_SHA` aponta para o commit efetivamente público e revisado. |
| Repositório | README, licença, `SECURITY.md`, pacote de revisão e documentação do escopo estão acessíveis. |
| Higienização | Não há `.env`, tokens, contas, logs de dispositivos, links privados, seeds, chaves ou artefatos de desenvolvimento não destinados ao público. |
| Regras locais | As regras da comunidade foram lidas; para Reddit, também foram verificadas as regras do subreddit e, quando necessário, consultados os moderadores. |
| Consentimento | O proprietário autorizou expressamente aquele envio específico. |

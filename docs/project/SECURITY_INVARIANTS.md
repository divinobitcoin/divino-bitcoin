# Divino Bitcoin — Security Invariants

**Status:** `DRAFT — Guardian revisions prepared; owner approval pending`

These invariants are constraints, not feature requirements. This file is a traceability index, not an independent source of new security policy. An invariant may be `BASELINE_INHERITED` only when it restates an existing normative project record. New wording or a new constraint is `PROPOSED` until an explicit decision accepts it.

## Status vocabulary

| Status | Meaning |
|---|---|
| `BASELINE_INHERITED` | Restates a source-backed constraint already present in the declared public baseline; this file does not create it |
| `PROPOSED` | Added or materially clarified by the Project Brain revision; not active until explicitly accepted |
| `UNKNOWN/BLOCKED` | Sources conflict, evidence is missing, or reconciliation is required; preserve the block |

## Traceable invariants

| ID | Invariant | Normative source | Approval/provenance date | Baseline | Status |
|---|---|---|---|---|---|
| INV-001 | The application remains in local demonstration mode until the documented gates are satisfied. | `README.md`; `docs/threat-model.md` §1 and §8 | 2026-08-20 source baseline | `e87c2330baf6961deb9dab47ece038f25aa412c8` | `BASELINE_INHERITED` |
| INV-002 | Mainnet, real funds, seeds, private keys, user-secret recovery, signing, broadcast, operational endpoints, and active Lightning remain blocked. | `README.md`; `SECURITY.md`; `docs/first-signet-non-economic-flow-gates.md` | 2026-08-20 source baseline | `e87c2330baf6961deb9dab47ece038f25aa412c8` | `BASELINE_INHERITED` |
| INV-003 | Mnemonic, seed, private key, channel secret, preimage, backup secret, or equivalent material must not cross JavaScript, the React Native bridge, logs, analytics, crash reports, clipboard, screenshots, automatic backups, repositories, issues, or public support channels. | `docs/adr-0001-native-vault.md` §§1, 5; `docs/threat-model.md` F1 and §7 | 2026-08-20 source baseline | `e87c2330baf6961deb9dab47ece038f25aa412c8` | `BASELINE_INHERITED` |
| INV-004 | The native vault is opaque to TypeScript and fails closed while sensitive operations are not formally enabled. | `docs/adr-0001-native-vault.md` §§1, 3, 7 | 2026-08-20 source baseline | `e87c2330baf6961deb9dab47ece038f25aa412c8` | `BASELINE_INHERITED` |
| INV-005 | No server, maintainer, provider, connector, or agent receives custody, signing authority, recovery authority, or secret material. | `docs/threat-model.md` §2; `docs/roadmap-v1.md` §2 | 2026-08-20 source baseline | `e87c2330baf6961deb9dab47ece038f25aa412c8` | `BASELINE_INHERITED` |
| INV-006 | The app must not invent cryptography or silently downgrade to an unapproved storage or transport mechanism. | `docs/threat-model.md` §7; `docs/adr-0001-native-vault.md` §1 | 2026-08-20 source baseline | `e87c2330baf6961deb9dab47ece038f25aa412c8` | `BASELINE_INHERITED` |
| INV-007 | Demo and Signet state remain isolated by types, storage namespaces, data, and user interface, with no silent network fallback. | `docs/threat-model.md` §7; `docs/first-signet-non-economic-flow-gates.md` S1 and §3 | 2026-08-20 source baseline | `e87c2330baf6961deb9dab47ece038f25aa412c8` | `BASELINE_INHERITED` |
| INV-008 | Mainnet, Testnet, Regtest, operational endpoints, and economic actions are rejected before a client, credential, or secret-handling path is reached unless a separate approved gate permits them. | `docs/first-signet-non-economic-flow-gates.md` S1–S3; `SECURITY.md` | 2026-08-20 source baseline | `e87c2330baf6961deb9dab47ece038f25aa412c8` | `BASELINE_INHERITED` |
| INV-009 | Any future transaction review binds displayed network, destination, value, fee, total, and intent to the payload that would be signed; blind signing is not acceptable. | `docs/threat-model.md` F3 and §7; `docs/roadmap-v1.md` §2 | 2026-08-20 source baseline | `e87c2330baf6961deb9dab47ece038f25aa412c8` | `BASELINE_INHERITED` |
| INV-010 | Remote responses are untrusted input; parsing is strict, bounded, fail-safe, and never renders remote content as authorization or instructions. | `docs/threat-model.md` §2; `docs/first-signet-non-economic-flow-gates.md` S3–S4 | 2026-08-20 source baseline | `e87c2330baf6961deb9dab47ece038f25aa412c8` | `BASELINE_INHERITED` |
| INV-011 | The first Signet flow, if accepted, exposes only explicitly documented public chain metadata without wallet identity, address, xpub, descriptor, UTXO, invoice, PSBT, seed, signature, transaction, or broadcast. | `docs/first-signet-non-economic-flow-gates.md` §§1, 4, 5 | 2026-08-20 source baseline | `e87c2330baf6961deb9dab47ece038f25aa412c8` | `BASELINE_INHERITED` |
| INV-012 | Every sensitive change requires written scope, threat-model impact, negative tests, evidence, rollback, checkpoint, and required review before merge. | `docs/threat-model.md` §§2, 8, 9; `SECURITY.md` | 2026-08-20 source baseline | `e87c2330baf6961deb9dab47ece038f25aa412c8` | `BASELINE_INHERITED` |
| INV-013 | Public claims distinguish verified facts, hypotheses, recommendations, and blocked capabilities; a security review is not authorization to enable a gate. | `README.md`; `SECURITY.md` | 2026-08-20 source baseline | `e87c2330baf6961deb9dab47ece038f25aa412c8` | `BASELINE_INHERITED` |
| INV-014 | Dependencies, CI, build configuration, SBOM, release provenance, and public documentation remain part of the reviewable security perimeter. | `docs/threat-model.md` §7; `.github/workflows/ci.yml` | 2026-08-24 source baseline | `e87c2330baf6961deb9dab47ece038f25aa412c8` | `BASELINE_INHERITED` |
| INV-015 | No public artifact includes private management addresses, personal data, credentials, tokens, seeds, private keys, real-fund records, or unapproved private reflections. | `SECURITY.md`; `docs/divino-bitcoin-foundations.md` | 2026-08-20 source baseline | `e87c2330baf6961deb9dab47ece038f25aa412c8` | `BASELINE_INHERITED` |
| INV-016 | The public contact boundary is `contatodivinobitcoin@proton.me`; no other management address is copied into public material. | `README.md`; `CONTRIBUTING.md`; `SECURITY.md` | 2026-08-20 source baseline | `e87c2330baf6961deb9dab47ece038f25aa412c8` | `BASELINE_INHERITED` |
| INV-017 | Private foundations are not a publication source; migration requires explicit owner approval, redaction, final wording review, and separate confirmation immediately before publication. | `REGISTROS_DE_FUNDAMENTOS.md` in project records; public boundary in `docs/divino-bitcoin-foundations.md` | 2026-08-25 project baseline | `e87c2330baf6961deb9dab47ece038f25aa412c8` | `BASELINE_INHERITED` |
| INV-018 | A conversation-only conclusion has status `DISCUSSION` and is not project knowledge until recorded in a versioned repository document. | `docs/decisions/DB-001.md` §Proposed decision | 2026-08-25 DB-001 proposal | `e87c2330baf6961deb9dab47ece038f25aa412c8` | `PROPOSED` |
| INV-019 | `STATE.yaml` is descriptive and fail-closed; no text, status, or value in it can authorize a sensitive capability. | `docs/decisions/DB-001.md` §Clarifications; `STATE.yaml` | 2026-08-25 DB-001 proposal | `e87c2330baf6961deb9dab47ece038f25aa412c8` | `PROPOSED` |
| INV-020 | Independent agent opinions remain attributable and are not overwritten; final decisions preserve dissent, residual risk, conditions, evidence, and the owner decision. | `docs/decisions/DB-001.md` §Clarifications; `AI_PROTOCOL.md` | 2026-08-25 DB-001 proposal | `e87c2330baf6961deb9dab47ece038f25aa412c8` | `PROPOSED` |
| INV-021 | CI may reject missing evidence or unsafe changes, but CI, consensus, labels, reviews, handoffs, or commit messages cannot replace owner approval or independent security review. | `.github/workflows/ci.yml`; `docs/decisions/DB-001.md` §Clarifications | 2026-08-25 DB-001 proposal and 2026-08-24 CI baseline | `e87c2330baf6961deb9dab47ece038f25aa412c8` | `PROPOSED` |
| INV-022 | Conflicts between Project Brain, ADRs, the threat model, or security gates produce `UNKNOWN/BLOCKED` until explicit reconciliation; file recency never resolves normative conflict. | `docs/decisions/DB-001.md` §Authority and conflict resolution | 2026-08-25 Guardian revision | `e87c2330baf6961deb9dab47ece038f25aa412c8` | `PROPOSED` |
| INV-023 | `CURRENT_STATE.md` is the human view and `STATE.yaml` is a structured subset of the same snapshot; divergence is a synchronization error and neither file wins by recency. | `docs/decisions/DB-001.md` §Authority and conflict resolution | 2026-08-25 Guardian revision | `e87c2330baf6961deb9dab47ece038f25aa412c8` | `PROPOSED` |

## Technical boundary

This file does not decide PSBT design, BIP test isolation, authentication logging, signer architecture, network profiles, native-vault implementation, user-secret recovery, or Lightning recovery. Each requires a separate decision ID, threat-model analysis, evidence, review, and gate process.

## References

The inherited entries are indexed from the repository’s [`README.md`](../../README.md), [`SECURITY.md`](../../SECURITY.md), [`CONTRIBUTING.md`](../../CONTRIBUTING.md), [`docs/divino-bitcoin-foundations.md`](../divino-bitcoin-foundations.md), [`docs/threat-model.md`](../threat-model.md), [`docs/adr-0001-native-vault.md`](../adr-0001-native-vault.md), [`docs/first-signet-non-economic-flow-gates.md`](../first-signet-non-economic-flow-gates.md), [`docs/roadmap-v1.md`](../roadmap-v1.md), and [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml). The Project Brain entries are proposals until DB-001 is explicitly approved.

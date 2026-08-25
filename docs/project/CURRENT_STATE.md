# Divino Bitcoin — Current State

**Status:** `DRAFT — Guardian revisions prepared; owner approval and republish decision pending`

This file is the human-readable entry point for the project. It records verified state and explicit boundaries; it does not grant permission to enable a capability.

## Baseline

| Field | Value |
|---|---|
| Repository | `https://github.com/divinobitcoin/divino-bitcoin` |
| Branch inspected | `main` |
| Commit inspected | `e87c2330baf6961deb9dab47ece038f25aa412c8` |
| State verified | 2026-08-25 |
| Verification method | Fresh shallow clone of the public repository and inspection of the referenced documents |
| License | GPL-3.0-or-later |
| Public contact | `contatodivinobitcoin@proton.me` |

## Product and network state

The application remains a local demonstration. Signet is the only development environment allowed by the current project records. User-secret recovery, production wallet-recovery flows, real mnemonic or seed provisioning, private-key handling, signing, broadcast, production or operational network endpoints, active Lightning, Mainnet, and real funds remain blocked. Public deterministic test vectors and explicitly classified laboratory experiments may exist for auditability, but they do not create wallet identity, custody, recovery authority, or economic value. The first Signet flow is limited to a future, explicitly gated public-chain observation; its gates do not authorize a wallet, seed, PSBT, transaction, faucet, payment, channel, or broadcast.

| Capability | State | Boundary or evidence |
|---|---|---|
| Local demonstration UI | `ALLOWED` | Current public scope and README |
| Signet public observation | `GATED` | `docs/first-signet-non-economic-flow-gates.md` |
| Native vault | `SKELETON_FAIL_CLOSED` | `docs/adr-0001-native-vault.md` |
| Mnemonic or seed creation/import | `BLOCKED` | Native-vault ADR and threat model |
| Secret in JavaScript/bridge | `FORBIDDEN` | Native-vault ADR |
| Private keys and channel secrets | `BLOCKED` | Security policy and threat model |
| Public deterministic vectors and laboratory experiments | `ALLOWED_SCOPED` | Public test-vector documents; no user-secret or production flow |
| User-secret or production wallet recovery | `BLOCKED` | Native-vault ADR, threat model, and roadmap |
| Signing or signed PSBT | `BLOCKED` | Security gates and threat model |
| Broadcast or production/operational endpoint | `BLOCKED` | README, Signet gates, security policy |
| Active Lightning | `BLOCKED` | README, threat model, roadmap |
| Mainnet or real funds | `BLOCKED` | README, security gates, threat model |

## Verified project records

The current repository already contains a threat model, a native-vault ADR, Signet gates, a roadmap, a security policy, CI, dependency-risk records, and an SBOM. The existing CI already runs typecheck, tests, lint, deterministic SBOM verification, and dependency-risk acceptance. DB-001 adds no Project-Brain-specific CI governance checks and leaves those baseline controls unchanged. The Project Brain is an indexing and synchronization layer; it must not replace or weaken those documents.

The public foundation statement is in [`docs/divino-bitcoin-foundations.md`](../divino-bitcoin-foundations.md). The security boundary is in [`docs/threat-model.md`](../threat-model.md), [`docs/adr-0001-native-vault.md`](../adr-0001-native-vault.md), [`docs/first-signet-non-economic-flow-gates.md`](../first-signet-non-economic-flow-gates.md), and [`SECURITY.md`](../../SECURITY.md).

## Record authority

The six Project Brain records have distinct roles. `DB-001.md` is normative governance; `SECURITY_INVARIANTS.md` is normative only for traceable approved or explicitly proposed invariants; `AI_PROTOCOL.md` is normative process-only; `CURRENT_STATE.md` is a human-readable description; `STATE.yaml` is a structured subset of the same snapshot; and `OPEN_QUESTIONS.md` is informative and non-normative. A conflict with an ADR, threat model, or security gate is `UNKNOWN/BLOCKED` until explicit reconciliation. Recency does not decide authority, and divergence between `CURRENT_STATE.md` and `STATE.yaml` is a synchronization error.

## Active decision

**DB-001 — Project Brain and repository synchronization** remains a proposal under Guardian revision. It is not an approval to publish, merge, enable a security gate, modify credentials, or change product behavior. The decision record is [`docs/decisions/DB-001.md`](../decisions/DB-001.md).

## Blockers and open questions

The revised Project Brain package is local and blocked on owner review before any republish. The technical product remains blocked by the gates already documented in the threat model, the native-vault ADR, and the Signet-gates document. Unresolved governance questions remain in [`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md); they must not be answered by inference from chat.

## Next allowed action

Review the six revised Project Brain files side by side, reconcile any remaining wording or source issue, and obtain explicit confirmation immediately before any public GitHub send.

## Next prohibited action

Do not publish the revised files, create a PR or issue, change branch protections or CI, enable Signet connectivity, introduce secret-handling code, implement signing or user-secret recovery, add production or operational endpoints, or alter any security gate.

## Maintenance rule

At the end of a session that changes the project’s understanding, update this file or create a handoff containing the baseline, facts, hypotheses, files changed, questions, blockers, allowed next action, and prohibited actions. Never describe a discussion as approved project knowledge without a versioned record and the required owner decision.

## Provenance

Prepared by Manus AI from the public repository baseline above, the Guardian review supplied by the owner, the repository’s security/governance documents, and the owner-provided Project Brain proposal. This local revision must be re-verified against the actual target commit immediately before any public republish.

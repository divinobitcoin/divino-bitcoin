# Divino Bitcoin — Current State

**Status:** `DRAFT — DB-001 pending owner approval and publication`

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

The application remains a local demonstration. Signet is the only development environment allowed by the current project records. Mainnet, real funds, private material, recovery, signing, broadcast, operational endpoints, and active Lightning remain blocked. The first Signet flow is limited to a future, explicitly gated public-chain observation without wallet identity or economic value; its gates do not authorize a wallet, seed, PSBT, transaction, faucet, payment, channel, or broadcast.

| Capability | State | Boundary or evidence |
|---|---|---|
| Local demonstration UI | `ALLOWED` | Current public scope and README |
| Signet public observation | `GATED` | `docs/first-signet-non-economic-flow-gates.md` |
| Native vault | `SKELETON_FAIL_CLOSED` | `docs/adr-0001-native-vault.md` |
| Mnemonic or seed creation/import | `BLOCKED` | Native-vault ADR and threat model |
| Secret in JavaScript/bridge | `FORBIDDEN` | Native-vault ADR |
| Private keys and channel secrets | `BLOCKED` | Security policy and threat model |
| Recovery | `BLOCKED` | Native-vault ADR and roadmap |
| Signing or signed PSBT | `BLOCKED` | Security gates and threat model |
| Broadcast or operational endpoint | `BLOCKED` | README, Signet gates, security policy |
| Active Lightning | `BLOCKED` | README, threat model, roadmap |
| Mainnet or real funds | `BLOCKED` | README, security gates, threat model |

## Verified project records

The current repository already contains a threat model, a native-vault ADR, Signet gates, a roadmap, a security policy, CI, dependency-risk records, and an SBOM. The Project Brain is an indexing and synchronization layer; it must not replace or weaken those documents.

The public foundation statement is in [`docs/divino-bitcoin-foundations.md`](../divino-bitcoin-foundations.md). The security boundary is in [`docs/threat-model.md`](../threat-model.md), [`docs/adr-0001-native-vault.md`](../adr-0001-native-vault.md), [`docs/first-signet-non-economic-flow-gates.md`](../first-signet-non-economic-flow-gates.md), and [`SECURITY.md`](../../SECURITY.md).

## Active decision

**DB-001 — Project Brain and repository synchronization** is prepared as a proposal. It is not an approval to publish, merge, enable a security gate, modify credentials, or change product behavior. The decision record is [`docs/decisions/DB-001.md`](../decisions/DB-001.md).

## Blockers and open questions

The Project Brain proposal itself is blocked on owner confirmation before public publication. The technical product remains blocked by the gates already documented in the threat model, the native-vault ADR, and the Signet-gates document. Unresolved governance questions remain in [`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md); they must not be answered by inference from chat.

## Next allowed action

Review the six prepared Project Brain files locally, correct wording or scope if needed, and obtain explicit confirmation immediately before any public GitHub send.

## Next prohibited action

Do not publish these files, create a PR or issue, change branch protections or CI, enable Signet connectivity, introduce secret-handling code, implement signing or recovery, add operational endpoints, or alter any security gate.

## Maintenance rule

At the end of a session that changes the project’s understanding, update this file or create a handoff containing the baseline, facts, hypotheses, files changed, questions, blockers, allowed next action, and prohibited actions. Never describe a discussion as approved project knowledge without a versioned record and the required owner decision.

## Provenance

Prepared by Manus AI from the public repository baseline above, the repository’s security/governance documents, and the owner-provided Project Brain proposal. This draft must be re-verified against the actual target commit immediately before publication.

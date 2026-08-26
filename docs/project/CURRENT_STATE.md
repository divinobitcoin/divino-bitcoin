# Divino Bitcoin — Current State

**Status:** `CURRENT — synchronized with WALLET-FOUNDATION-001 and GOV-REF-001`

This file is the human-readable entry point for the project. It records verified state and explicit boundaries; it does not by itself grant permission to enable a wallet capability.

## Baseline

| Field | Value |
|---|---|
| Repository | `https://github.com/divinobitcoin/divino-bitcoin` |
| Main commit | `f129010ba6fdd2a9e7d97a523267c10a3aed816e` |
| Active workspace | `sprint-2026-08-26-p2` with local uncommitted P2/governance changes |
| State verified | 2026-08-25 |
| Verification method | Public repository state, merged PR #2, P2 checkpoint and owner-approved GOV-REF-001 decision |
| License | GPL-3.0-or-later |
| Public contact | `contatodivinobitcoin@proton.me` |

## Product and network state

The application remains a local demonstration, and Signet is the default development environment. Mainnet, real funds, customer recovery, real mnemonic or seed provisioning, private-key handling, signing, broadcast, operational network endpoints, active Lightning and a functional native vault are not enabled in the current build. These are current product-readiness states, not an eternal ban on implementing the next technical stage.

Public deterministic test vectors and explicitly classified laboratory experiments may exist for engineering and auditability. They must use synthetic or disposable material and cannot create customer custody, recovery authority or economic value. The first Signet flow remains limited to its explicitly gated public-chain observation scope; separate technical work may proceed outside that flow without silently enabling a wallet capability.

| Capability | State | Boundary or evidence |
|---|---|---|
| Local demonstration UI | `ALLOWED` | Current public scope and README |
| Signet public observation | `GATED_CURRENT_FLOW` | `docs/first-signet-non-economic-flow-gates.md` |
| Signet/on-chain/Lightning laboratory engineering | `ALLOWED_SCOPED` | `WALLET-FOUNDATION-001.md`; disposable material only |
| Native vault | `SKELETON_FAIL_CLOSED` | `docs/adr-0001-native-vault.md`; implementation allowed, acceptance pending |
| Mnemonic or seed creation/import in current build | `NOT_ENABLED` | Native-vault ADR and threat model |
| Secret in JavaScript/bridge | `FORBIDDEN_FOUNDATION` | Native-vault ADR |
| Private keys and channel secrets in current build | `NOT_ENABLED` | Security policy and threat model |
| Public deterministic vectors and laboratory experiments | `ALLOWED_SCOPED` | Public test-vector documents; no customer secret or production flow |
| Customer or production wallet recovery | `NOT_ENABLED_PENDING_ACCEPTANCE` | Native-vault ADR, threat model and roadmap |
| Signing or signed PSBT in current build | `NOT_ENABLED_PENDING_ACCEPTANCE` | Security gates and threat model |
| Broadcast or production/operational endpoint | `NOT_ENABLED_PENDING_ACCEPTANCE` | README, Signet gates and security policy |
| Active Lightning in current build | `NOT_ENABLED_PENDING_ACCEPTANCE` | README, threat model and roadmap |
| Mainnet or real funds | `NOT_ENABLED_PENDING_RELEASE_DECISION` | README, security gates and threat model |

## Governance state

`WALLET-FOUNDATION-001` is the canonical product decision for the permanent self-custody contract. `GOV-REF-001` remains the workflow-autonomy decision. Together they separate wallet security, project privacy and development autonomy: wallet-foundation properties are non-negotiable; privacy is a strategic preference; and development/external operations may run autonomously inside explicit packages. Acceptance evidence, not process status, determines when a capability can be enabled.

A category package may cover local work, GitHub branches/PRs/conditional merges, YouTube campaigns, GitHub Discussions, Telegram or other named channels. Covered actions do not require unit confirmation. New categories, material scope changes, wallet-security risk, secrets, unplanned cost, content outside the package or irreversible actions not covered by it require a new decision.

Public community auditing is a future maturity phase, not a gate for every current sprint. The private foundations register remains excluded from automatic publication; deliberate owner-approved public material must be separated and rewritten before release.

## Verified project records

The current repository contains a threat model, native-vault ADR, Signet gates, roadmap, security policy, CI, dependency-risk records, SBOM and the canonical `WALLET-FOUNDATION-001` decision. The existing CI runs typecheck, tests, lint, deterministic SBOM verification and dependency-risk acceptance. The Project Brain is an indexing and synchronization layer; it must not replace or weaken wallet-foundation records.

The public foundation statement is in [`docs/divino-bitcoin-foundations.md`](../divino-bitcoin-foundations.md). The product contract is [`docs/decisions/WALLET-FOUNDATION-001.md`](../decisions/WALLET-FOUNDATION-001.md). The wallet-security evidence is in [`docs/threat-model.md`](../threat-model.md), [`docs/adr-0001-native-vault.md`](../adr-0001-native-vault.md), [`docs/first-signet-non-economic-flow-gates.md`](../first-signet-non-economic-flow-gates.md) and [`SECURITY.md`](../../SECURITY.md). The autonomy decision is [`docs/decisions/GOV-REF-001.md`](../decisions/GOV-REF-001.md).

## Active work

The P2 branch has local changes for demo status, deterministic fixtures, safe-failure language, Android semantics and validation. The current local validation passed with 85 tests and 1 skipped, typecheck, lint, SBOM, recorded audit, Android guard, Android export, web export and whitespace. Physical Android behavior remains not verified because no ADB/emulator is available. WF-001 governance consolidation is also local and uncommitted.

## Next allowed action

Continue P2 closure autonomously within the backlog: obtain independent Claude engineering review and GPT adversarial analysis, integrate only reproducible findings, run final validation and record the checkpoint. Continue technical design and laboratory engineering toward on-chain and Lightning self-custody using disposable material. GitHub/YouTube operations may proceed under their approved category packages.

## Next prohibited action

Do not violate wallet-foundation invariants, expose customer seeds/private keys, use customer secrets or real funds in laboratory work, accept a capability without its technical evidence, activate economic Mainnet/Lightning use, or treat workflow autonomy as authorization for a wallet capability. Do not expand an external category beyond its approved package. Pending acceptance must not be used to block unrelated engineering.

## Maintenance rule

At the end of a session that changes the project’s understanding, update this file or create a handoff containing the baseline, facts, hypotheses, files changed, questions, blockers, allowed next action and prohibited actions. Preserve dissent and uncertainty; do not describe a wallet capability as enabled based on process status alone.

## Provenance

Prepared by Manus AI from the merged repository baseline, P2 local checkpoint, the owner-approved `WALLET-FOUNDATION-001` and `GOV-REF-001` decisions, and the project’s wallet-security records. Recheck the actual commit before any external publication or sensitive technical change.

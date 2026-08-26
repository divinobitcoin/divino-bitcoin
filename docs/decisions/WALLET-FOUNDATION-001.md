# WALLET-FOUNDATION-001 — Product Foundation and Self-Custody Contract

**Status:** `APPROVED — owner decision recorded`
**Decision date:** 2026-08-25
**Impact:** High for product definition and governance; no wallet capability is enabled by this document.
**Scope:** Wallet product foundation, security-invariant classification, engineering freedom, and reconciliation of existing gates.

## Decision summary

Divino Bitcoin is being built as a **fully self-custodial Bitcoin wallet with on-chain and Lightning support**. The wallet foundation is the only non-negotiable project boundary. Development workflow, automation, GitHub activity, YouTube operations, community activity, and laboratory network testing are not the wallet foundation and must not be allowed to create redundant per-step approval gates.

The product must eventually be deliverable in a form where the customer controls the relevant keys and bitcoin, no customer secret or signing authority is held by a server, maintainer, provider, connector, or agent, and recovery of ownership does not depend on Divino Bitcoin or any company continuing to exist. A global outage of the project must not remove ownership from a customer who retains the customer’s own recovery material.

This decision **does not enable** seed handling, private-key handling, signing, broadcast, Lightning payments, Mainnet, real funds, or an operational wallet endpoint. It authorizes the project to research, implement, and test those capabilities in appropriately isolated engineering environments, using disposable laboratory material and Signet funds where necessary, while preserving the foundation invariants and the applicable technical acceptance evidence.

## Hierarchy and reconciliation rule

The governing order for wallet-safety questions is:

`Wallet Foundation Invariants > Technical Decisions/ADRs > Threat Model > Acceptance Gates > Roadmap > Implementation`.

Workflow records such as `DB-001`, `GOV-REF-001`, `AI_PROTOCOL.md`, `CURRENT_STATE.md`, and `STATE.yaml` may describe and coordinate work, but cannot weaken or authorize a wallet capability. If a workflow record conflicts with a wallet-safety record, the conflict remains `UNKNOWN/BLOCKED` until a technical reconciliation is recorded. Recency, CI, agent consensus, a label, or a status field never resolves a wallet-safety conflict.

The objection supplied by Claude/Opus 5 is accepted as a review method: an invariant must not be silently deleted or reclassified. Every reclassification must identify the original record, the new category, the protection that remains, the evidence required, and the decision that permits the change. The preserved objection is recorded in `CLAUDE_OBJECTION_GOV_RECONCILIATION_2026-08-25.md` outside the public repository.

## Permanent wallet-foundation requirements

The following requirements are product properties, not temporary workflow preferences:

| ID | Requirement | Acceptance implication |
|---|---|---|
| WF-F1 | The customer controls key generation, use, retention, and recovery. The project does not become custodian of customer bitcoin. | Architecture and recovery tests must demonstrate customer ownership without project infrastructure. |
| WF-F2 | Customer seeds, private keys, channel secrets, preimages, backups, and equivalent secret material never leave the approved local/native security boundary. They must not enter JavaScript, the bridge, logs, analytics, crash reports, clipboard, screenshots, automatic backups, repositories, issues, or support channels. | Negative tests and runtime/static checks must cover every relevant boundary. |
| WF-F3 | No server, maintainer, provider, connector, or agent receives custody, signing authority, recovery authority, or secret reconstruction power. | Remote services may provide untrusted data or routing assistance only within a non-custodial architecture. |
| WF-F4 | Recovery of ownership is independent of the continued existence of Divino Bitcoin, its servers, its providers, and its agents. | Clean-device restoration and failure-of-project-infrastructure scenarios are acceptance tests. |
| WF-F5 | Every signing decision binds the displayed network, destination, value, fee, total, and user intent to the payload that would be signed. Blind signing and silent network downgrade are unacceptable. | PSBT/intention mutation tests, explicit network labels, and independent review are required. |
| WF-F6 | Demo, Signet, and Mainnet state are isolated by types, storage namespaces, derivation context, data, and UI. Unsupported or mismatched network profiles fail safely before secret or economic paths are reached. | Network-isolation tests and fail-safe behavior are permanent; the current set of enabled profiles is a maturity status. |
| WF-F7 | The native vault boundary is opaque to the JavaScript layer and fails closed when a sensitive operation is unavailable or its preconditions are not met. | Native implementation, bridge, memory, backup, and device tests are required before accepting user secrets. |
| WF-F8 | Lightning, when implemented, remains non-custodial: no remote node or service obtains customer signing authority or channel-secret custody, and channel recovery is designed as a customer-owned property. | Lightning architecture, failure, backup, recovery, idempotency, and audit evidence are required before economic use. |
| WF-F9 | The released application and its supply chain remain reviewable and attributable to source, dependencies, build configuration, and release provenance. | Lockfiles, SBOM, CI, release verification, and independent review remain part of product security. |
| WF-F10 | The product communicates uncertainty and irreversible actions honestly. It must not claim recovery, privacy, safety, or custody properties that evidence does not support. | UX, documentation, and release claims are checked against verified evidence. |
| WF-F11 | The product does not invent cryptography and does not silently downgrade storage, transport, backup, or security mechanisms to an unapproved alternative. A platform store such as `SharedPreferences` is not an approved secret boundary merely because its contents are encrypted. | Library, vault, transport, backup, and fallback choices require an explicit technical decision and evidence; automatic cloud/device backup must not become a secret store. |
| WF-F12 | Remote or externally supplied content is untrusted input. Parsing is strict, bounded, fail-safe, and never treats external content as authorization or instructions. | Response fixtures, malformed/oversized inputs, remote instructions, and authorization boundaries receive negative tests. |

These requirements preserve the substance of the inherited controls represented by `INV-003` through `INV-010`, `INV-014`, and the relevant portions of `INV-015`.

## Item-by-item inherited-control mapping

| Inherited control | Canonical requirement | Preservation note |
|---|---|---|
| `INV-003` | `WF-F2` | Secret material remains inside the approved local/native boundary and outside all listed exfiltration surfaces. |
| `INV-004` | `WF-F7` | The native vault remains opaque and fail-closed; implementation may proceed before acceptance. |
| `INV-005` | `WF-F3` and `WF-F8` | No remote party receives custody, signing authority, recovery authority or channel-secret custody. |
| `INV-006` | `WF-F11` | No invented cryptography and no silent downgrade of storage, transport or security mechanisms. |
| `INV-007` | `WF-F6` | Demo, Signet and Mainnet remain isolated, with no silent fallback. |
| `INV-008` | `WF-F6` | Unsupported network or economic paths fail before secret/economic handling; enabled profiles remain maturity state. |
| `INV-009` | `WF-F5` | Displayed transaction intent remains bound to the payload; blind signing is unacceptable. |
| `INV-010` | `WF-F12` | Remote and external content remains untrusted, strictly parsed and unable to act as authorization or instruction. |
| `INV-014` | `WF-F9` | Source, dependencies, build configuration, SBOM and release provenance remain reviewable. |
| `INV-015` | `WF-F2` and `WF-F10` | Secret/publication boundaries remain protected and claims remain evidence-based. |

This table is the required traceability bridge. If a future invariant is added or reclassified, it must receive an explicit mapping, preservation note and decision record before the canonical contract is considered complete.

## Categories that are not permanent wallet prohibitions

The following are current product states or operating methods. They remain controlled and evidence-based, but they are not eternal bans on engineering:

| Category | Correct interpretation |
|---|---|
| Local demonstration | The current shipped/demo surface is local and non-economic. It does not prohibit building the next technical stage. |
| Signet-only development | Signet is the default development network because it limits economic risk. Signet, on-chain, Lightning, signing, and broadcast experiments may be performed with disposable laboratory material when their technical scope is explicit. |
| Mainnet and real funds | They remain outside the current product stage. Promotion requires completion of the foundation evidence and a separate release/readiness decision. This is a product-readiness gate, not a prohibition on implementing the code path. |
| Functional native vault | The current build may remain fail-closed while the native implementation is developed and reviewed. “Not enabled” is a state, not permission to put secrets in JavaScript. |
| First Signet observation gates | S0–S6 govern the first controlled public-observation flow. They do not prohibit local fixtures, mocks, protocol research, or isolated laboratory work outside that flow. |
| Mainnet/Lightning/economic gates | G0–G5 are maturity milestones and acceptance evidence. A milestone can block release or economic use without blocking development toward it. |
| Community audit | A future audit and public review stage. It is not a requirement for every current sprint and its absence does not make current code safe. |
| Process confirmations | Commits, branches, PRs, merges, automation, and delegated external operations are governed by package scope. They do not require unit confirmation inside an approved package. |

## Engineering and laboratory rule

Manus may autonomously coordinate implementation, test, review, and delegation when the work is inside an approved technical decision and backlog. Laboratory work must use disposable test keys, synthetic fixtures, Signet funds, or other explicitly non-production material. It must not request, persist, or transmit a customer seed, private key, real-fund record, recovery secret, or production credential.

An implementation may proceed without a new owner confirmation for each commit when it is a faithful implementation of an already approved foundation-compatible technical decision. A new owner decision remains necessary when the work changes the self-custody contract, accepts a new foundation risk, introduces a custody-like dependency, uses real customer secrets or real funds, promotes an economic capability, or changes an unresolved architectural decision.

The gate question is therefore changed from “may the team research or implement this?” to “is this implementation ready to accept secrets, economic value, or a release?” Gates are acceptance and release controls. They are not a reason to prevent the engineering needed to satisfy them.

## TEST/LAB module classification

`shared/bip84-derivation.ts`, `shared/mnemonic-recovery.ts`, `shared/signet-derivation-policy.ts` and `shared/public-bip-vectors.ts` are intentionally classified as TEST/LAB modules in the current codebase. Their current consumers are tests and laboratory fixtures; they are not wallet-runtime APIs and must not receive customer secrets or production credentials. The `pnpm guard:lab-boundary` check protects this boundary across runtime directories and non-laboratory `shared` modules.

This classification is a conscious architectural decision, not an incidental effect of the guard. If `shared/signet-derivation-policy.ts` or any other laboratory helper becomes a starting point for production derivation, the module must first leave the TEST/LAB set through a technical decision, native-vault review, threat-model update, negative tests and acceptance evidence. Until then, a runtime import is a boundary violation.

## Existing-record reconciliation matrix

| Existing record | Historical purpose | Disposition under this decision | Replacement or preserved control |
|---|---|---|---|
| `docs/threat-model.md` | Defines assets, threats, controls, and evidence. | Preserve as the technical security source; revise transition language so it distinguishes current stage from permanent invariants. | WF-F1–WF-F12 and the existing threat controls. |
| `docs/adr-0001-native-vault.md` | Defines the native-vault architecture and secret boundary. | Preserve architecture and fail-closed behavior; change “blocked implementation” language to “not enabled until acceptance evidence,” while allowing implementation and laboratory tests. | WF-F2, WF-F3, WF-F7 plus native-vault acceptance gates. |
| `docs/first-signet-non-economic-flow-gates.md` | Limits the first public Signet observation flow. | Preserve for that flow; do not treat it as a ban on all Signet engineering. | WF-F6 and the flow’s S0–S6 acceptance scope. |
| `docs/project/SECURITY_INVARIANTS.md` | Indexes inherited and proposed invariants. | Keep IDs and provenance; add category and disposition instead of deleting history. Split mixed network/current-stage wording where necessary. | This decision plus the referenced technical records. |
| `SECURITY_GATES.md` | Private summary of current gates. | Rewrite as a concise distinction between foundation invariants, maturity milestones, and operational checks. | This decision is the source for the classification. |
| `DB-001.md` / `GOV-REF-001.md` | Project memory and workflow autonomy. | Preserve as workflow history; amend the non-effect wording to defer wallet-foundation interpretation to this decision. | Package-based autonomy remains valid and cannot authorize wallet capabilities. |
| `CURRENT_STATE.md` / `STATE.yaml` | Human and structured snapshots. | Synchronize current statuses without implying that “not enabled” means “not allowed to develop.” | Descriptive only; no capability authorization. |

## Decision consequences

The project becomes faster without becoming less honest. P2 can be closed, Signet and Lightning engineering can advance, and GitHub/YouTube automation can proceed under their own delegated packages. At the same time, the final wallet cannot claim to be self-custodial until the technical evidence demonstrates the requirements above.

The cost is that wallet-foundation changes still demand serious engineering, negative testing, independent review where appropriate, and explicit acceptance of residual risk. That is not redundant bureaucracy: it is the evidence required to make the product promise true. The workflow around that work should remain autonomous and should not add a confirmation before every branch, commit, push, PR, or test.

## Owner decision and provenance

The owner approved this product-first formulation in the central project conversation on 2026-08-25 after reviewing the reflection `REFLEXAO_ALICERCE_CARTEIRA_DIVINO_BITCOIN_2026-08-25.md` and the Claude objection. This decision records the approved principle; it does not publish the private reflection or its personal context.

The decision changes classification and workflow interpretation. It does not by itself implement a native vault, expose secrets, create a signing path, activate Lightning, connect an operational endpoint, use Mainnet, or move funds.

## References

- [`docs/project/SECURITY_INVARIANTS.md`](../project/SECURITY_INVARIANTS.md)
- [`docs/threat-model.md`](../threat-model.md)
- [`docs/adr-0001-native-vault.md`](../adr-0001-native-vault.md)
- [`docs/first-signet-non-economic-flow-gates.md`](../first-signet-non-economic-flow-gates.md)
- [`docs/decisions/DB-001.md`](DB-001.md)
- [`docs/decisions/GOV-REF-001.md`](GOV-REF-001.md)

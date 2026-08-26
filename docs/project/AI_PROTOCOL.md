# Divino Bitcoin — AI Collaboration Protocol

**Status:** `APPROVED — GOV-REF-001 owner decision recorded; publication/commit handled separately`

This protocol is neutral between Claude, ChatGPT, Manus, human contributors, and future tools. It defines how work is recorded; it does not delegate ownership, wallet-foundation decisions, wallet-safety acceptance, or custody to an agent. `WALLET-FOUNDATION-001.md` is the canonical product contract. External publication and workflow authority may be delegated by an owner-approved category package with scope, validity, limits and revocation.

## Required reading order

Before working on a task, an agent or contributor should read the smallest relevant context in this order:

1. [`CURRENT_STATE.md`](CURRENT_STATE.md)
2. [`SECURITY_INVARIANTS.md`](SECURITY_INVARIANTS.md)
3. [`docs/threat-model.md`](../threat-model.md)
4. The active decision or issue referenced by the task
5. The most recent handoff, when one exists
6. The files directly referenced by the task

If a required file is missing, stale, contradictory, or unavailable, record the limitation and stop before making a sensitive assumption.

## Knowledge status

| Status | Meaning | What it permits |
|---|---|---|
| `DISCUSSION` | A claim exists only in a conversation or uncommitted note | Reasoning and questions; no project-wide reliance |
| `DRAFT` | A proposed file exists locally or in an unapproved branch | Review and revision; no public claim or gate change |
| `PROJECT_KNOWLEDGE` | A versioned record was reviewed and accepted for its stated scope | Reference within that scope; no implied authorization beyond it |
| `APPROVED` | The owner approved the exact decision and conditions recorded in the decision file | Only the listed actions, subject to all security gates |
| `PUBLISHED` | An owner-approved category package or exact text was sent successfully, and the completed publication is recorded | Public reference to that exact version and package |
| `BLOCKED` | Evidence, review, owner approval, or a security condition is missing or failed | Preserve the block; do not route around it |
| `NOT_VERIFIED` | The claim has not been checked against a stated source or reproducible evidence | Treat as an uncertainty, not a fact |

A chat conclusion becomes project knowledge only when a versioned document records its scope, source, status, and evidence. A commit, label, CI result, or agent consensus does not silently elevate a claim to `APPROVED`; the direct owner decision recorded in [`GOV-REF-001.md`](../decisions/GOV-REF-001.md) is the source for workflow autonomy, while [`WALLET-FOUNDATION-001.md`](../decisions/WALLET-FOUNDATION-001.md) is the source for the product foundation.

## Record authority and synchronization

The six Project Brain records have distinct roles. `DB-001.md` is normative governance; `SECURITY_INVARIANTS.md` is normative only for traceable approved or explicitly proposed invariants; `AI_PROTOCOL.md` is normative process-only; `CURRENT_STATE.md` is descriptive for human readers; `STATE.yaml` is a structured subset of the same snapshot; and `OPEN_QUESTIONS.md` is informative and non-normative.

`CURRENT_STATE.md` and `STATE.yaml` must describe the same verified snapshot. If they diverge, the result is a synchronization error and neither file wins. A conflict with an ADR, threat model, security gate, or other normative record is `UNKNOWN/BLOCKED` until explicit reconciliation. File recency is provenance, not authority.

No status field, YAML value, AI consensus, review count, issue label, CI result, handoff, or commit message can by itself enable a security-sensitive **wallet capability** or change the wallet foundation. Authorization to accept a wallet capability still requires the applicable technical decision, evidence, review and owner decision where required. Implementation and laboratory testing toward an approved technical decision may proceed without unit confirmation. External workflow actions may be authorized by an explicit category package under `GOV-REF-001` and must remain within that package.

## Roles and independence

The project may use different agents for different perspectives, but role names do not grant authority.

| Role | Primary contribution | Explicit limit |
|---|---|---|
| Builder | Feasibility, implementation, tests, and documented diffs | Cannot approve its own sensitive change or enable a blocked capability |
| Guardian | Threat analysis, negative cases, boundary checks, and objections | Cannot approve wallet security, custody, or a gate change; cannot expand a publication package |
| Reviewer | Independent, adversarial, product, or audit-oriented review | Must state scope and evidence; cannot replace the owner or an external audit |
| Maintainer/owner | Scope, priorities, accepted risks, category packages, public commitments, and final decisions | Must approve wallet-sensitive actions and each external category package; no unit approval is required inside an active package |

Agents must write separate analyses rather than overwrite one another. Manus may route implementation, analysis, research, documentation, testing or review by demonstrated aptitude. A final decision should preserve dissent, residual risks, conditions, evidence, and unresolved objections.

## Impact protocol

Every proposed category or action must state its impact, reach, reversibility, proposed action, evidence and delegation boundary. The classification selects the required package; it does not force a confirmation for every step already covered by an approved package.

| Impact | Typical reach | Rule under delegated autonomy |
|---|---|---|
| **Low** | Reversible, internal and without wallet risk, sensitive data or external reach | Execute autonomously inside the backlog and report at the checkpoint |
| **Medium** | Changes behavior, workflow, backlog, documentation or technical direction but remains reversible | Include in an approved work package; do not repeat confirmation for each microdecision |
| **High** | Change to the wallet self-custody contract, acceptance of new wallet-foundation risk, real secret, real fund, economic/production activation, new credential/permission, identity, personal data, new connector, publication outside the package or irreversible action not covered | Require a specific owner decision or a category delegation with scope, validity, limits and revocation. Implementation and laboratory testing inside an approved technical decision do not require unit confirmation; wallet-safety acceptance cannot be delegated away. |

When impact is uncertain, use the higher class for the package. A documentation or publication change is high only when it creates a new commitment, exposes sensitive context or falls outside the approved category; covered recurring operations do not require unit confirmation.

## Work record and handoff

At the end of a material session, update [`CURRENT_STATE.md`](CURRENT_STATE.md) or create a dated file under `docs/handoffs/` when that directory is introduced. A handoff must state:

```text
Agent:
Date:
Baseline read:
Work performed:
Verified facts:
Hypotheses or recommendations:
Files modified:
Tests and evidence:
Open questions:
Blockers:
Recommended next action:
Do not do:
Owner decision required:
```

Never place seeds, private keys, credentials, personal data, private management addresses, real-fund records, or unapproved personal reflections in a public handoff.

## Private and public records

The Caderno Privado de Fundamentos is a protected project record. It may contain testimony, emotions, personal context, questions, or reasoning in formation. It is not an input source for automatic publication. Only principles explicitly approved by the owner may be rewritten into public material after removal of personal and third-party context and inclusion in an approved public package. Privacy is a preference, but accidental exposure of private or third-party material remains a defect.

If a task mixes private and public material, separate the records first. Ask the owner before migrating anything. Approval to preserve a private reflection is not approval to publish it; a deliberate owner-approved publication package may authorize a defined public version.

## Sensitive-change gate

Before proposing or accepting a change involving the wallet foundation — including the native vault boundary, mnemonic, seed, private key, customer recovery, signature, PSBT meaning, broadcast, Lightning custody or a transaction’s destination/value/fee — the agent must identify the governing decision, threat-model impact, negative tests, evidence required, rollback, review scope and owner decision point. Implementation and laboratory experiments may proceed when they are explicitly scoped under an approved technical decision. Public deterministic test vectors and laboratory experiments must use disposable material and must never be described as customer recovery or production custody. If a foundation control, technical decision or required evidence is missing, leave acceptance `BLOCKED` while allowing unrelated engineering to continue.

CI and automation may detect missing records and fail closed, but they must not be used as a substitute for wallet-safety review where that review is required. An agent may create or use a connector, credential or external account only when the owner has authorized that category package; it must remain within the package and pause on scope expansion. Operational wallet endpoints remain subject to their own technical decision.

## Conflict handling

When this protocol conflicts with a repository document or normative security record, record the conflict and reconcile it through a versioned decision. A direct owner instruction recorded in [`GOV-REF-001.md`](../decisions/GOV-REF-001.md) resolves workflow autonomy and privacy questions, while [`WALLET-FOUNDATION-001.md`](../decisions/WALLET-FOUNDATION-001.md) defines the product foundation. Neither workflow record overrides wallet-safety invariants or a technical decision. Do not resolve a wallet-safety conflict by choosing the fastest path, newest file, YAML value, label, CI result or agent consensus. Preserve rejected alternatives, reason, evidence and residual risk.

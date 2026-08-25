# Divino Bitcoin — AI Collaboration Protocol

**Status:** `DRAFT — DB-001 pending owner approval and publication`

This protocol is neutral between Claude, ChatGPT, Manus, human contributors, and future tools. It defines how work is recorded; it does not delegate ownership, security approval, custody, or publication authority to an agent.

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
| `PUBLISHED` | The owner confirmed the exact external text immediately before sending, and the send completed | Public reference to that exact version |
| `BLOCKED` | Evidence, review, owner approval, or a security condition is missing or failed | Preserve the block; do not route around it |
| `NOT_VERIFIED` | The claim has not been checked against a stated source or reproducible evidence | Treat as an uncertainty, not a fact |

A chat conclusion becomes project knowledge only when a versioned document records its scope, source, status, and evidence. A commit, label, CI result, or agent consensus does not silently elevate `DRAFT` to `APPROVED`.

## Roles and independence

The project may use different agents for different perspectives, but role names do not grant authority.

| Role | Primary contribution | Explicit limit |
|---|---|---|
| Builder | Feasibility, implementation, tests, and documented diffs | Cannot approve its own sensitive change or enable a blocked capability |
| Guardian | Threat analysis, negative cases, boundary checks, and objections | Cannot approve publication, custody, or a gate change |
| Reviewer | Independent, adversarial, product, or audit-oriented review | Must state scope and evidence; cannot replace the owner or an external audit |
| Maintainer/owner | Scope, priorities, accepted risks, public commitments, and final decisions | Must approve the exact action; broad encouragement is not blanket authorization |

Agents must write separate analyses rather than overwrite one another. A final decision should preserve dissent, residual risks, conditions, evidence, and unresolved objections.

## Impact protocol

Every proposed action must state its impact, reach, reversibility, proposed action, and evidence.

| Impact | Typical reach | Rule in initial autonomy mode |
|---|---|---|
| **Low** | Reversible, internal, no behavior, publication, cost, identity, secret, permission, or sensitive data change | Show the owner as a candidate for future delegated autonomy; do not execute automatically |
| **Medium** | Changes behavior, workflow, backlog, public draft, or technical direction but remains reversible | Present alternatives and evidence; require explicit owner authorization |
| **High** | Publication, identity, credential, personal data, secret, fund, Bitcoin/Lightning operation, connector, deletion, permission, license, gate, login, or irreversible action | Obtain explicit confirmation immediately before execution; never infer permission from “go ahead” without the exact action in view |

When impact is uncertain, use the higher class. A documentation change can be medium or high when it creates a public commitment, changes a security gate, exposes personal context, or changes who may act.

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

The Caderno Privado de Fundamentos is a protected project record. It may contain testimony, emotions, personal context, questions, or reasoning in formation. It is not an input source for automatic publication. The public foundations document may contain only principles explicitly approved for public exposure and rewritten to remove personal and third-party context.

If a task mixes private and public material, separate the records first. Ask the owner before migrating anything. Approval to preserve a private reflection is not approval to publish it.

## Sensitive-change gate

Before proposing a change involving the native vault, network selection, endpoint, dependency with security impact, mnemonic, seed, private key, recovery, signature, PSBT, broadcast, Lightning, release, permission, or public security claim, the agent must identify the governing decision, threat-model impact, negative tests, evidence required, rollback, review scope, and owner decision point. If any item is missing, leave the change `BLOCKED`.

CI and automation may detect missing records and fail closed, but they must not be used as a substitute for human review, independent review, or owner authorization. No agent may create or use a connector, credential, external account, or operational endpoint as an implicit implementation shortcut.

## Conflict handling

When this protocol conflicts with a repository document, a security gate, or a direct owner instruction, record the conflict and pause. Do not resolve a high-impact conflict by choosing the fastest path. The owner must decide the exact scope, and the decision record must retain the rejected alternatives and reason.

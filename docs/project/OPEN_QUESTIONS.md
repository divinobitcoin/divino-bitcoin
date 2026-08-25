# Divino Bitcoin — Open Questions

**Status:** `DRAFT — DB-001 pending owner approval and publication`

This register prevents unresolved questions from being silently converted into project knowledge. A question may have recommendations, but it remains open until a versioned decision records the owner’s choice and its evidence.

| ID | Question | Impact | Evidence or decision needed | Current state |
|---|---|---:|---|---|
| OQ-001 | Should `DB-*` records complement existing `ADR-*` records, and what is the precedence when they overlap? | Medium | A naming and precedence rule reviewed against current ADRs | Open; no inference |
| OQ-002 | What exact artifact records owner approval for a public document, and must all public governance changes use a PR? | High | Owner-approved publication protocol and repository workflow decision | Open; no publication rule added |
| OQ-003 | Should the project add `CONTEXT_PACK.md` after the six-file pilot, or keep the reading order solely in `AI_PROTOCOL.md`? | Low | Experience from at least one or two handoffs and link-maintenance review | Deferred |
| OQ-004 | When should a material session update `CURRENT_STATE.md`, and when should it create a separate `docs/handoffs/` file? | Low | Maintainer workflow decision that balances freshness and history | Open; initial rule is documented in `AI_PROTOCOL.md` |
| OQ-005 | Which governance checks should CI enforce, and which should remain advisory until the format is stable? | Medium | Threat-model review, failure-mode analysis, test fixtures, and owner approval | Deferred; no CI change in DB-001 |
| OQ-006 | Should issues, pull requests, labels, and review folders be introduced as a separate governance milestone? | Medium | Scope proposal, templates, privacy review, and owner approval | Deferred |
| OQ-007 | What minimum evidence is required before a review is labeled independent, and how should reviewer conflicts be recorded? | High | Explicit review charter and conflict-of-interest protocol | Open; no review is called independent by this package |
| OQ-008 | What public-language policy best supports international review without exposing private context or creating translation drift? | Low | Maintainer decision on source language, translation status, and update responsibility | Open |
| OQ-009 | What connector, credential, or external-account policy should apply to future synchronization or automation? | High | Connector scope, data-flow review, permission boundary, rollback, and explicit owner confirmation | Blocked; no connector is authorized |
| OQ-010 | Which fields in `STATE.yaml` should be schema-validated first, and should validation fail closed on unknown enum values? | Medium | Schema version, validator design, fixtures, and CI decision | Recommended fail-closed; implementation deferred |

## Handling rule

Until a question is resolved, agents may collect evidence, compare alternatives, and prepare a proposal. They must not silently convert a recommendation into an approval, change a security gate, expose private material, create credentials, or publish a new commitment.

## Private-context boundary

Questions that contain personal testimony, private contact information, credentials, account details, or other sensitive context must be recorded in the private project register rather than copied here. This public register contains only the minimum governance question needed for an auditable decision.

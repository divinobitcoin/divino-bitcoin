# GOV-REF-001 — Autonomy and Governance Reform

**Status:** `APPROVED — workflow autonomy; product foundation governed by WALLET-FOUNDATION-001`
**Date:** 2026-08-25
**Scope:** development workflow, delegated operations, automation, and public presence.
**Product behavior changed:** No.
**Wallet security changed:** No.

## Owner decision

The owner approved the autonomy reform after distinguishing three layers:

1. **Wallet security** is the only non-negotiable floor. Seed, private-key, custody, signing, recovery, transaction-integrity, destination/value/fee, broadcast, and loss-prevention protections cannot be relaxed for speed or automation.
2. **Project privacy** is a strategic preference. The project should try to preserve the owner’s privacy and separate personal identity from public presence, but privacy is not an absolute blocker if the owner later chooses otherwise.
3. **Development security** is an operational method. It must be proportional to risk and must allow autonomous development, delegation, automation, push, pull requests, merges, and publication when the owner has delegated the relevant category and scope.

Public community auditing is a later maturity phase. It is not a gate for every current development step.

## Operating effect

The default is autonomous work within the active backlog and an approved delegation package. Local research, documentation, code, tests, commits, branches, fixtures, builds, and checkpoints do not require unit confirmation at each step.

External operations may also run without unit confirmation after a category package is approved. A package must specify the repository or channel, account or connector, allowed action, content or template, duration, limits, evidence, rollback, and revocation command. The package does not expand by implication to another account, channel, content type, or capability.

## Current maturity state

The current build remains a local demonstration and Signet is the default development environment. Mainnet, real funds, production signing, user-secret recovery, broadcast, operational endpoints, active Lightning, and a functional native vault are not enabled at the current maturity stage. This decision does not open those capabilities, but it also does not prohibit implementation or laboratory testing toward them. Product acceptance remains governed by [`WALLET-FOUNDATION-001.md`](WALLET-FOUNDATION-001.md), the threat model and the applicable technical decisions.

## Delegated categories

- **L0 local work:** autonomous within the backlog, branch and package; record results in the checkpoint.
- **L1 GitHub:** push working branches, open and maintain pull requests, and merge conditionally when the package states the repository, branch and checks.
- **L1 YouTube:** create, schedule or publish content within an approved campaign, template, channel, frequency and validity window.
- **L1 community:** publish exact or templated content to named GitHub Discussions, Telegram or other named channels within an approved campaign.
- **L2 wallet foundation:** never bypass the self-custody floor. Implementation and laboratory testing may proceed under an approved technical decision; acceptance of a foundation change or economic capability still requires the applicable threat model, negative tests, evidence, review and owner decision.

## Pause and revocation

The owner can issue `Revoke GitHub`, `Revoke YouTube`, `Revoke community`, `Pause publication`, `Pause external automation`, or `Pause everything`. Revocation stops new actions in the category and preserves the history; it does not automatically undo actions already taken.

Manus must pause the affected branch when there is new scope, a new credential or permission outside the package, concrete wallet risk, secret or personal-data exposure, unplanned cost, content outside the template, an uncovered irreversible action, or a mandatory-test failure.

## Non-effect and relationship to the product foundation

This decision does not alter the wallet foundation contract, custody rules, cryptographic design, native-vault behavior, Signet acceptance scope, or the current not-enabled state of economic capabilities. It does not grant an agent ownership or unrestricted authority. It removes redundant unit confirmations from explicitly delegated workflow categories. Whether engineering may proceed toward a capability is governed by `WALLET-FOUNDATION-001.md` and the applicable technical decision; whether the capability may be accepted or used remains a separate product-readiness question.

The detailed operational authority remains in the owner-approved project records and the current delegation package. A new workflow category or material scope change requires a new owner decision. A change to the wallet self-custody contract requires a product-foundation decision, not a workflow package.

## Amendment recorded by WALLET-FOUNDATION-001

On 2026-08-25 the owner approved the product-first distinction between permanent wallet properties, maturity states and workflow operations. This amendment preserves GOV-REF-001 as the autonomy record and removes only the implication that a pending maturity gate forbids the engineering needed to satisfy it. It does not authorize secrets, funds, economic use or a weaker wallet foundation.

## Evidence

The owner approved the reform in the central project conversation on 2026-08-25 after reviewing the draft proposal. The supporting local draft is `projects/divino-bitcoin-2d0b3363/PROPOSTA_REFORMA_AUTONOMIA_2026-08-25.md`. The decision must be synchronized with `WORKING_AGREEMENT.md`, `docs/project/AI_PROTOCOL.md`, and the project hub before being treated as the current workflow record.

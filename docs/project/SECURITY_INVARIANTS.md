# Divino Bitcoin — Security Invariants

**Status:** `DRAFT — DB-001 pending owner approval and publication`

These invariants are constraints, not feature requirements. A decision, pull request, automation check, or agent recommendation must not weaken them by implication. A proposed exception requires a new, explicit security decision, updated evidence, independent review where applicable, and the owner’s approval.

## Custody and secret boundaries

1. The application remains in local demonstration mode until the documented gates are satisfied.
2. Mainnet, real funds, seeds, private keys, recovery, signing, broadcast, operational endpoints, and active Lightning remain blocked.
3. Mnemonic, seed, private key, channel secret, preimage, backup secret, or equivalent material must never be exposed to JavaScript, the React Native bridge, logs, analytics, crash reports, clipboard, screenshots, automatic backups, repositories, issues, or public support channels.
4. The native vault is opaque to TypeScript and must fail closed while sensitive operations are not formally enabled. A public handle or status is not a secret and must not be treated as one.
5. No server, maintainer, provider, connector, or agent may receive custody, signing authority, recovery authority, or secret material.
6. The app must not invent cryptography or silently downgrade to an unapproved storage or transport mechanism.

## Network and transaction boundaries

7. Demo and Signet state must remain isolated by types, storage namespaces, data, and user interface. There is no silent fallback between networks.
8. Mainnet, Testnet, Regtest, operational endpoints, and economic actions must be rejected before a client, credential, or secret-handling path is reached unless a separate approved gate explicitly permits the action.
9. Any future transaction review must bind the displayed network, destination, value, fee, total, and intent to the payload that would be signed. No blind signing is acceptable.
10. Remote responses are untrusted input. Parsing must be strict, bounded, fail safely, and must not render remote content as instructions or authorization.
11. The first Signet flow, if accepted, may expose only the explicitly documented public chain metadata without wallet identity, address, xpub, descriptor, UTXO, invoice, PSBT, seed, signature, transaction, or broadcast.

## Auditability and release boundaries

12. Every sensitive change must have a written scope, threat-model impact, negative tests, evidence, rollback plan, checkpoint, and required review before merge.
13. Public claims must distinguish verified facts, hypotheses, recommendations, and blocked capabilities. A security review is not an authorization to enable a gate.
14. Dependencies, CI, build configuration, SBOM, release provenance, and public documentation are part of the security perimeter and must remain reviewable.
15. No public artifact may include the private management address, personal data, credentials, tokens, seeds, private keys, real-fund records, or unapproved private reflections.
16. The public contact boundary is `contatodivinobitcoin@proton.me`; no other management address may be copied into public material.
17. The Caderno Privado de Fundamentos is not a publication source. A private reflection may become public only after explicit owner approval, redaction of personal or third-party context, review of the final wording, and a separate confirmation immediately before publication.

## Governance boundaries

18. A conversation-only conclusion has status `DISCUSSION` and is not project knowledge until recorded in a versioned repository document.
19. `STATE.yaml` is descriptive and fail-closed. No text in it, including `enabled`, `approved`, or `allowed`, can by itself authorize a sensitive capability.
20. Independent agent opinions must remain attributable and must not be overwritten. The official decision must preserve objections, residual risks, conditions, evidence, and the owner decision.
21. CI may reject missing evidence or unsafe changes, but CI, consensus, labels, or a reviewer cannot replace the owner’s explicit approval or an independent security review.
22. In the initial autonomy mode, even reversible low-impact actions are shown to the owner for consideration. Medium-impact changes require explicit authorization; high-impact actions require confirmation immediately before execution.

## References

The invariants are derived from the repository’s [`README.md`](../../README.md), [`SECURITY.md`](../../SECURITY.md), [`docs/threat-model.md`](../threat-model.md), [`docs/adr-0001-native-vault.md`](../adr-0001-native-vault.md), and [`docs/first-signet-non-economic-flow-gates.md`](../first-signet-non-economic-flow-gates.md). They summarize those records and do not supersede them.

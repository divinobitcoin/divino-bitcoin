# Contributing to Divino Bitcoin

Thank you for taking an interest in Divino Bitcoin. The project welcomes serious contributions to code, tests, documentation, translations, accessibility, design, threat modeling, and independent review.

## Start with the current scope

Divino Bitcoin is an open-source, self-custodial wallet project licensed under GPL-3.0-or-later. The application is currently in local demonstration mode, with Signet as its only development environment. Mainnet, real funds, seeds, private keys, recovery, signing, broadcast, operational endpoints, and active Lightning remain blocked.

Contributions must not bypass these limits or represent unavailable capabilities as complete. Read `README.md`, `SECURITY.md`, `docs/threat-model.md`, and the relevant architecture documents before proposing a sensitive change.

## Ways to contribute

| Contribution | Good first step |
|---|---|
| Bug report | Search existing issues; provide reproducible steps and non-sensitive logs. |
| Product or design suggestion | Explain the user problem, constraints, alternatives, and expected trade-offs. |
| Documentation improvement | Open a focused pull request that keeps technical claims verifiable. |
| Code or test change | Open an issue or discussion first when the change affects security boundaries, navigation, storage, or scope. |
| Security research | Follow `SECURITY.md`; do not disclose exploitable details in a public issue or discussion. |

## Development expectations

Keep pull requests focused and explain both what changes and what intentionally remains unchanged. Do not add credentials, API keys, seed phrases, private keys, device backups, personal data, or real-fund workflows. Android screens must use native `StyleSheet` APIs rather than NativeWind `className`, and the Android navigation tree must remain separate from the web/iOS tree.

Before requesting review, run the project’s applicable tests, TypeScript check, and lint command. Add or update tests whenever a behavior changes. A maintainer may request changes, defer work, or decline a proposal when it weakens security, conflicts with documented scope, or lacks sufficient evidence.

## Community standard

Be respectful, precise, and transparent about conflicts of interest. The project welcomes disagreement grounded in evidence. It does not accept spam, fraud, harassment, discrimination, token promotion, investment solicitation, fabricated claims, vote manipulation, or pressure to bypass security gates.

By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md). For general contact, use `contatodivinobitcoin@proton.me`.

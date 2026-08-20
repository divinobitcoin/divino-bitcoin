# Divino Bitcoin: An Open, Self-Custodial Wallet Built Through Verifiable Gates

**Status:** public technical statement.
**Version:** 1.0.
**Purpose:** describe the project’s scope, principles, current technical posture, and conditional path forward. This document is not a security guarantee, investment communication, release announcement, or invitation to use real funds.
**Change policy:** material updates must preserve the distinction between verified project state, verified policy, design hypotheses, and long-term objectives.

> **Plain-language status.** Divino Bitcoin is currently a local demonstration application. It has no Mainnet support, real funds, seed generation or recovery, private-key handling, signing, broadcasting, operational endpoints, or active Lightning functionality. Signet is the only designated development environment, and it is not yet connected as an operational wallet flow.

> **Reader guide.** This paper labels project statements as **verified project state**, **verified policy**, **design hypothesis**, or **long-term objective**. A design hypothesis is not implemented capability; a long-term objective is not a delivery commitment.

## Abstract

Divino Bitcoin is an open-source mobile wallet project that pursues Bitcoin self-custody through auditable engineering rather than unverified claims. Its direction is a client-controlled wallet with future on-chain and Lightning capability, built in public under GPL-3.0-or-later, reviewed by independent contributors, and advanced only when explicit security gates are satisfied.

The project begins deliberately below the threshold of economic risk. Its current application is a demonstrative local interface implemented with Expo, React Native, TypeScript, and Expo Router. A native Kotlin/Swift vault module exists only as an opaque, fail-closed integration boundary. It rejects sensitive operations and does not create, import, store, display, sign with, or transmit any secret. The project’s progress is therefore measured by evidence, tests, reviews, threat modeling, and controlled scope — not by a claim that a production wallet already exists.

## 1. Purpose and principles

Bitcoin’s original paper describes electronic payments exchanged directly between parties without a financial institution, using cryptographic proof in place of a trusted third party.[1] Divino Bitcoin takes that direction as an engineering aspiration: the user, not the project, should ultimately control the assets and the authorization material required to move them.

That aspiration imposes constraints. Self-custody is not established by a logo, a balance screen, or a marketing statement. It depends on safe lifecycle handling for secrets, transaction intent, recovery, network data, releases, and upgrades. The project therefore treats security as a set of verifiable obligations rather than as a product adjective.

| Principle | Commitment | Practical consequence |
|---|---|---|
| **Free software** | The project is licensed GPL-3.0-or-later and invites serious, reviewable contribution. The GPL is a copyleft free-software license designed to preserve users’ ability to share and change covered works.[2] | Source, change history, dependency choices, documentation, and security rationale should remain inspectable. Licensing does not itself prove security. |
| **User custody** | Future wallet secrets and signing authority must remain under the user’s control. | No project service, maintainer, or provider may receive a seed, private key, channel secret, or spending authority. |
| **Defense in depth** | A mobile wallet must assume device loss, malicious apps, dishonest endpoints, supply-chain compromise, and user error. | Controls are layered across UI, native boundary, local storage, network handling, release process, and independent review. |
| **Explicit consent** | A transaction is only as safe as the user’s ability to understand the final intent. | Network, destination, amount, fee, and irreversibility must be visible before any future signing step. |
| **Open participation with standards** | Community input is valuable when it is evidence-based and respectful. | Contributions follow documented conduct, disclosure, review, and scope controls; spam, fraud, harassment, token promotion, and pressure to bypass gates are out of scope. Openness does not convert technical criticism into a mandate to deploy. |

## 2. Scope and status

The following distinctions are intentional. A reader should be able to tell what has been verified, what has been designed but not enabled, and what remains an objective.

| Category | Statement | Classification | Evidence or condition |
|---|---|---|---|
| Application foundation | The app uses Expo, React Native, TypeScript, and Expo Router, with separate Android navigation and web/iOS layout trees. Android screens use native `StyleSheet` styling rather than NativeWind classes. | **Verified project state** | Source code, TypeScript checks, lint, and device testing records. |
| Local demonstration | The interface supports demonstrative onboarding, wallet, receive, send, and settings flows without access to real Bitcoin operations. | **Verified project state** | Local application flow and project tests. |
| Native vault boundary | Kotlin and Swift modules expose an opaque interface that fails closed for sensitive operations. | **Verified project state** | Native module source, negative tests, and development-build diagnostic test. |
| Development environment | Signet is the only designated future development network. | **Verified policy** | `SECURITY.md`, threat model, and security gates. |
| Deterministic wallet standards | BIP-32, BIP-39, BIP-84, and PSBT are relevant interoperability references for future design. [3] [4] [5] [6] | **Design hypothesis** | Requires independent review and a specific gate before user secret handling. |
| On-chain and Lightning support | The project aims to build user-controlled on-chain and Lightning capabilities. | **Long-term objective** | No operational implementation, endpoint, signer, broadcast, channel, invoice, or payment is enabled; no delivery date is implied. |

The project has run automated tests, TypeScript checks, and lint checks for its current demonstration scope. A Kotlin development-build integration was also tested on an Android device, where the vault diagnostic correctly returned the intended explicit block. These results support only the narrow claims above; they do **not** validate a wallet, custody implementation, cryptography, network integration, or financial use.

## 3. Architecture and trust boundaries

The application is designed to keep the product interface, domain state, native boundary, and future network layers distinguishable. This separation does not eliminate risk; it makes the attack surface and the review scope clearer.

| Layer | Current role | Future responsibility | Security boundary |
|---|---|---|---|
| **Presentation** | Demonstrative screens for onboarding, wallet activity, sending, receiving, and settings. | Present critical intent clearly and avoid confusing demo state with operational state. | The UI must never imply a completed payment, live balance, or enabled network when none exists. |
| **Application domain** | Local demonstration state and guarded flows. | Model networks, wallet state, transaction intent, permissions, and error states explicitly. | Demo, Signet, and Mainnet must remain distinct in types, storage, navigation, and UI. |
| **Native vault** | Kotlin/Swift bridge with opaque interfaces and fail-closed sensitive methods. | Subject to separate design and review before it may mediate protected local operations. | No seed, private key, signing request, backup, or secret may cross a boundary without an approved design and tests. |
| **Network adapters** | Not operational. | Future configurable on-chain sources, then reviewed Lightning interfaces. | Remote services are untrusted inputs; no implicit fallback, hard-coded production endpoint, or silent network switch is acceptable. |
| **Build and supply chain** | Public repository, dependency lockfile, SBOM practice, and checkpoint history. | Reproducible release evidence, provenance, and reviewable updates. | Source provenance and build integrity are part of the custody perimeter. |

The native vault is intentionally **not** a claim of secure key storage. It is a controlled boundary for future work. Its present safe behavior is to refuse sensitive calls. It becomes meaningful only after architecture review, threat-model updates, negative tests, platform review, and explicit authorization for the next limited capability.

## 4. Security model

The project threat model identifies the mnemonic, seed, passphrase, derived keys, transaction intent, network configuration, channel state, logs, diagnostics, source code, and release artifacts as security-relevant assets. The model considers physical access, malicious overlays, compromised devices, hostile endpoints, supply-chain compromise, phishing, and availability attacks.

Three invariants guide the work:

| Invariant | Meaning |
|---|---|
| **No silent secret exposure** | A future secret must not be sent over the network, recorded in logs, placed in analytics, written to an automatic backup, copied to a clipboard, or included in error reporting. OWASP’s mobile testing guidance specifically recommends examining code, application storage, and system/application logs for sensitive data, and notes that constructing log strings can itself leave plaintext material in memory.[7] |
| **No silent financial authorization** | A future signing flow must bind the exact final payload to a human-readable summary of network, destination, amount, fee, and relevant transaction details. |
| **No silent environment transition** | Demo, Signet, and Mainnet must not share a fallback path, secret, storage namespace, UTXO, address, endpoint configuration, or history. |

The project’s model does not promise absolute anonymity, perfect endpoint availability, security against total operating-system compromise, recovery of a lost secret, or safety from all coercion and user error. In particular, biometrics or PINs are local unlocking mechanisms; they are neither a wallet seed nor an independent proof that a transaction is safe.

## 5. Interoperability is not activation

The project has evaluated public test vectors for BIP-32 and BIP-39, but that is limited to deterministic, non-user test material. BIP-32 specifies hierarchical deterministic wallets and test vectors, while BIP-39 specifies mnemonic encoding and conversion to a binary seed.[3] [4] These specifications are useful interoperability references; they do not turn an application into a safe wallet, and they do not authorize the project to collect, generate, persist, or display a user’s recovery material.

| Reference | Relevance | Current project stance |
|---|---|---|
| **BIP-32** | Hierarchical deterministic wallet structure and derivation test vectors. [3] | Public deterministic vectors only; no user keys. |
| **BIP-39** | Mnemonic format and seed derivation. [4] | Public test vectors only; no mnemonic or recovery flow. The BIP also documents limitations that future UX and review must address. |
| **BIP-84** | Native SegWit account derivation scheme. [5] | Future interoperability design reference only. |
| **BIP-174** | Partially Signed Bitcoin Transactions, supporting separation between construction and signing. [6] | Future transaction-architecture reference only. |
| **BIP-325** | Signet, a Bitcoin test network with its own block-signature rules. [8] | Only designated future development environment; it is not currently enabled as an operational wallet flow. |
| **BOLT specifications** | Open Lightning specifications developed through a public work-in-progress process. [9] | Long-term architecture reference only; no active Lightning function exists. |

## 6. Conditional development path

The roadmap is governed by gates rather than dates. The current priority is documentation, community process, and independent review of the native boundary. The first controlled operational milestone is not a payment: it is a Signet observation flow with no secret, no signing, no broadcast, no fixed endpoint, and no economic value.

| Sequence | Intended outcome | Required gate before proceeding |
|---|---|---|
| **Foundation** | Public source baseline, license, contribution standards, threat model, SBOM, and transparent decision protocol. | Documentation and community review must not create an implied production claim. |
| **Independent vault review** | Evaluate Kotlin/Swift scope, fail-closed behavior, platform parity, and negative tests. | Independent reviewer report and documented response to findings. |
| **Non-economic Signet observation** | Produce reproducible evidence about a limited network-facing flow without custody or value. | Gates S0–S6, network isolation tests, and explicit owner authorization for each scope expansion. |
| **Controlled on-chain Signet work** | Design and test user-controlled on-chain behavior under a narrowly defined scope. | Approved secret lifecycle, signing architecture, recovery design, privacy review, and external security review. |
| **Lightning architecture** | Define a self-custodial Lightning design after the on-chain foundation is accepted. | Dedicated threat model, state-recovery plan, idempotency, channel backup, and specialized review. |
| **Mainnet readiness evaluation** | Assess whether a Mainnet proposal is justified. | Formal gates, independent audits, supply-chain evidence, owner approval, and a rollback/incident plan. Mainnet is never enabled by default. |

The full roadmap is maintained in the companion document, [`docs/roadmap.md`](./roadmap.md). It should be read as a dependency map, not a delivery calendar.

## 7. Open-source collaboration

Divino Bitcoin treats open source as a construction method. Reviewable source code, reproducing tests, clear decisions, issue templates, contribution guidance, and responsible disclosure provide a more durable basis for collaboration than promises. Contributors may help with documentation, test coverage, accessibility, translation, UX clarity, reproducible builds, secure architecture review, dependency analysis, and implementation proposals.

Security review must preserve the same boundary it evaluates. Reviewers should not request or receive user seeds, private keys, passphrases, production credentials, channel backups, personal data, or funds. The project is open to serious criticism and alternative designs, but a report must distinguish observed facts from assumptions and must not pressure maintainers to bypass documented gates.

## 8. Limitations and non-claims

This draft does not claim that Divino Bitcoin is ready for financial use. It does not claim an audit, a Mainnet release, a functioning backup or recovery process, hardware-wallet compatibility, Lightning support, privacy guarantees, or protection from compromised devices. It does not promise a schedule for any of those outcomes.

The project’s strongest current claim is narrower: its demonstrative application, documentation, test practices, native-boundary scaffold, and review process establish an auditable starting point for a security-sensitive open-source wallet project. Whether the project earns the right to advance beyond that point depends on future evidence, independent scrutiny, and explicit decisions — never on aspiration alone. This paper will be revised whenever verified project state, policy, or public scope materially changes.

## References

[1]: [Satoshi Nakamoto, “Bitcoin: A Peer-to-Peer Electronic Cash System”](https://bitcoin.org/bitcoin.pdf)
[2]: [GNU General Public License v3.0](https://www.gnu.org/licenses/gpl-3.0.en.html)
[3]: [BIP-32 — Hierarchical Deterministic Wallets](https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki)
[4]: [BIP-39 — Mnemonic code for generating deterministic keys](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki)
[5]: [BIP-84 — Derivation scheme for P2WPKH based accounts](https://github.com/bitcoin/bips/blob/master/bip-0084.mediawiki)
[6]: [BIP-174 — Partially Signed Bitcoin Transactions](https://github.com/bitcoin/bips/blob/master/bip-0174.mediawiki)
[7]: [OWASP MASTG — Testing Logs for Sensitive Data](https://mas.owasp.org/MASTG/tests/android/MASVS-STORAGE/MASTG-TEST-0003/)
[8]: [BIP-325 — Signet](https://github.com/bitcoin/bips/blob/master/bip-0325.mediawiki)
[9]: [Lightning Network In-Progress Specifications](https://github.com/lightning/bolts)

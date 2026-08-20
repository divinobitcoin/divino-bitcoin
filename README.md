# Divino Bitcoin

Divino Bitcoin é uma carteira Bitcoin de autocustódia em desenvolvimento, construída com Expo, React Native e TypeScript. Este repositório público é disponibilizado sob a licença **GPL-3.0-or-later** para permitir revisão de código, reprodução de testes e colaboração responsável.

> **Estado de segurança atual:** o aplicativo permanece em modo demonstrativo local. Mainnet, conexões Signet ativas, endpoints de rede, seeds, chaves privadas, assinaturas, PSBT, broadcast, Lightning e fundos reais estão bloqueados.

## Escopo público atual

O marco público inclui a fronteira opaca do cofre nativo para Android (Kotlin) e iOS (Swift), a bridge Expo/TypeScript, controles negativos contra exposição por logs, clipboard, backup e armazenamento, além dos gates do primeiro fluxo Signet sem valor econômico.

O objetivo da fronteira nativa nesta fase é **rejeitar** explicitamente operações sensíveis; ela não cria, recebe, persiste, revela, exporta nem utiliza qualquer material secreto.

## Revisão independente

Buscamos uma revisão independente, com escopo fechado, do limite Kotlin/Swift do cofre nativo. Antes de responder, consulte:

| Documento | Finalidade |
|---|---|
| [`docs/adr-0001-native-vault.md`](docs/adr-0001-native-vault.md) | Decisão arquitetural e limites de segurança do cofre nativo. |
| [`docs/independent-native-vault-review-checklist.md`](docs/independent-native-vault-review-checklist.md) | Checklist técnico para Kotlin, Swift e a bridge. |
| [`docs/reviewer-invitation/`](docs/reviewer-invitation/) | Carta de escopo, critérios de aceite, modelo de relatório e textos de divulgação. |
| [`SECURITY.md`](SECURITY.md) | Política de divulgação responsável. |

Para coordenação privada relacionada à revisão, use **contatodivinobitcoin@proton.me**. Não envie seeds, chaves, tokens, códigos de autenticação, dados pessoais sensíveis ou fundos.

## Desenvolvimento local

Pré-requisitos: Node.js 22, pnpm 9 e um ambiente Expo compatível.

```bash
pnpm install
pnpm test
pnpm check
pnpm lint
pnpm dev
```

Os testes usam apenas vetores públicos e dados determinísticos. O software não deve ser usado para armazenar ou movimentar bitcoin.

## Licença

Copyright © Divino Bitcoin contributors.

Este projeto é distribuído sob os termos da [GNU General Public License v3.0 ou posterior](LICENSE).


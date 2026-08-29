# Divino Bitcoin

Divino Bitcoin é uma carteira Bitcoin de autocustódia em desenvolvimento, construída com Expo, React Native e TypeScript. Este repositório público é disponibilizado sob a licença **GPL-3.0-or-later** para permitir revisão de código, reprodução de testes e colaboração responsável.

> **Estado de segurança atual:** governado por [`docs/decisions/CARTA-001-CARTA-DA-CARTEIRA.md`](docs/decisions/CARTA-001-CARTA-DA-CARTEIRA.md) — quatro invariantes permanentes e um único gate. Em Signet ou Demo, com material descartável e valor econômico zero, o caminho on-chain completo (ler saldo, montar PSBT, assinar, revisar, transmitir, inclusive pelo nó próprio do usuário) é livre e já foi exercitado contra rede real — ver [`docs/decisions/`](docs/decisions/) para a evidência de cada marco. O que continua bloqueado, sem exceção, até auditoria externa independente: fundos reais, Mainnet, seed de usuário real, e qualquer afirmação de que o software está pronto ou é seguro para uso real.

## Escopo público atual

O marco público inclui a fronteira opaca do cofre nativo para Android (Kotlin) e iOS (Swift), a bridge Expo/TypeScript, controles negativos contra exposição por logs, clipboard, backup e armazenamento, o caminho on-chain completo em Signet (leitura, PSBT, assinatura de laboratório, transmissão — via Esplora público ou via nó Bitcoin Core próprio), e a governança de [`CARTA-001`](docs/decisions/CARTA-001-CARTA-DA-CARTEIRA.md).

O objetivo da fronteira nativa nesta fase é **rejeitar** explicitamente operações sensíveis; ela não cria, recebe, persiste, revela, exporta nem utiliza qualquer material secreto. Essa fronteira — o cofre nativo com segredo real — é o que permanece atrás do gate único, não o caminho on-chain de laboratório.

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


cat > /home/divino/Documentos/divino-bitcoin/README.md << 'FIM'
# Divino Bitcoin

Divino Bitcoin é uma carteira Bitcoin de autocustódia em desenvolvimento, construída com Expo, React Native e TypeScript. Este repositório público é disponibilizado sob a licença **GPL-3.0-or-later** para permitir revisão de código, reprodução de testes e colaboração responsável.

> **Estado de segurança atual:** governado por [`docs/decisions/CARTA-001-CARTA-DA-CARTEIRA.md`](docs/decisions/CARTA-001-CARTA-DA-CARTEIRA.md). Em Signet, com material descartável e valor económico zero, o caminho on-chain completo (ler saldo, montar PSBT, rever no ecrã nativo, assinar, transmitir — Esplora público ou nó Bitcoin Core próprio) já foi exercitado contra rede real. O que continua bloqueado até auditoria externa independente: fundos reais, Mainnet, seed de utilizador real, e qualquer afirmação de que o software está pronto ou é seguro.

## Escopo público atual

O marco público inclui a fronteira do cofre nativo para Android (Kotlin) e iOS (Swift), a bridge Expo/TypeScript, controlos contra exposição por logs, clipboard, backup e armazenamento, o caminho on-chain completo em Signet, e a governação de [`CARTA-001`](docs/decisions/CARTA-001-CARTA-DA-CARTEIRA.md).

Em Signet de laboratório o cofre nativo **Android gera, restaura e assina** (BIP-84). A seed não sai do aparelho nem passa pelo JavaScript. iOS não é este cofre. Material descartável, valor zero. O que continua bloqueado até auditoria externa: Mainnet, seed de utilizador real, afirmação de que o software é seguro.

Ver também [`docs/ALINHAMENTO-IA.md`](docs/ALINHAMENTO-IA.md).

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

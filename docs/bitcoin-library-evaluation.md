# Avaliação de Biblioteca Bitcoin para Vetores BIP Públicos

**Data:** 20 de agosto de 2026  
**Decisão:** adotar `@scure/bip39` e `@scure/bip32` apenas para confirmar vetores públicos congelados em testes.  
**Limite:** a decisão não autoriza geração de mnemonic, importação de seed, derivação de perfil de usuário, exportação de chave, assinatura, PSBT, conexão on-chain ou Lightning.

## Alternativas e critério

O projeto já usa `@noble/curves`, `@noble/hashes` e `bech32` para validação local de BOLT11, sem pagamento. Para BIP-32 e BIP-39, a família `@scure` oferece implementações TypeScript pequenas, ESM e com dependências mínimas na mesma família técnica. O repositório de `@scure/bip32` declara três dependências auditadas — `@noble/curves`, `@noble/hashes` e `@scure/base` — e documenta auditabilidade, *tree-shaking*, builds transparentes e releases assinados. [1] A implementação de BIP-39 declara uma única dependência, `@noble/hashes`, além de listas de palavras carregadas explicitamente. [2]

| Critério | `@scure/bip32` e `@scure/bip39` | Consequência para este marco |
|---|---|---|
| Escopo | BIP-32 HD/secp256k1 e BIP-39 mnemonic/seed. [1] [2] | Cobre a verificação de vetores sem trazer PSBT ou broadcasting. |
| Auditoria | Os repositórios declaram auditoria independente Cure53 em 2022 e autoauditoria de abril de 2026. [1] [2] | A auditoria reduz risco, mas não substitui revisão de versão, lockfile e testes locais. |
| Cadeia de fornecimento | Releases PGP-assinados, Trusted Publishing e dependências reduzidas são práticas declaradas pelo mantenedor. [1] [2] | As versões serão fixadas no lockfile e incluídas no SBOM. |
| Limite de segurança | `HDKey` pode expor chain code, chave privada e assinar; o próprio repositório alerta que chain code é parte privada do segredo. [1] | A aplicação não pode expor essa API para o produto nem aceitá-la fora das fixtures públicas. |

> A expressão “auditada” é uma propriedade documentada do projeto upstream, não uma garantia de adequação para custódia de usuários. A própria documentação de `@scure/bip32` alerta sobre os riscos de BIP-32 e o uso indevido de derivação não endurecida. [1]

## Arquitetura de integração limitada

A integração será confinada a um módulo de teste de vetores. Ele receberá apenas valores publicados em BIP-32/BIP-39 que já estão versionados no repositório e comparará resultados públicos determinísticos. O módulo não será importado pelas telas, `WalletProvider`, armazenamento, fontes Signet nem qualquer ponte nativa. As APIs de gerar mnemonic, converter mnemonic para seed com dados de entrada, derivar caminho arbitrário, ler `privateKey`, obter `chainCode` e assinar não farão parte da interface de produção.

Os testes permitidos são: verificar que a frase pública do vetor BIP-39 é reconhecida, confirmar a seed pública esperada, confirmar o `xpub` e os `xprv` publicados do vetor BIP-32 e validar que a política `test-compatible` produz somente a representação de caminho prevista. A fixture de BIP-39 não será exibida na interface e continuará identificada como material público de interoperabilidade, nunca como seed de carteira.

As versões `2.3.0` de `@scure/bip32` e `@scure/bip39` foram instaladas de forma exata no manifesto e resolvidas no lockfile. O teste `scure-bip-public-vectors.test.ts` limita a execução a um vetor BIP-39 e a comparação de `xpub` BIP-32 publicados. Embora o vetor BIP-39 contenha a string `TREZOR`, ela é um valor publicado pela especificação; não representa suporte a passphrase no aplicativo. Ao terminar a comparação, o teste chama `wipePrivateData()` nos objetos efêmeros criados a partir dos dados públicos.

## Gates antes de ampliar o uso

Antes de qualquer uso fora dos vetores, o projeto precisará atender todos os gates da ADR-0001: módulo nativo opaco, não exportação de chave, política de recuperação validada, build próprio em Android/iOS, revisão independente, SBOM, e ausência de vulnerabilidade alta no caminho do cofre. A presença atual de 31 vulnerabilidades altas mantém este gate fechado.

## Referências

[1] [paulmillr/scure-bip32 — repositório e documentação](https://github.com/paulmillr/scure-bip32)  
[2] [paulmillr/scure-bip39 — repositório e documentação](https://github.com/paulmillr/scure-bip39)  
[3] [Noble Cryptography — cadeia de auditorias e projetos scure](https://paulmillr.com/noble/)  
[4] [BIP-32 — Hierarchical Deterministic Wallets](https://bips.dev/32/)  
[5] [BIP-39 — Mnemonic code for generating deterministic keys](https://bips.dev/39/)

# Divino Native Vault

Cofre Signet opaco. Mnemonic, seed e chave privada nunca cruzam a bridge JavaScript.

O JavaScript pode chamar:

| Chamada | Recebe |
|---|---|
| `provisionSignetProfile` | handle opaco, fingerprint público |
| `getPublicDescriptor` | descritor `wpkh(...)`, tpub |
| `authorizeSigningIntent` | PSBT assinada (sem chave) |
| `deleteProfile` | ok / erro |

A frase é gerada ou digitada numa tela nativa (Kotlin Activity / Swift ViewController). Confirmação no papel é obrigatória na criação. Experimental, não auditado, material descartável, valor econômico zero.

Android: AES-256-GCM no Keystore, ciphertext em `getNoBackupFilesDir()`, cripto BIP-39/32/84/PSBT via bitcoin-kmp (ACINQ). iOS: Keychain `ThisDeviceOnly`.

O módulo entra pelo autolinking do Expo. Use `pnpm dev:metro:dev-client` e um development build. O Expo Go não inclui o módulo. Reconstrua o binário depois de alterar Kotlin ou Swift.

`getSeed`, `exportPrivateKey`, `decryptSecret` e `readMnemonic` não existem e são recusados por `assertOperationUnavailableAsync`.

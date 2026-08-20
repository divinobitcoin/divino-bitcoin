# Divino Native Vault

Este é o esqueleto local do cofre nativo previsto na ADR-0001. Ele só expõe capacidades públicas e uma falha explícita para operações não implementadas. Não cria, importa, lê, cifra, deriva, assina, exporta ou persiste seed, chave privada, mnemonic, preimage ou backup de canal.

O módulo é descoberto pelo autolinking local do Expo. Para incluí-lo em um binário de teste, use o script `pnpm dev:metro:dev-client`, gere um development build próprio e reconstrua-o sempre que o código Kotlin ou Swift mudar. O Expo Go não inclui o módulo e não deve ser usado para testar o cofre.

Antes de implementar qualquer operação secreta, todos os gates da [`ADR-0001`](../../docs/adr-0001-native-vault.md) devem estar concluídos e aprovados.

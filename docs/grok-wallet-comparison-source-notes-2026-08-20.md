# Notas de Fonte — Conversa Grok Wallet

**Fonte primária:** conversa referenciada pelo proprietário, **Grok Wallet** (`wYeTI2ZPk24dm574YZefV5`), recuperada em 20 de agosto de 2026 por acesso autorizado à referência de sessão.

## Fatos recuperados

O material da conversa descreve um projeto paralelo chamado `divino-bitcoin-paralelo`, cuja direção inicial é **Flutter** para Android e iOS. Riverpod ou Bloc permanecem como alternativas de gerenciamento de estado; portanto, a escolha não foi consolidada. O documento propõe BDK para on-chain, LDK para Lightning e bindings Flutter correspondentes como candidatos, com a própria conversa reconhecendo que manutenção, compatibilidade e testes reproduzíveis desses bindings ainda precisariam ser avaliados.

A visão funcional daquele material é ampla: criação/restauração de seed BIP-39, BIP-32/BIP-84/BIP-86, recebimento, envio, estimativa de taxa, PIN/biometria, backup, Lightning, canais, Tor, PSBT, multisig e outros recursos avançados. Ela também prevê armazenamento protegido por Keystore/StrongBox no Android e Keychain/Secure Enclave no iOS. Esses itens eram objetivos ou propostas, não evidência de que estivessem implementados.

Os eventos mais recentes recuperados da conversa mostram trabalho de preparação de ambiente Android leve para Flutter: o celular e Flutter foram reconhecidos, mas ainda se orientava localizar/configurar `sdkmanager`, instalar plataformas e ferramentas Android, aceitar licenças e executar `flutter doctor`/`flutter run`. Os artefatos listados incluem `main.dart`, `widget_test.dart`, `README.md`, um arquivo de continuidade e guias de Android SDK. Não há, na referência recuperada, evidência de integração BDK/LDK, cofre nativo funcional, rede Bitcoin, Signet, chaves de usuário, assinatura ou transação real.

## Limite de interpretação

Estas notas distinguem explicitamente **visão planejada** de **estado verificado**. A comparação subsequente não deve promover as bibliotecas, recursos de seed, armazenamento ou Lightning do projeto paralelo ao status de implementação ou aprovação de segurança no Divino Bitcoin atual.

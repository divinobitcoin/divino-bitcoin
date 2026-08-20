# Pesquisa de Referência — Cofre Nativo

**Data:** 20 de agosto de 2026

## Fontes primárias e controles extraídos

| Fonte | Achado relevante para a ADR | Implicação para o Divino Bitcoin |
|---|---|---|
| Android Developers — [Key attestation](https://developer.android.com/privacy-and-security/security-key-attestation) | A atestação pode aumentar a confiança de que pares de chaves estão em Keystore apoiado por hardware. | Não será requisito de lançamento nem substituto de recuperação; será avaliada para telemetria local de integridade sem identificar o usuário. |
| Android Developers — [Android Keystore](https://developer.android.com/privacy-and-security/keystore) | Chaves podem ser criadas e usadas em Keystore com autorizações de uso e autenticação. | A chave de envelope do cofre deve ser não exportável e criada no Keystore; uma seed nunca deve ser usada como chave de Keystore. |
| Apple — [Protecting keys with the Secure Enclave](https://developer.apple.com/documentation/security/protecting-keys-with-the-secure-enclave) | Secure Enclave é um gerenciador de chaves isolado do processador principal. | O adaptador iOS deverá usar uma chave não exportável no Secure Enclave quando o hardware e a API permitirem. |
| Apple — [Keychain data protection](https://support.apple.com/guide/security/keychain-data-protection-secb0694df1a/web) | A proteção do Keychain depende de classes de acessibilidade e de chaves vinculadas ao dispositivo. | Registros cifrados exigirão classe que não permita sincronização automática e que respeite o bloqueio do aparelho. |
| OWASP — [MASVS-CRYPTO-2](https://mas.owasp.org/MASVS/controls/MASVS-CRYPTO-2/) | O controle cobre gestão de chaves durante todo o ciclo de vida. | A ADR precisa definir criação, uso, rotação, invalidação, backup e destruição, não somente armazenamento. |
| OWASP — [Key Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Key_Management_Cheat_Sheet.html) | Gestão de chaves requer políticas de ciclo de vida e separação de responsabilidades. | Segredos de carteira, chaves de envelope e preferências de biometria permanecerão em domínios separados. |

> Os achados descrevem controles de plataforma; eles não tornam um aparelho comprometido confiável e não autorizam a introdução de mnemonic, chave privada ou saldo real nesta fase.

## Módulo local e development build

| Fonte | Achado relevante | Decisão de implementação |
|---|---|---|
| Expo Modules API — [Get started](https://docs.expo.dev/modules/get-started/) | Um módulo local criado no próprio aplicativo fica em `modules/<nome>/` com `android/`, `ios/`, `src/` e `expo-module.config.json`. Mudanças nativas exigem reconstrução. | O esqueleto será um módulo local `divino-native-vault`, com APIs opacas e sem qualquer método de ler, exportar ou persistir segredo. |
| Expo — [Tutorial de módulo nativo](https://docs.expo.dev/modules/native-module-tutorial/) | A API de módulos Expo permite definir a mesma interface em Kotlin, Swift e TypeScript por meio de `requireNativeModule`. | A camada TypeScript exporá apenas capacidades e resultados públicos; as implementações Kotlin/Swift lançarão estado “não provisionado” até os gates da ADR serem cumpridos. |
| Expo — [Development builds](https://docs.expo.dev/develop/development-builds/introduction/) | Development build é uma versão própria do Expo Go capaz de incluir código nativo; alterações nativas exigem reconstrução. | O cofre não será carregado ou testado no Expo Go. O guia do projeto exigirá `expo-dev-client`, prebuild e rebuild em aparelho para o futuro teste nativo. |

O esqueleto não criará diretórios `android/` ou `ios/` gerados do aplicativo nesta fase e não executará `prebuild`; isso evita transformar uma definição de interface em uma alteração de build não validada. Quando os gates de implementação forem aprovados, a criação do *development build* será um marco separado, com revisão do diff nativo, reconstrução e teste físico em Android/iOS.

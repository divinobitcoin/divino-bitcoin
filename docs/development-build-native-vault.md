# Development Build Android — Cofre Nativo

## Objetivo e escopo

Este roteiro prepara um **development build Android** que inclui, por autolinking, o módulo local `divino-native-vault`. O binário serve apenas para confirmar que a ponte TypeScript alcança o módulo Kotlin e que as operações continuam indisponíveis. Ele não cria, importa, lê, persiste, cifra, deriva, exporta ou transmite seed, mnemonic, chave privada, assinatura, backup, preimage, saldo ou pagamento.

O Expo Go não incorpora módulos locais. Portanto, a ação **Diagnóstico do cofre nativo** em **Ajustes** informa que um development build é necessário quando executada no Expo Go; esse resultado é esperado e não deve ser tratado como falha.

## Preparação do binário

| Etapa | Comando ou ação | Resultado esperado |
|---|---|---|
| Instalar dependências | `pnpm install --frozen-lockfile` | Dependências idênticas ao lockfile. |
| Validar configuração | `pnpm native:android:validate` | A configuração Expo é resolvida para Android. |
| Gerar projeto nativo | `pnpm native:android:prebuild` | A pasta Android local é gerada; ela não é versionada. |
| Compilar e instalar localmente | `pnpm android:dev-client` | Um APK de development build é instalado no dispositivo Android conectado por USB. |
| Alternativa de build interno | Usar o perfil `development` de `eas.json` no processo de build autorizado. | APK interno com `expo-dev-client` e o módulo local incluídos. |

Sempre reconstrua o binário depois de alterar Kotlin, Swift, `expo-module.config.json`, permissões ou qualquer configuração nativa. Alterações apenas em TypeScript podem ser recarregadas pelo servidor de desenvolvimento.

## Roteiro de teste no Xiaomi Note 11S

Após instalar o development build, inicie `pnpm dev:metro:dev-client`, abra **Divino Bitcoin** instalado — e não o Expo Go — e conecte-o ao servidor de desenvolvimento. Na aba **Ajustes**, toque em **Testar integração** na seção **Development build**.

O resultado aprovado é um alerta que confirma, ao mesmo tempo, a resposta Kotlin do módulo e a rejeição de `assertOperationUnavailableAsync`. A tela não exibe valores secretos e a operação invocada é somente a cadeia pública `diagnóstico público de integração`. Se aparecer “Contrato inesperado” ou “Bloqueio ausente”, interrompa o teste e não habilite nenhum fluxo de cofre.

## Limites de segurança

O APK de desenvolvimento não é uma carteira pronta para fundos. Signet conectado, Mainnet, integração Lightning, geração/importação de seed, armazenamento no Keystore, assinatura e recuperação seguem bloqueados pelos gates da [ADR-0001](./adr-0001-native-vault.md). A conclusão deste diagnóstico apenas valida o caminho de incorporação nativa necessário para uma revisão futura.

## Compatibilidade de compilação Android

React Native `0.83.10` inclui o resolvedor Foojay `0.5.0` no plugin Gradle. Essa versão referencia `IBM_SEMERU`, constante removida no Gradle 9, fazendo a compilação falhar antes de alcançar o código Android. A solução reproduzível adotada é o plugin Expo [`with-gradle-8-compatibility.js`](../plugins/with-gradle-8-compatibility.js), que altera apenas o wrapper **gerado** para Gradle `8.13` durante o prebuild. O Android Gradle Plugin `8.12.0` usado pela árvore React Native exige Gradle `8.13` e Java 17, tornando essa combinação compatível.

O ajuste não modifica `node_modules`, não altera a interface do cofre e só existe para a geração Android. Ele deve ser removido quando uma atualização de React Native substituir o resolvedor Foojay incompatível. A causa e a correção upstream permanecem registradas para a revisão de manutenção.[1] [2]

## Estado da validação técnica

Em 20 de agosto de 2026, o prebuild Android limpo concluiu com o wrapper em Gradle `8.13` e o autolinking detectou `divino-native-vault`, incluindo `expo.modules.divinonativevault.DivinoNativeVaultModule`. A compilação local atravessou a configuração dos plugins Expo e React Native sem o erro do Foojay; ela parou somente porque este ambiente não contém um Android SDK (`ANDROID_HOME` não configurado). Assim, nenhum APK foi produzido no sandbox.

O APK de development build foi então gerado pelo fluxo autorizado, instalado e aberto no Xiaomi Note 11S. A gravação do teste confirma a abertura do ícone **Divino Bitcoin** — não Expo Go —, a navegação por Boas-vindas, Carteira e Ajustes, e a execução de **Ajustes → Diagnóstico do cofre nativo → Testar integração**. O alerta aprovado foi **“Cofre nativo integrado”** e declarou que o módulo Kotlin respondeu, bloqueou a operação de teste e não criou, leu ou gravou seed, chave, assinatura ou dado de cofre. Os valores visíveis de carteira estavam identificados como dados locais de demonstração; não foram exibidos segredos, backups, endereços reais, pagamentos ou fundos reais.

A validação física confirma somente a incorporação da ponte nativa opaca. Qualquer capacidade futura de criar, importar, exibir, exportar ou assinar com segredo continua sendo uma mudança de alto risco que exige os gates da ADR-0001, revisão independente e novo teste físico.

## Correção da falha remota de 20 de agosto de 2026

O log do build remoto confirmou que o autolinking incluiu `divino-native-vault` e que a compilação avançou até o código do módulo. A falha foi localizada em `DivinoNativeVaultModule.kt`: uma lambda de `AsyncFunction` que somente lançava exceção foi inferida pelo Kotlin como `Nothing`, tipo que não pode ser usado como parâmetro reificado pelo DSL do Expo. A rejeição continua obrigatória, mas agora passa por `rejectUnavailableOperation(...): Unit`; por isso, a função assíncrona tem retorno explicitamente tipado e ainda rejeita toda operação de cofre.

O mesmo log indicou a ausência de `expo-asset`, dependência de pares exigida por `expo-audio`; ela passou a ser declarada diretamente como `~55.0.19`. O Expo Doctor ainda informa divergência menor nas versões de React Navigation resolvidas pelo workspace. Ela não bloqueou prebuild, autolinking ou a compilação remota até o Kotlin, e não foi forçada para baixo porque a versão recomendada pelo diagnóstico conflita com o requisito de pares de `@react-navigation/elements` instalado. Esse aviso permanece rastreável e não é confundido com a falha Kotlin já corrigida. A documentação do Expo confirma que uma `AsyncFunction` é rejeitada quando seu corpo lança uma exceção.[3]

## Referências

[1]: https://github.com/react/react-native/issues/55781 "React Native issue #55781 — foojay-resolver-convention 0.5.0 incompatible with Gradle 9"
[2]: https://developer.android.com/build/releases/agp-8-12-0-release-notes "Android Developers — Android Gradle Plugin 8.12.0"
[3]: https://docs.expo.dev/modules/module-api/ "Expo Modules API — AsyncFunction"

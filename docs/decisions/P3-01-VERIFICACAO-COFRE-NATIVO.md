# P3-01 — Verificação do cofre nativo em aparelho Android real

**Status:** COMPLETO — os cinco critérios fail-closed foram verificados em aparelho físico.
**Data da verificação:** 26 de agosto de 2026
**Escopo:** verificação de fronteira. Nenhum segredo real de usuário foi criado, lido, gravado ou aceito.

## O que este documento é

Registro de evidência para o gate 5 da ADR-0001 ("Operação: development build em
Android/iOS, avaliação de armazenamento/biometria em aparelhos reais e nenhum uso
em Expo Go"), parte Android.

Este documento **não** libera nenhum gate subsequente. Ele encerra apenas a
afirmação pendente registrada como *"cofre nativo compilado e autolinkado;
comportamento fail-closed ainda não verificado em aparelho"*.

## Ambiente da verificação

| Item | Valor |
|---|---|
| Aparelho | Xiaomi Note 11 (Android), conectado por USB, `adb devices` → `device` |
| Origem do binário nativo | build local `assembleDebug`, worktree em `2007e36` |
| APK | `app-debug.apk`, 124.565.584 bytes, gerado em 25/08/2026 |
| JavaScript servido por | Metro (`npx expo start --dev-client`), repositório principal em `ed23834` |
| Expo Go | **não utilizado** — proibido pela ADR-0001 para qualquer teste de cofre |
| Máquina de build | Node 22.22.1, pnpm 9.12.0, JDK 17 |

Observação sobre a defasagem entre camadas: o binário nativo vem de `2007e36` e o
JavaScript de `ed23834`. Isso não invalida a verificação, porque o objeto sob
teste é o módulo Kotlin, que não foi alterado entre os dois commits. A camada JS
apenas exerce a fronteira; ela não é o que está sendo verificado.

## Contrato verificado

O módulo `DivinoNativeVault` (Kotlin,
`modules/divino-native-vault/android/src/main/java/expo/modules/divinonativevault/DivinoNativeVaultModule.kt`)
expõe exatamente duas operações assíncronas, e nenhuma outra:

- `getCapabilitiesAsync()` — devolve somente metadados públicos de fronteira
- `assertOperationUnavailableAsync(operation)` — lança `IllegalStateException`

Não existe, no módulo, nenhuma rota de leitura de segredo: nenhum `getSeed`,
`exportPrivateKey`, `decryptSecret`, `readMnemonic` ou equivalente, conforme
exigido pela seção "Contrato de bridge e política de memória" da ADR-0001.

## Os cinco critérios fail-closed

Exercidos pela tela `app/(android-tabs)/settings.tsx`, seção "DEVELOPMENT BUILD",
ação "Diagnóstico do cofre nativo". A tela só apresenta o resultado positivo se
os cinco forem satisfeitos simultaneamente; qualquer divergência produz
"Contrato inesperado" ou "Bloqueio ausente".

| # | Critério | Esperado | Verificado |
|---|---|---|---|
| 1 | `status` | `"skeleton"` | ✅ |
| 2 | `requiresDevelopmentBuild` | `true` | ✅ |
| 3 | `usesNativeBoundary` | `true` | ✅ |
| 4 | `supportsSecretProvisioning` | `false` | ✅ |
| 5 | `supportsSigning` | `false` | ✅ |
| 6 | `assertOperationUnavailableAsync` | **rejeita** a chamada | ✅ |

O sexto item é o que distingue esta verificação de uma checagem meramente
declarativa: o módulo não apenas **afirma** que não suporta operações sensíveis,
ele **recusa ativamente** uma operação solicitada pela camada JavaScript. Uma
fronteira que só declarasse capacidades, sem recusar, seria uma fronteira
decorativa.

## Resultado

Mensagem apresentada pelo aparelho:

> Cofre nativo integrado — o módulo Kotlin respondeu no development build e
> bloqueou a operação de teste como previsto. Nenhuma seed, chave, assinatura ou
> dado de cofre foi criado, lido ou gravado.

## Afirmação honesta resultante

**Antes:** cofre nativo compilado e autolinkado; comportamento fail-closed ainda
não verificado em aparelho.

**Agora:** cofre nativo verificado em aparelho Android real; a ponte nativa
responde e o bloqueio fail-closed foi confirmado em execução.

## O que esta verificação NÃO estabelece

Registrado explicitamente para evitar leitura excessiva desta evidência:

- **Não** verifica iOS. O adaptador Swift permanece sem verificação em aparelho
  (bloqueado por indisponibilidade de macOS ou CI Apple).
- **Não** verifica armazenamento seguro, envelope cifrado, Keystore, StrongBox ou
  biometria — nada disso existe ainda no módulo, que é um esqueleto declarado.
- **Não** libera os gates 1 a 4 e 6 da ADR-0001, nem autoriza aceitação de
  segredo real de usuário.
- **Não** substitui revisão independente de código: o Kotlin do módulo continua
  sem revisor externo, exigência dos gates 2 e 3 da ADR-0001.
- **Não** resolve `VAULT-BACKUP-001` (`allowBackup=true`), que continua aberto e
  aguarda a decisão de arquitetura `RECOVERY-EXIT-001`.

## Achado colateral registrado

Durante a instalação, o APK anterior teve que ser desinstalado
(`INSTALL_FAILED_UPDATE_INCOMPATIBLE`: assinaturas divergentes). Isso confirma na
prática que o build local atual usa chave de depuração distinta da do artefato
anteriormente instalado no aparelho. Não é defeito — é comportamento esperado do
Android — mas fica registrado porque toca o tema de proveniência de artefato
(ameaça T5 do threat model) e será relevante quando existir política de
assinatura de release.

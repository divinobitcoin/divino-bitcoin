# Checklist de Revisão Independente — Cofre Nativo Kotlin e Swift

**Status:** obrigatório antes de qualquer API que aceite, crie, importe, recupere, exponha ou use material secreto.  
**Escopo atual:** módulo local `divino-native-vault`, sua ponte TypeScript, configuração de build e testes negativos.  
**Fora de escopo:** criação de seed, derivação BIP, assinatura, broadcast, Lightning, armazenamento real no Keystore/Keychain e fundos. Esses recursos continuam inexistentes e bloqueados.

> A aprovação deste checklist **não autoriza** custodiar segredo nem movimentar valor. Ela apenas qualifica a fronteira nativa opaca para uma fase posterior, sujeita aos gates da [ADR-0001](./adr-0001-native-vault.md).

## 1. Independência, pacote de evidências e regra de aprovação

O revisor não deve ser o autor das alterações avaliadas, nem aprovar seu próprio código sem uma segunda revisão independente. A revisão precisa registrar a versão exata do repositório, o hash do commit/checkpoint, versões de Expo, React Native, Kotlin, Swift e dependências, além dos comandos usados. O pacote deve conter a ADR, o modelo de ameaça, `SECURITY.md`, os resultados de testes e SBOM, a configuração de build e todos os arquivos do módulo nativo.

| Evidência obrigatória | Critério de aceite | Registro do revisor |
|---|---|---|
| Escopo congelado | Hash do checkpoint e `pnpm-lock.yaml` anotados; nenhuma alteração local não revisada. | ID, data e hash. |
| Independência | Revisor declara conflito de interesse inexistente ou mitigado. | Nome/organização ou pseudônimo, conflito e assinatura. |
| Reprodutibilidade | `pnpm install --frozen-lockfile`, testes, TypeScript, lint e prebuild repetidos sem alteração de arquivo. | Ambiente, versões e saídas resumidas. |
| Build físico | Development build instalado em Android e, antes de cofre real, em iOS. | Modelo, SO, perfil de build e resultado. |
| Resultado | Todo item crítico passa; achados altos/críticos são corrigidos e reavaliados. | Matriz de achados e decisão de go/no-go. |

Qualquer descoberta de segredo em log, clipboard, backup, bundle JavaScript, armazenamento comum, mensagem de erro, telemetria ou captura de tela é **bloqueadora**. O mesmo vale para API que aceite seed/chave, habilite assinatura ou declare compatibilidade com Mainnet/Lightning sem gate específico.

## 2. Matriz de revisão da fronteira pública

O contrato exposto hoje só permite `getCapabilitiesAsync()` e uma rejeição de operação indisponível. Ele declara `status: "skeleton"`, requer development build e informa suporte falso a provisionamento de segredo e assinatura. A interface TypeScript mantém `assertOperationUnavailableAsync()` como `Promise<never>`; Kotlin e Swift devem rejeitar, não simular sucesso.[1]

| Área | Verificação independente | Evidência de aprovação | Severidade se falhar |
|---|---|---|---|
| Inventário de API | Enumerar todas as funções Expo, exports TypeScript e chamadas de UI; rejeitar qualquer endpoint secreto não documentado. | Diferença de API revisada e teste de contrato. | Crítica |
| Paridade de plataformas | Kotlin e Swift retornam o mesmo mapa público e rejeitam a mesma operação com semântica equivalente. | Teste em Android e iOS; comparação de payload. | Alta |
| Tipagem de erro | A rejeição Android mantém retorno concreto `Unit`; Swift lança erro controlado; nenhum erro inclui dado sensível ou objeto serializado. | Teste negativo de rejeição e inspeção de código. | Alta |
| Dados controlados pelo chamador | `operation` é tratado apenas como rótulo de diagnóstico; não pode alcançar log persistente, telemetria ou consulta de armazenamento. | Busca estática e teste com entrada inesperada. | Alta |
| Limites de bridge | Nenhuma referência a mnemonic, seed, xprv, WIF, PSBT assinado, preimage, token ou chave privada transita para JavaScript. | Busca por padrões proibidos e revisão de serialização. | Crítica |
| Fallback Expo Go | Quando o módulo não existe, a ponte sinaliza necessidade de development build e não usa fallback de armazenamento/criptografia em JavaScript. | Teste Expo Go e teste unitário. | Alta |

## 3. Checklist específico de Kotlin / Android

O revisor deve percorrer `DivinoNativeVaultModule.kt`, o manifesto Expo, Gradle, o plugin de compatibilidade e o APK gerado. O Android Keystore pode tornar material de chave não exportável e restringir suas autorizações, mas não impede por si só o uso local indevido por processo comprometido; portanto, nenhum futuro desenho pode apresentar Keystore como proteção suficiente.[2]

| Item Android | Critério verificável | Evidência exigida |
|---|---|---|
| Implementação atual | `Name("DivinoNativeVault")`, mapa de capacidades e funções Async coincidem com a ponte TypeScript; não há caminho alternativo oculto. | Revisão linha a linha e teste de contrato. |
| Rejeição segura | `rejectUnavailableOperation(...): Unit` continua lançando antes de qualquer I/O, sem regressão para `Nothing` ou sucesso falso. | Compilação release e teste de integração. |
| Sem persistência secreta | Não existem chamadas a `KeyStore`, `SharedPreferences`, `DataStore`, `Room`, arquivos, SQLite, `SecureStore` ou bibliotecas criptográficas no módulo atual. | Busca estática e inspeção do APK. |
| Sem exfiltração | Não há `Log`, crash reporting, clipboard, intent compartilhável, backup, analytics ou mensagem contendo dado sensível. | Busca estática, teste dinâmico e inspeção de `AndroidManifest.xml`. |
| Build e dependências | Autolinking inclui somente o módulo esperado; Gradle `8.13` é gerado pelo plugin versionado; não há patch manual em `node_modules`. | Prebuild limpo e diff da pasta Android gerada. |
| Evolução futura | Antes de usar Keystore, definir alias não identificável, propósito mínimo, política de autenticação, invalidação e teste de hardware; StrongBox é opcional e precisa de fallback explícito. | ADR complementar e testes Android físicos. |

## 4. Checklist específico de Swift / iOS

O módulo Swift ainda é um esqueleto e não toca Keychain. Antes de cofre real, a revisão deve ser repetida em um development build iOS. O Keychain usa classes de proteção para itens sensíveis, e atributos/entitlements determinam o acesso e o compartilhamento; esses valores devem ser explícitos, auditáveis e mínimos.[3]

| Item iOS | Critério verificável | Evidência exigida |
|---|---|---|
| Implementação atual | `DivinoNativeVaultModule` expõe somente as duas operações públicas previstas e o mapa coincide com Android. | Compilação iOS e teste de bridge. |
| Erro controlado | `NSError` possui domínio/código estáveis e não interpola nem serializa material sensível. | Teste negativo e revisão de mensagens. |
| Sem persistência secreta | Não existem `SecItemAdd`, `SecItemCopyMatching`, `UserDefaults`, arquivo, banco, clipboard, `os_log` ou telemetria no módulo atual. | Busca estática e inspeção binária. |
| Entitlements | Não há grupo de Keychain, sincronização iCloud ou capability extra sem ADR e justificativa. | Diff de entitlements e configuração Xcode. |
| Evolução futura | Para segredo, definir uma classe `ThisDeviceOnly` apropriada, política de autenticação, exclusão, recuperação e comportamento pós-alteração biométrica. | ADR complementar, casos de teste e teste físico. |

## 5. Testes negativos e análise dinâmica

O OWASP MASVS exige armazenamento seguro de dados sensíveis e prevenção de vazamentos, inclusive pelos recursos de plataforma como backup e logs.[4] O revisor deve executar os testes automatizados e acrescentar inspeções dinâmicas proporcionais ao risco, sem inserir qualquer seed ou chave de usuário.

| Cenário de teste | Resultado obrigatório |
|---|---|
| Expo Go | Diagnóstico pede development build; nenhuma emulação de cofre é ativada. |
| Development build Android | Diagnóstico responde “Cofre nativo integrado”; operação indisponível é rejeitada. |
| Entrada inesperada em `operation` | Rejeição controlada; entrada não persiste nem é enviada a log/telemetria. |
| Backup, clipboard e logs | Guardas negativos falham para campos classificados como segredo. |
| Navegação e reinício | Não surge estado de cofre, seed, alias, token ou saldo real. |
| Inspeção do bundle/APK | Não contém endpoints Bitcoin/Lightning, credenciais, vetores secretos ou implementação alternativa de cofre. |

## 6. Relatório de achados e decisão

O relatório deve separar **observação**, **baixa**, **média**, **alta** e **crítica**, com reprodução, impacto, versão afetada, recomendação e reteste. Um achado alto, crítico ou não reproduzível que envolva segredo impede o próximo gate. A decisão aprovada nesta fase é limitada a uma das alternativas abaixo.

| Decisão | Condição |
|---|---|
| **Aprovado somente como esqueleto** | Todos os itens atuais passam; nenhuma API secreta foi introduzida. |
| **Aprovado condicionalmente** | Apenas observações documentais sem impacto de segurança; prazo e responsável definidos. |
| **Reprovado** | Qualquer vazamento, API secreta, diferença Android/iOS, regressão de bloqueio ou achado alto/crítico. |

## Referências

[1]: ../modules/divino-native-vault/src/DivinoNativeVault.types.ts "Contrato TypeScript atual do cofre nativo"
[2]: https://developer.android.com/privacy-and-security/keystore "Android Developers — Android Keystore system"
[3]: https://support.apple.com/guide/security/keychain-data-protection-secb0694df1a/web "Apple Platform Security — Keychain data protection"
[4]: https://mas.owasp.org/MASVS/05-MASVS-STORAGE/ "OWASP MASVS-STORAGE"

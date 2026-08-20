# Roteiro de Entrevista Técnica — Revisor Kotlin e Swift

**Finalidade:** selecionar uma pessoa revisora independente para o esqueleto nativo do cofre do Divino Bitcoin. Este roteiro avalia capacidade de encontrar falhas, explicar limites e produzir evidência; não procura alguém que prometa implementar rapidamente um cofre com segredos.

> **Regra de condução:** não compartilhe tokens, seeds, chaves, dados de contas, APKs associados a dados reais ou acesso ao painel Expo durante a entrevista. O candidato deve responder sobre o código sanitizado e o escopo delimitado.[1]

## Estrutura sugerida

Reserve 45 a 60 minutos. Comece confirmando experiência e conflitos de interesse, passe por cenários Kotlin e Swift, depois bridge/build e finalize com o método de relatório. Peça exemplos verificáveis em vez de aceitar respostas genéricas.

| Bloco | Duração sugerida | O que avaliar |
|---|---:|---|
| Contexto e independência | 5 min | Experiência relevante, disponibilidade e ausência de conflito. |
| Android/Kotlin | 15 min | Keystore, ciclo de vida, exceções e fronteira JNI/bridge. |
| iOS/Swift | 15 min | Keychain, proteção de dados, erros e paridade de contrato. |
| Bridge e build | 10 min | Expo Modules, autolinking, development build e superfícies JavaScript. |
| Método e achados | 10 min | Evidência, severidade, reprodução segura e divulgação responsável. |

## Perguntas de qualificação e independência

| Pergunta | Sinal de resposta forte | Sinal de alerta |
|---|---|---|
| Quais revisões de segurança em Kotlin ou Swift você realizou e quais artefatos públicos ou referências profissionais pode compartilhar? | Descreve escopo, método, limites e exemplos verificáveis. | Afirma experiência ampla, mas não consegue delimitar trabalho nem fornecer referência. |
| Você tem vínculo, contribuição recente ou interesse financeiro em bibliotecas, LSPs, provedores de infraestrutura ou produtos que possam afetar esta revisão? | Declara conflitos e propõe mitigação. | Trata conflito de interesse como irrelevante. |
| Como separaria uma revisão do esqueleto sem segredo de uma auditoria de cofre real? | Reconhece que Keychain/Keystore, recuperação, assinatura e memória segura exigem escopo e evidência adicionais. | Considera o diagnóstico atual equivalente a custódia real. |

## Perguntas técnicas — Android e Kotlin

| Pergunta | O que a resposta deve cobrir |
|---|---|
| Como você verificaria que uma função Kotlin exposta por Expo Modules não vaza um objeto, `Throwable`, `toString()` ou campo interno para JavaScript? | Tipos de retorno, serialização, mensagens de erro, logs e testes negativos de bridge. |
| O que você procuraria na implementação antes de permitir Android Keystore em uma fase futura? | Algoritmos/aliases, `KeyGenParameterSpec`, autenticação de usuário, invalidação biométrica, exportabilidade, tratamento de exceções e lifecycle. |
| O módulo atual rejeita uma operação por exceção controlada. Como você revisaria o tipo de retorno e a propagação desse erro até TypeScript? | Tipo concreto, mapeamento de erro estável, ausência de detalhes sensíveis e teste em development build. |
| Quais caminhos de Android podem expor dados mesmo sem banco explícito? | Logs, crash reports, intents, clipboard, backup, SharedPreferences, arquivos temporários, screenshots e ferramentas de depuração. |
| Como verificaria a diferença entre Expo Go e development build para esse módulo? | Ausência segura do módulo no Expo Go, autolinking no development build, comportamento explícito e ausência de fallback inseguro. |
| Que evidência exigiria para aceitar que nenhuma operação econômica foi ativada? | Busca por APIs/strings, inspeção de bridge, testes negativos e execução física limitada ao diagnóstico. |

## Perguntas técnicas — iOS e Swift

| Pergunta | O que a resposta deve cobrir |
|---|---|
| Como você avalia a paridade entre o contrato Swift e o Kotlin quando ambos expõem o mesmo módulo? | Capacidades, nomes de métodos, tipos, erros, indisponibilidade segura e testes equivalentes. |
| Quais propriedades do Keychain deverão ser avaliadas antes de qualquer persistência futura? | Classes de acessibilidade, sincronização, backups, controle de acesso, biometria/passcode, migração e limpeza. |
| Que risco existe ao converter erros Swift em valores serializáveis na bridge? | Vazamento de descrições, metadados de sistema, detalhes de chave/caminho e inconsistência de erros. |
| Como você testaria que o módulo não introduz entitlements, URL schemes ou compartilhamento entre apps não aprovados? | Inspeção de projeto, provisioning/entitlements, configuração gerada e build limpo. |
| Que evidência seria necessária antes de alegar validação iOS? | Development build iOS independente, dispositivo físico, logs sanitizados e repetição de cenários negativos. |

## Perguntas de bridge, build e supply chain

| Pergunta | O que a resposta deve cobrir |
|---|---|
| Como você revisaria a superfície criada pelo autolinking do Expo e como provaria que somente o módulo esperado é incorporado? | Saída de autolinking, manifestos, projeto nativo gerado, dependências e build reproduzível. |
| Como trataria uma falha Gradle/Xcode durante a auditoria? | Reproduzir, registrar ambiente/versões, distinguir erro de build de falha de segurança e não aplicar correções não revisadas. |
| Quais controles de cadeia de fornecimento precisam acompanhar uma alteração em módulo nativo? | Lockfile, SBOM, versões resolvidas, dependências transitivas, patches documentados e validações de build. |
| Como você garantiria que logs e relatórios de revisão não carregam material sensível? | Redação por padrão, códigos de erro, exemplos sintéticos e revisão final dos anexos. |

## Perguntas sobre método e relatório

| Pergunta | Sinal de resposta forte |
|---|---|
| Como você classificaria um método JS capaz de chamar uma API que retorna seed? | Alto ou crítico conforme alcance; demonstra reprodução sem usar segredo real e bloqueia aceite. |
| Que informações devem constar em um achado reproduzível sem risco? | Referência imutável, pré-condições, passos mínimos, resultado esperado/observado, impacto, evidência sanitizada e correção sugerida. |
| O que você faria ao encontrar um possível segredo no repositório ou log? | Interrompe a manipulação, reduz a exposição, comunica pelo canal definido e recomenda rotação/remoção sem republicar o valor. |
| Qual conclusão você daria se Android estivesse testado, mas iOS apenas revisado estaticamente? | Aceite parcial e explicitamente limitado; não alegaria paridade física. |

## Matriz de decisão

Avalie cada eixo de 0 a 3 e registre exemplos concretos. Uma pessoa candidata não deve ser selecionada apenas por familiaridade com Bitcoin; a revisão exige competência específica de plataforma e disciplina de evidência.

| Eixo | 0 — insuficiente | 1 — básico | 2 — adequado | 3 — forte |
|---|---|---|---|---|
| Kotlin/Android | Não demonstra experiência nativa. | Conhece sintaxe, sem segurança móvel. | Explica Keystore e bridge com exemplos. | Já revisou módulos sensíveis e distingue riscos de build, bridge e armazenamento. |
| Swift/iOS | Não demonstra experiência nativa. | Conhece Swift, sem Keychain. | Explica Keychain e contrato de módulo. | Demonstra revisão de proteção de dados, entitlements e paridade de plataforma. |
| Segurança de bridge | Trata a bridge como detalhe de UI. | Cita validação genérica. | Identifica serialização, erros, logs e fallback. | Propõe testes negativos e evidências de não exposição. |
| Método de auditoria | Não define evidência. | Lista ferramentas sem método. | Define reprodução, classificação e relatório. | Explica limites, divulgação responsável e critérios de bloqueio. |
| Independência | Não responde sobre conflitos. | Declara parcialmente. | Declara conflito e escopo. | Declara, mitiga e aceita trabalhar contra referência imutável. |

**Regra de seleção:** avance somente pessoas com nota mínima 2 nos cinco eixos e sem conflito não mitigado. Uma nota 3 em desenvolvimento não compensa nota 0 em segurança de bridge ou método de auditoria.

## Encerramento da entrevista

Peça ao candidato um resumo escrito de até uma página com escopo entendido, método, artefatos necessários, limites da conclusão, prazo, disponibilidade e conflitos. Compare a resposta com a carta de escopo e os critérios de aceite antes de contratar ou conceder acesso ao código.[2] [3]

## Referências

[1]: ./carta-de-escopo.md "Carta de Escopo — Convite à Revisão Independente do Cofre Nativo"
[2]: ./criterios-de-aceite.md "Critérios de Aceite — Revisão Independente do Cofre Nativo"
[3]: ./modelo-relatorio.md "Modelo de Relatório — Revisão Independente do Cofre Nativo"

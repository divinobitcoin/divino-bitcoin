# Acompanhamento Upstream — Aviso React Navigation no Expo SDK 55

**Status:** aviso residual rastreado; não é tratado como correção segura aplicar downgrade manual, sobrescrever o lockfile ou silenciar o Expo Doctor.  
**Escopo:** compatibilidade de `@react-navigation/bottom-tabs`, `@react-navigation/native`, `@react-navigation/elements`, Expo Router e Expo SDK 55.

## 1. Estado-base observado

Após a correção de `expo-asset`, o Expo Doctor passou a concluir 19 de 20 verificações. A única pendência é uma divergência menor de versão esperada pelo metadado do SDK 55: `@react-navigation/bottom-tabs` está em `^7.18.17`, em vez de `^7.15.5`, e `@react-navigation/native` está em `^7.3.17`, em vez de `^7.1.33`. O manifesto atual declara também `@react-navigation/elements` em `^2.9.39`.

Essas versões permanecem na mesma linha principal e já passaram por testes, TypeScript, lint, prebuild e development build Android. A tentativa de forçar as versões mais antigas mostrou conflito com os requisitos de pares da árvore resolvida de `@react-navigation/elements`. Por isso, o aviso é uma **incompatibilidade de metadado a observar**, não uma justificativa para editar manualmente o lockfile ou descer dependências sem validação integral.

> A orientação oficial do Expo é alinhar dependências ao SDK instalado e executar o Expo Doctor; a do React Navigation é instalar as dependências nativas compatíveis por meio do Expo. [1] [2]

## 2. Fontes de monitoramento e gatilhos

O responsável pela manutenção deve observar os canais oficiais abaixo antes de cada atualização planejada e sempre que um build, Expo Doctor ou usuário reportar regressão de navegação.

| Fonte | Gatilho para reavaliar | Ação inicial |
|---|---|---|
| Changelog do Expo SDK 55 e versões posteriores | Novo patch de `expo`, `expo-router` ou atualização de SDK. | Ler instruções de upgrade e abrir uma tarefa de compatibilidade. |
| Documentação de upgrade do Expo | Expo recomenda `expo install --fix` ou muda o comportamento do Doctor. | Executar somente em checkpoint/ramo de avaliação. |
| Releases e changelog do React Navigation | Nova versão 7.x compatível ou mudança de peer dependency. | Comparar peers, não atualizar cegamente. |
| EAS build, Expo Doctor e relato de dispositivo | Falha Android/iOS/Web, alerta novo ou regressão de deep link/tab. | Congelar atualização, coletar log e reproduzir antes de mudar versões. |

## 3. Procedimento de reavaliação

O procedimento deve ser executado em uma cópia limpa do checkpoint atual. Ele não deve ocorrer durante mudança de cofre, Signet, storage ou segurança, para que a causa de uma eventual regressão permaneça isolada.

| Ordem | Ação | Critério antes de seguir |
|---|---|---|
| 1 | Criar checkpoint e registrar versões atuais de Expo, Expo Router, React Navigation e `pnpm-lock.yaml`. | Diferença inicial vazia e estado recuperável. |
| 2 | Executar `pnpm exec expo install --check` e `pnpm dlx expo-doctor --verbose`. | O aviso está reproduzido e arquivado; nenhuma falha nova é ignorada. |
| 3 | Inspecionar `pnpm why @react-navigation/native`, `pnpm why @react-navigation/bottom-tabs` e `pnpm why @react-navigation/elements`. | Todos os caminhos e pares que impõem versões estão identificados. |
| 4 | Ler notas oficiais do Expo e React Navigation relacionadas à versão candidata. | Há compatibilidade declarada ou resolução clara de peer dependency. |
| 5 | Em checkpoint experimental, executar `pnpm exec expo install --fix` **somente** se o Expo recomendar versão nova compatível. | O diff é pequeno, legível e não altera dependências de segurança sem revisão. |
| 6 | Reinstalar de forma limpa e executar `pnpm test`, `pnpm check`, `pnpm lint`, `pnpm native:android:prebuild` e Expo Doctor. | Todos passam; o Doctor não introduz novas falhas. |
| 7 | Validar navegação web, Expo Go e development build Android: onboarding, tabs, voltar, deep link e diagnóstico do cofre. | Não há crash, tela branca, loop, quebra de rota ou regressão de cofre. |

Se a etapa 4 não oferecer uma combinação compatível, a experiência deve permanecer nas versões estáveis atuais. O aviso continua documentado com data, sem uso de `pnpm.overrides`, alteração manual em `pnpm-lock.yaml` ou exclusão do diagnóstico.

## 4. Critérios objetivos para encerrar o aviso

O item só pode ser marcado como resolvido quando todos os critérios forem satisfeitos na mesma mudança versionada.

| Critério | Prova exigida |
|---|---|
| Expo Doctor limpo | Saída 20/20, sem exclusão de validação de pacote. |
| Compatibilidade de pares | `pnpm install --frozen-lockfile` sem aviso de peer não satisfeito para os três pacotes de navegação. |
| Versões suportadas | Alteração foi sugerida pelo `expo install` ou documentada oficialmente pelo Expo/React Navigation. |
| Regressão ausente | Testes, TypeScript, lint e prebuild aprovados; Android development build e Web validados. |
| Escopo controlado | Nenhuma mudança em cofre, Signet, BIP, storage, Mainnet ou Lightning ocorreu no mesmo checkpoint. |
| Rastreabilidade | Relatório inclui versões anterior/posterior, motivo, logs e checkpoint de rollback. |

## 5. Resposta a uma regressão

Uma falha de linking, aba, retorno do Android, deep link ou tela branca durante a avaliação deve interromper a atualização. O projeto deve voltar ao checkpoint estável pelo mecanismo de rollback, e o achado deve incluir log do dispositivo/EAS, passos de reprodução e a cadeia de versões. A correção não deve ser mascarada com `skip` no Expo Doctor.

## Referências

[1]: https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/ "Expo — Upgrade SDK"
[2]: https://reactnavigation.org/docs/getting-started/ "React Navigation — Getting started"

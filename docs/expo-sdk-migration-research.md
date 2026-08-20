# Pesquisa de Migração do Expo SDK

**Data:** 20 de agosto de 2026  
**Escopo:** Atualização coordenada do Divino Bitcoin do Expo SDK 54, motivada pela remediação da cadeia de dependências. Esta pesquisa não autoriza Mainnet, sementes, chaves nem transações reais.

## Orientação oficial aplicável

A documentação do Expo recomenda migrações incrementais, uma versão de SDK por vez, para isolar regressões. O procedimento inclui alinhar as dependências com `npx expo install --fix`, executar `npx expo-doctor` e revisar o changelog de cada SDK de destino. [1]

O Expo SDK 55 usa React Native 0.83.2 e React 19.2. Ele exige a Nova Arquitetura; o SDK 54/React Native 0.81 foi a última linha a oferecer a Arquitetura Antiga. A recomendação oficial é validar primeiro a Nova Arquitetura no SDK 54, criar um development build e só então migrar o SDK. [2]

Para a validação em dispositivo, development builds são preferíveis ao Expo Go porque preservam a composição nativa do aplicativo e não são atualizados automaticamente pela loja. [1] [2]

O Expo Go é distribuído por versão de SDK na página oficial. Um projeto em SDK 55 requer Expo Go compatível; quando a edição instalada exibe a mensagem de incompatibilidade, o caminho de recuperação é atualizar pelo Google Play ou selecionar **SDK 55 → Android → Install** em `expo.dev/go`. [3]

## Regressão de contexto de navegação após a migração

Durante a validação web, foi identificado o erro `Couldn't find a LinkingContext context` ao montar o `Stack`. Esse comportamento corresponde a uma regressão conhecida das primeiras versões do SDK 55, encerrada no ecossistema Expo pela remoção de *pins* que podiam instalar cópias incompatíveis das dependências React Navigation. A remediação deve primeiro verificar e consolidar a árvore instalada, antes de alterar a arquitetura separada de navegação Android e web/iOS. [4]

Em 20 de agosto de 2026, a árvore direta do projeto foi atualizada para a mesma linha resolvida pelo Expo Router (`@react-navigation/native` 7.3.17, `bottom-tabs` 7.18.17 e `elements` 2.9.39). Após reiniciar o Metro, a rota web `/welcome` voltou a renderizar, a ação de entrada chegou à Carteira demonstrativa sem erros no console e o contraste foi restaurado com um fundo explícito no conteúdo da tela. A alteração não modifica as árvores de navegação Android e web/iOS, nem habilita Signet, Mainnet, chaves ou fundos reais.

## Validação física pós-migração

Em 20 de agosto de 2026, o responsável pelo teste confirmou no Xiaomi Note 11S que o Expo Go compatível com SDK 55 carregou o aplicativo e que o roteiro de validação foi concluído sem falhas relatadas. Assim, a estabilidade Android e os fluxos demonstrativos voltam a ser considerados validados para esta migração. Essa confirmação é limitada ao modo demonstrativo local e não libera transações, custódia, seed phrases ou conectividade Signet.

## Implicações para o Divino Bitcoin

| Tema | Decisão de preparação |
|---|---|
| Estratégia | Migrar 54 → 55 primeiro; não saltar versões sem uma justificativa registrada. |
| Arquitetura nativa | Confirmar que `newArchEnabled` já está ativo e testar esse estado antes de alterar o SDK. |
| Android | Tratar qualquer regressão no Xiaomi Note 11S como bloqueadora, com rollback pelo checkpoint `e0e351d9`. |
| Segurança | Manter o bloqueio do roteiro Signet até auditoria, TypeScript, lint e teste físico concluídos. |
| Fundos | Continuam vedados Mainnet, seed, chaves privadas e qualquer transferência econômica. |

## Referências

[1] [Expo — Upgrade Expo SDK](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/)  
[2] [Expo — How to upgrade to Expo SDK 55](https://expo.dev/blog/upgrading-to-sdk-55)
[3] [Expo — Expo Go](https://expo.dev/go)
[4] [Expo — Issue #43448](https://github.com/expo/expo/issues/43448)

# Comparação Técnica — Divino Bitcoin e Grok Wallet

**Data:** 20 de agosto de 2026  
**Base da comparação:** o estado versionado do Divino Bitcoin e a conversa Grok Wallet explicitamente referenciada pelo proprietário. Esta análise separa rigorosamente o que foi **verificado** do que foi apenas **planejado**.[1] [2]

> **Conclusão executiva:** os dois trabalhos compartilham a ambição de uma carteira Bitcoin autocustodial, mas estão em estágios e com premissas de risco diferentes. O **Divino Bitcoin** é a linha que já possui controles de segurança, development build nativo validado e uma sequência restritiva para Signet. A **Grok Wallet** é uma exploração Flutter com uma visão funcional mais ampla, porém sem evidência recuperada de cofre, rede ou operação Bitcoin implementados. Eles não devem ser mesclados como código nesta fase.

## Estado comparado

| Dimensão | Divino Bitcoin — evidência atual | Grok Wallet — evidência recuperada | Implicação de coordenação |
|---|---|---|---|
| Stack | Expo SDK 55, React Native, TypeScript e Expo Router; duas árvores de navegação preservadas para Android e web/iOS. | Flutter proposto para Android/iOS; Riverpod ou Bloc ainda não consolidados. | São bases de execução incompatíveis; não há portabilidade direta de componentes de UI ou bridge. |
| Cofre nativo | Módulo Expo local Kotlin + Swift, interface opaca, operação sensível explicitamente indisponível e validada em development build Android. | Keystore/Keychain constam como direção arquitetural; nenhuma implementação de cofre nativo foi comprovada na conversa recuperada. | O cofre do Divino é o baseline auditável; não importar código de cofre sem revisão independente. |
| Segredos | Seeds, chaves, importação, assinatura, backup e clipboard continuam bloqueados. | Seed BIP-39, passphrase, PIN/biometria e recuperação aparecem como objetivos de produto. | Não antecipar os objetivos da Grok; no Divino, esses recursos continuam sujeitos aos gates da ADR-0001. |
| Bitcoin on-chain | Signet apenas; primeira entrega futura limitada a observação pública sem carteira, sem endpoint configurado ainda. | BDK, Electrum e suporte on-chain aparecem como candidatos. | A escolha de biblioteca/rede da Grok é insumo de pesquisa, não aprovação de integração. |
| Lightning | Deliberadamente adiado. | LDK, canais, invoices, LSP e Tor aparecem no escopo aspiracional. | Lightning requer ADR e análise próprias; não iniciar por convergência de visão de produto. |
| Estado de execução | APK de development build instalado e testado no Xiaomi Note 11S; diagnóstico confirmou a bridge nativa sem segredo. | Evidência recuperada de preparação de SDK Android, `flutter doctor` e `flutter run`; sem prova de módulo Bitcoin funcional. | O Divino está mais adiante na validação operacional segura, embora ambos estejam longe de uso com fundos. |
| Segurança e supply chain | Modelo de ameaça, ADR, guardas negativos, testes BIP públicos, SBOM e auditoria de dependências documentados. | Há intenções de segurança, mas não foram recuperadas evidências equivalentes de SBOM, auditoria, testes negativos ou revisão nativa. | Reutilizar documentos e critérios do Divino como referência mínima; não assumir equivalência de controles. |

## Convergências úteis

Ambos os trabalhos valorizam autocustódia, execução local, software aberto, Android/iOS e proteção nativa de material sensível. A visão da Grok também pode alimentar o **backlog de produto**, principalmente na organização de tópicos que deverão receber ADRs independentes: on-chain, Lightning, recuperação, PSBT, multisig e privacidade.

Essas convergências não equivalem a um plano de implementação comum. BDK/LDK e bindings Flutter são apenas candidatos no material recuperado; seu uso exige verificação de manutenção, licença, compatibilidade de plataforma, superfície FFI/bridge, vetores de interoperabilidade e revisão de dependências antes de qualquer adoção.[1]

## Diferenças críticas de risco

O Divino começa pela redução da superfície: a bridge React Native não pode ler segredo, o primeiro fluxo Signet será observacional e o cofre real exige gates cumulativos. A Grok descreve desde cedo recursos que lidam com seed, derivação, recebimento, envio, taxas, Lightning e conectividade. Essa diferença é decisiva: uma visão de produto abrangente não deve transformar o Divino em uma carteira com segredos ou rede ativa antes que os seus controles sejam comprovados.[2] [3]

A implementação nativa atual do Divino tampouco pode ser transplantada para Flutter. Os módulos Kotlin e Swift estão estruturados para o ciclo de vida e o contrato do Expo Modules. Um eventual núcleo compartilhado exigiria nova decisão arquitetural — por exemplo, uma biblioteca Rust/C auditável com adaptadores próprios por framework —, testes de memória, licenciamento e revisão independente. Não é uma otimização segura para esta fase.

## Recomendação de coordenação

| Decisão recomendada | Ação prática | Regra de segurança |
|---|---|---|
| Definir uma linha primária | Tratar o Divino Bitcoin como a linha de implementação ativa, pois possui checkpoint, build físico e gates documentados. | Não promover a Grok a fonte de código de produção sem evidência e revisão. |
| Preservar a Grok como laboratório de produto | Extrair ideias de UX e uma matriz de funcionalidades, cada uma marcada como ideia, decisão ou implementação. | Nenhuma ideia habilita seed, rede ou pagamento no Divino. |
| Centralizar decisões sensíveis | Criar ADR própria antes de biblioteca Bitcoin, fonte on-chain, Lightning, recuperação, PSBT ou multisig. | Uma decisão só é válida após critérios de aceite e teste negativo. |
| Evitar duplicação de cofre | Manter Kotlin/Swift do Divino como único esqueleto de cofre em análise. | Não criar uma segunda API de segredo em Flutter, JavaScript ou armazenamento genérico. |
| Reutilizar governança | Aplicar ao projeto paralelo o checklist de revisão nativa, SBOM, política de disclosure e gates de ambiente. | Equivalência documental não substitui testes em aparelho e revisão externa. |

## Sequência sugerida

Primeiro, conclua a revisão independente Kotlin/Swift do Divino. Segundo, execute somente os gates S0–S6 do fluxo Signet público, sem valor econômico. Terceiro, transforme os itens da Grok em um backlog classificado por risco e dependências. Apenas depois de evidência nesses dois marcos vale decidir se a Grok será arquivada, mantida como protótipo de UX ou se haverá uma nova arquitetura comum.

Não recomendo fusionar os repositórios, copiar a lista de recursos ou iniciar BDK/LDK agora. Isso misturaria uma exploração de produto ampla com uma linha de segurança que deliberadamente ainda não aceita segredo, conectividade de carteira ou fundos.

## Referências

[1]: ./grok-wallet-comparison-source-notes-2026-08-20.md "Notas de Fonte — Conversa Grok Wallet"
[2]: ./adr-0001-native-vault.md "ADR-0001 — Cofre Nativo de Autocustódia"
[3]: ./first-signet-non-economic-flow-gates.md "Gates do Primeiro Fluxo Signet sem Valor Econômico"

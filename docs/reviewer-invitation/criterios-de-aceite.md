# Critérios de Aceite — Revisão Independente do Cofre Nativo

**Objeto da decisão:** somente o esqueleto Kotlin/Swift do módulo `divino-native-vault`, a bridge TypeScript e a cadeia de development build correspondente.

> A decisão de aceite é deliberadamente estreita. Ela avalia a preservação de uma interface pública opaca e indisponível para segredo. Não avalia uma carteira funcional e não habilita nenhuma funcionalidade de custódia ou rede.

## Pré-condições obrigatórias

| Pré-condição | Aceite objetivo | Evidência exigida |
|---|---|---|
| Independência | O revisor não é autor da alteração avaliada ou existe segunda revisão independente. | Declaração de conflito de interesse. |
| Referência congelada | O commit/checkpoint, `pnpm-lock.yaml` e hash de integridade estão identificados. | Identificador e hash no relatório. |
| Material sanitizado | O pacote não inclui credenciais, chaves, seeds, backups ou dados pessoais. | Declaração do responsável e do revisor. |
| Ambiente reproduzível | A instalação e os testes podem ser repetidos sem editar `node_modules` ou o código auditado. | Comandos, versões e saída resumida. |
| Escopo compreendido | O revisor reconhece que não pode ativar rede, segredo ou fundos para “testar melhor”. | Declaração de escopo assinada. |

## Matriz de aceite técnico

Todos os itens da matriz precisam passar para a decisão **Aprovado somente como esqueleto**.

| Domínio | Critério de aceite | Reprovação imediata |
|---|---|---|
| Superfície pública | Somente as APIs documentadas são expostas; `getCapabilitiesAsync()` informa o estado de esqueleto e a operação indisponível rejeita de forma controlada. | Nova API que aceite ou retorne material secreto; sucesso falso de operação indisponível. |
| Paridade Kotlin/Swift | As duas plataformas expõem a mesma intenção de segurança, mapa de capacidades e semântica de erro. | Divergência que amplie a capacidade de uma plataforma. |
| Tipagem e erros | Android usa retorno concreto para rejeição; Swift usa erro estável; nenhuma mensagem serializa entrada sensível ou objeto interno. | Regressão para erro de compilação, vazamento em mensagem ou dado em log. |
| Persistência e criptografia | O esqueleto não chama Keystore, Keychain, armazenamento comum, arquivo, banco, SecureStore ou biblioteca criptográfica. | Qualquer persistência ou uso de segredo não coberto por nova ADR. |
| Exfiltração | Não há logs, analytics, telemetria, clipboard, backup, intent compartilhável ou crash report contendo dados controlados pela bridge. | Fluxo que persista ou envie dado de operação/segredo. |
| Expo Go | Na ausência do módulo nativo, a ponte solicita development build e não usa fallback JavaScript. | Fallback que imite cofre ou armazene dado localmente. |
| Build | Prebuild limpo, autolinking e build Android são reprodutíveis; nenhuma correção depende de edição manual em `node_modules`. | Módulo ausente, módulo inesperado ou patch não versionado. |
| Testes negativos | Os testes contra backup, logs e clipboard passam; entrada inesperada continua bloqueada. | Falha de guarda ou redução de cobertura sem justificativa. |

## Regra de classificação e decisão

| Decisão | Critérios |
|---|---|
| **Aprovado somente como esqueleto** | Todos os critérios passam; não há achado médio, alto ou crítico aberto que altere os limites de segurança. |
| **Aprovado condicionalmente** | Apenas observações documentais ou achados baixos sem impacto em segredo, bridge, rede ou build; cada item tem responsável e prazo. |
| **Reprovado** | Há qualquer achado alto/crítico, vazamento potencial de segredo, API fora de escopo, comportamento não reproduzível ou paridade insuficiente. |

Achados de severidade alta ou crítica impedem o próximo gate até correção, teste de regressão e reteste independente. Achados médios que afetem isolamento de ambiente, telemetria, recuperação, atualização ou integridade de build devem ser avaliados pelo responsável antes de qualquer mudança de escopo.[1]

## Declaração final do revisor

O relatório deve encerrar com a declaração abaixo, preenchida pelo revisor:

> “Revisei a referência **[identificador]** conforme este critério e o checklist associado. Minha decisão é **[aprovado somente como esqueleto / aprovado condicionalmente / reprovado]**. Esta decisão não certifica segurança geral, não autoriza segredo, rede, assinatura, Signet conectado, Mainnet, Lightning ou fundos. Conflitos de interesse declarados: **[texto]**.”

## Referências

[1]: ../independent-native-vault-review-checklist.md "Checklist de Revisão Independente — Cofre Nativo Kotlin e Swift"

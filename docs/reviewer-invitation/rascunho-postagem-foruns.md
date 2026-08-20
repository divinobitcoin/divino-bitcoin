# Rascunho de Postagem — Convite para Revisão Independente

**Uso:** copiar, ajustar os campos entre colchetes e publicar em fóruns, repositórios, comunidades de segurança móvel ou canais técnicos.  
**Referência de código a preencher:** `[commit ou checkpoint]`  
**Prazo de manifestação a preencher:** `[data]`

## Versão curta para fórum ou canal técnico

> **Convite para revisão independente de segurança — Kotlin/Swift, cofre nativo de carteira Bitcoin**
>
> O **Divino Bitcoin** procura uma pessoa revisora independente com experiência comprovável em Kotlin, Swift e segurança móvel para avaliar a fronteira nativa de um módulo de cofre ainda **sem segredo e sem operação financeira**.
>
> O escopo é fechado: Android Keystore/Keychain como direção arquitetural, bridge Expo/TypeScript, autolinking, configuração de development build, tratamento de erro e testes negativos. O objetivo é confirmar que a bridge permanece opaca e incapaz de criar, receber, persistir, revelar, exportar ou usar seed, chaves privadas ou material de recuperação.
>
> **Não estão no escopo:** seeds, BIP-39, derivação, assinatura, PSBT, transações, broadcast, Lightning, endpoints Bitcoin, Mainnet, Testnet, Regtest, fundos, tokens ou acesso a contas. O revisor trabalha exclusivamente contra uma cópia local de código e evidências sanitizadas.
>
> O projeto é licenciado sob **GPL-3.0-or-later**. A revisão será vinculada à referência imutável `[commit ou checkpoint]` e deve resultar em relatório com método, arquivos revisados, evidências, classificação de achados, reprodução não destrutiva e recomendação.
>
> Para manifestar interesse, responda com: experiência relevante em Kotlin/Swift e segurança móvel; exemplos públicos de revisões ou contribuições; disponibilidade; abordagem de revisão; e conflitos de interesse. **Não envie chaves, tokens ou dados sensíveis.**
>
> Contato: `[canal de contato definido em SECURITY.md]`.

## Versão detalhada para GitHub, mailing list ou contratação de escopo fechado

## Convite para revisão independente da fronteira nativa do cofre

O Divino Bitcoin é uma carteira em desenvolvimento demonstrativo, de código aberto e licenciada sob GPL-3.0-or-later. Estamos convidando uma pessoa revisora independente para uma revisão de segurança limitada à fronteira Kotlin/Swift do módulo nativo de cofre.

> O resultado possível desta revisão é apenas a aprovação, reprovação ou condicionamento do **esqueleto nativo sem segredo**. Não há autorização implícita para implementar custódia real, conectar-se ao Bitcoin, operar Signet, assinar transações, usar Lightning ou movimentar fundos.

| Área incluída | Pergunta central da revisão |
|---|---|
| Android Kotlin | O módulo expõe somente capacidades públicas e rejeita operações sensíveis com tipagem, erros e ciclo de vida seguros? |
| iOS Swift | O contrato é equivalente ao Android, sem Keychain, entitlements ou caminhos de dados não aprovados? |
| Bridge Expo/TypeScript | JavaScript não consegue obter, criar, importar, registrar, copiar ou serializar material sensível? |
| Build e autolinking | O development build incorpora somente o módulo esperado e falha de maneira controlada fora desse ambiente? |
| Controles negativos | Logs, clipboard, backup, armazenamento e mensagens de erro permanecem livres de campos sensíveis? |

O pacote de revisão contém carta de escopo, critérios de aceite, checklist e modelo de relatório. O acesso será limitado a código, documentação e evidências sanitizadas. Nenhum token do Expo, segredo, conta, dispositivo, endpoint privado, serviço de terceiros ou dado pessoal será compartilhado.

Pedimos que a manifestação de interesse informe, em parágrafos objetivos, a experiência com Kotlin, Swift, Android Keystore, Apple Keychain, bridges nativas, revisão de bibliotecas criptográficas e análise de cadeia de build. Inclua disponibilidade, estimativa de esforço, método proposto e qualquer conflito de interesse. Achados devem ser comunicados pelo processo de divulgação responsável indicado no `SECURITY.md`.

## Antes de publicar

| Verificação do responsável | Ação necessária |
|---|---|
| Referência imutável | Substituir `[commit ou checkpoint]` pela versão que será auditada. Não mover o alvo durante a revisão. |
| Canal de contato | Confirmar o canal privado ou público previsto em `SECURITY.md`. |
| Pacote sanitizado | Remover `.env`, tokens, logs de aparelho, links privados, dados de conta e qualquer artefato fora do escopo. |
| Critério de seleção | Usar o roteiro de entrevista e registrar a decisão de seleção. |
| Condições comerciais | Definir separadamente prazo, remuneração, NDA se necessário e forma de entrega. Isso não muda o escopo técnico. |

## Referências

[1]: ./carta-de-escopo.md "Carta de Escopo — Convite à Revisão Independente do Cofre Nativo"
[2]: ./criterios-de-aceite.md "Critérios de Aceite — Revisão Independente do Cofre Nativo"
[3]: ../../SECURITY.md "Política de Segurança do Divino Bitcoin"

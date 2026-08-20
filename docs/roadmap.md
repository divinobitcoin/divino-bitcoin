# Divino Bitcoin Roadmap

**Estado:** roadmap público vigente.
**Escopo:** visão por marcos para uma carteira Bitcoin de autocustódia, aberta e auditável. Este roadmap descreve dependências e critérios; não anuncia datas, Mainnet, fundos reais, pagamentos ou Lightning ativo.
**Evidência ou referência:** `SECURITY.md`, `docs/threat-model.md`, `docs/adr-0001-native-vault.md`, `docs/first-signet-non-economic-flow-gates.md`, `docs/first-signet-non-economic-flow-execution-plan.md`, `docs/decision-impact-protocol.md`.
**Política de atualização:** alterações materiais devem continuar distinguindo evidência verificada, hipótese de projeto e objetivo condicionado.

> **Como ler este documento.** Os marcos descrevem uma sequência condicional de trabalho, não um cronograma, compromisso comercial ou autorização técnica. Um marco pode ser adiado, refeito ou interrompido se a evidência, a revisão ou a decisão responsável não justificarem o avanço.

## Direção do projeto

O Divino Bitcoin busca construir uma carteira Bitcoin de autocustódia que seja livre, verificável e útil sem pedir confiança cega. O caminho não é uma corrida por recursos; é a acumulação de evidência. Cada marco só avança quando seu escopo, seus riscos, seus testes e sua revisão independente forem suficientes para sustentar o próximo passo.

O aplicativo permanece em modo demonstrativo local. O **Signet** é o único ambiente de desenvolvimento. Mainnet, fundos reais, seeds, chaves privadas, recuperação, assinaturas, broadcast, endpoints operacionais e Lightning ativo continuam bloqueados.

## Marcos

| Marco | Objetivo | O que pode avançar | O que continua bloqueado | Evidência mínima de saída |
|---|---|---|---|---|
| **R0 — Fundação aberta e governança** | Consolidar licença, documentação, regras de contribuição, disclosure e identidade pública neutra. | Repositório, Discussions, rascunhos comunitários e revisão de código. | Operações Bitcoin/Lightning e dados secretos. | Política de segurança, modelo de ameaça, contribuição e conduta revisáveis; rastreabilidade de decisões. |
| **R1 — Revisão do limite do cofre nativo** | Submeter o esqueleto Kotlin/Swift e a ponte Expo a revisão independente. | Correções do limite opaco e testes negativos. | Criação, importação ou persistência de segredo. | Relatório independente, resposta documentada aos achados e paridade Android/iOS confirmada. |
| **R2 — Signet observável sem valor econômico** | Executar os gates S0–S6 para observar o fluxo sem dados sensíveis ou valor. | Telemetria local segura, diagnósticos e evidência reprodutível. | Carteira operacional, endereço, assinatura, broadcast e Lightning. | Baseline congelado, resultados de cada gate e aprovação explícita para qualquer etapa posterior. |
| **R3 — Ciclo de vida determinístico de chaves em ambiente controlado** | Projetar e testar internamente as propriedades de derivação e recuperação, caso os gates autorizem. | Vetores públicos e interfaces auditadas para BIP-32/BIP-39/BIP-84. [1] [2] [3] | Uso de seed real de usuário, exportação, backup inseguro, Mainnet e fundos. | Ameaças atualizadas, revisão criptográfica independente e testes negativos de exposição. |
| **R4 — On-chain Signet controlado** | Prototipar e verificar leitura e acompanhamento on-chain em Signet com fonte combinada configurável. | Consulta com prioridade Electrum/Esplora, sem endpoint padrão e com controles documentados. | Mainnet, broadcast e qualquer custódia ativa sem gate específico. | Testes de isolamento de rede, comportamento de falha segura e revisão de privacidade. |
| **R5 — Arquitetura Lightning, sem ativação operacional** | Definir limites, ameaças e adaptadores para Lightning sem conectar credenciais ou canais. | Documentação, modelos de dados, testes simulados e revisão de arquitetura. | Nó ativo, invoice real, pagamento, canal, chave ou saldo. | ADR específica, análise independente e gates de ativação aprovados. |
| **R6 — Pré-lançamento pessoal em Signet** | Validar fluxos completos sob escopo estritamente controlado e sem promessa pública de produção. | Testes pessoais com critérios de parada e revisão contínua. | Mainnet até que evidências, auditorias e decisões formais autorizem uma mudança. | Relatos reprodutíveis, plano de resposta a incidentes e parecer independente. |
| **R7 — Avaliação de prontidão para Mainnet** | Decidir se existe base para propor uma trilha Mainnet. | Somente a avaliação e a documentação de lacunas. | Mainnet, fundos reais e lançamento público por padrão. | Gates formais satisfeitos, auditorias, revisão comunitária, decisão explícita do proprietário e plano de reversão. |

## Regras de avanço

| Regra | Aplicação |
|---|---|
| **Gate antes de capacidade** | Nenhum recurso sensível é habilitado porque “parece pronto”; ele exige condições verificáveis de segurança, revisão e decisão. |
| **Signet antes de Mainnet** | Toda evidência operacional começa em Signet. Mainnet não é consequência automática de um teste bem-sucedido. |
| **Escopo explícito** | Cada marco declara o que permite e o que proíbe, prevenindo expansão silenciosa de risco. |
| **Revisão independente** | Mudanças próximas a segredo, custódia, rede ou assinatura requerem revisão fora do autor original. |
| **Comunidade séria** | Sugestões e contribuições são bem-vindas quando respeitam conduta, evidência e limites de segurança. |
| **Decisão humana documentada** | Publicação, identidade, credencial, fundo, segredo, conector, rede e gate continuam sujeitos à decisão explícita do proprietário. |

## Prioridade imediata

A prioridade atual é concluir **R0** e preparar a revisão independente de **R1**, enquanto os gates de **R2** continuam planejados e não econômicos. A comunidade pode contribuir agora com revisão da documentação, feedback de UX, testes de demonstração, tradução, melhoria de testes, observações de segurança e análise do limite nativo — sem solicitar dados sensíveis nem promover uso financeiro real. Esse convite à participação não substitui os critérios técnicos, nem antecipa qualquer compromisso de lançamento.

## Referências

[1]: [BIP-32 — Hierarchical Deterministic Wallets](https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki)
[2]: [BIP-39 — Mnemonic code for generating deterministic keys](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki)
[3]: [BIP-84 — Derivation scheme for P2WPKH based accounts](https://github.com/bitcoin/bips/blob/master/bip-0084.mediawiki)

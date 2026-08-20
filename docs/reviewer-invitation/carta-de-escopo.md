# Carta de Escopo — Convite à Revisão Independente do Cofre Nativo

**Assunto sugerido:** Convite para revisão independente de segurança — fronteira Kotlin/Swift do Divino Bitcoin

Olá, **[nome do revisor]**.

Gostaríamos de convidar você para uma revisão independente e de escopo fechado da fronteira nativa do cofre do **Divino Bitcoin**. O projeto é de código aberto sob GPL-3.0-or-later e está em desenvolvimento demonstrativo. Esta revisão não envolve fundos, credenciais, material secreto, conexão Bitcoin ativa nem operações Lightning.

O objetivo é verificar se o módulo nativo local preserva uma fronteira opaca entre JavaScript e plataformas móveis, permanecendo incapaz de criar, aceitar, armazenar, revelar ou usar segredo. A revisão será vinculada exclusivamente à referência imutável **[commit ou checkpoint a preencher]**.

## Escopo técnico solicitado

| Incluído | Finalidade |
|---|---|
| `DivinoNativeVaultModule.kt` e configuração Gradle/Expo correspondente | Confirmar o contrato Android, a rejeição segura e a ausência de I/O sensível. |
| `DivinoNativeVaultModule.swift` e manifesto do módulo | Confirmar paridade de contrato, mensagens de erro e ausência de Keychain/entitlements indevidos. |
| Ponte TypeScript e tela de diagnóstico | Confirmar que a interface pública é mínima e que Expo Go não usa fallback inseguro. |
| Autolinking, `eas.json`, `app.config.ts` e plugin Gradle | Confirmar que o development build incorpora apenas o módulo esperado e permanece reproduzível. |
| Testes negativos, SBOM, ADR e modelo de ameaça | Verificar rastreabilidade entre implementação, controles e evidências. |

| Expressamente fora de escopo | Situação atual |
|---|---|
| Seed, mnemonic, BIP-39, derivação, chave privada, WIF, xprv e PSBT assinado | Não implementados; não devem ser introduzidos para esta revisão. |
| Persistência real em Android Keystore ou Apple Keychain | Não implementada; será uma etapa futura sujeita a nova ADR. |
| Assinatura, broadcast, Lightning, LSP, canais, invoice, endpoint Electrum/Esplora e sincronização | Bloqueados; não devem ser ativados ou simulados. |
| Mainnet, Testnet, Regtest, satoshis e pagamentos reais | Fora de escopo e vedados. |

## Método e evidências esperadas

Solicitamos revisão estática linha a linha, reprodução limpa do ambiente, execução de testes automatizados e inspeção da configuração de development build. Para Android, existe evidência de teste físico do esqueleto no Xiaomi Note 11S; a revisão deve confirmar que o resultado registrado é limitado à integração da bridge e ao bloqueio da operação de diagnóstico. Para iOS, a revisão pode avaliar o código e a configuração, mas não deve alegar validação física sem um development build iOS independente.

Os comandos de reprodução, ambiente, versões resolvidas, hash revisado e qualquer diferença observada devem aparecer no relatório. O checklist detalhado do projeto define a evidência mínima e a severidade de falhas.[1]

## Regras de acesso e confidencialidade operacional

O revisor receberá somente uma cópia do código, documentos e evidências sanitizadas. Não serão fornecidos tokens, acesso ao Expo, acesso a dispositivos, contas de loja, infraestrutura, endpoints, bancos de dados ou informações pessoais. Caso o revisor encontre um dado potencialmente sensível, deverá interromper a análise desse dado e relatar o achado pelo canal privado definido em `SECURITY.md`.[2]

O convite não confere autorização para testar sistemas de terceiros, enviar tráfego a redes Bitcoin, criar transações, explorar dependências em produção, acessar contas ou movimentar ativos. O trabalho deve ocorrer em cópia local e somente contra o código fornecido.

## Entregáveis e critérios de conclusão

Esperamos um relatório usando o modelo fornecido, com inventário de arquivos analisados, método, evidências, achados classificados, impacto, reprodução não destrutiva, recomendação e decisão final. Achados altos ou críticos relativos a segredo, bridge, armazenamento, logs, backup, clipboard, paridade Android/iOS ou cadeia de build bloqueiam a aprovação.

A aprovação possível é limitada a **“esqueleto nativo sem segredo”**. Ela não representa autorização para cofre real, Signet conectado, Mainnet, assinatura, Lightning ou fundos. Os critérios completos constam em [`criterios-de-aceite.md`](./criterios-de-aceite.md).

Se houver interesse, responda declarando sua experiência relevante, disponibilidade, possíveis conflitos de interesse e a referência de código que pretende avaliar.

Atenciosamente,  
**[nome do responsável pelo Divino Bitcoin]**

## Referências

[1]: ../independent-native-vault-review-checklist.md "Checklist de Revisão Independente — Cofre Nativo Kotlin e Swift"
[2]: ../../SECURITY.md "Política de Segurança do Divino Bitcoin"

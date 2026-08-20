# Pacote de Convite — Revisão Independente do Cofre Nativo

**Projeto:** Divino Bitcoin  
**Escopo de segurança:** esqueleto nativo do cofre, sem segredo e sem fundos  
**Responsável pelo pacote:** Manus AI  
**Uso:** compartilhar com um revisor independente de Kotlin/Android e Swift/iOS.

> Este pacote avalia apenas a **fronteira opaca** do cofre nativo. Uma aprovação não autoriza criação, importação, armazenamento, recuperação, exportação ou assinatura com seed, chave privada, material BIP-39, Lightning ou fundos reais.

## Conteúdo e uso

| Documento | Finalidade | Destinatário principal |
|---|---|---|
| [`carta-de-escopo.md`](./carta-de-escopo.md) | Convite pronto para envio, limites de acesso e entregáveis esperados. | Responsável do projeto e revisor convidado. |
| [`criterios-de-aceite.md`](./criterios-de-aceite.md) | Condições objetivas para aprovar, aprovar condicionalmente ou reprovar o esqueleto. | Revisor independente. |
| [`modelo-relatorio.md`](./modelo-relatorio.md) | Estrutura de relatório, matriz de achados e declaração final. | Revisor independente. |

O responsável deve compartilhar estes documentos junto de uma **referência imutável** do código, preferencialmente o commit correspondente ao checkpoint que será auditado. O revisor deve trabalhar em cópia local e declarar qualquer conflito de interesse antes de começar.

## Materiais a anexar

O pacote deve conter somente material técnico não sensível. A tabela indica o conjunto mínimo esperado.

| Material | Caminho ou evidência | Objetivo da revisão |
|---|---|---|
| Checklist mestre | `docs/independent-native-vault-review-checklist.md` | Rastrear os controles técnicos detalhados. |
| Decisão de arquitetura | `docs/adr-0001-native-vault.md` | Conferir os limites de responsabilidade da bridge. |
| Modelo de ameaça | `docs/threat-model.md` | Relacionar achados aos ativos e ameaças definidos. |
| Política de segurança | `SECURITY.md` | Usar o canal e as regras de divulgação coordenada. |
| Implementação Kotlin | `modules/divino-native-vault/android/` | Revisar o módulo Android e seu build. |
| Implementação Swift | `modules/divino-native-vault/ios/` | Revisar a paridade iOS do contrato nativo. |
| Contrato de bridge | `modules/divino-native-vault/src/` | Conferir a superfície TypeScript exposta. |
| Testes e build | `tests/*vault*.test.ts`, `eas.json`, `app.config.ts` | Reproduzir controles, autolinking e perfil de development build. |
| Dependências | `package.json`, `pnpm-lock.yaml`, SBOM de produção | Verificar versões e cadeia de fornecimento. |

## Materiais expressamente proibidos

Não forneça ao revisor token do Expo, senha, seed, mnemonic, chave privada, WIF, xprv, preimage, credencial de endpoint, cookie, backup, dado pessoal, APK com dados reais ou acesso a contas. O estado auditado deve continuar operando exclusivamente com dados demonstrativos e Signet bloqueado, conforme a política do projeto.[1]

Caso o revisor identifique algo que pareça segredo, interrompa a análise desse dado, registre apenas uma descrição sanitizada e siga o procedimento de relato privado de `SECURITY.md`.

## Resultado esperado

O resultado não é um selo geral de segurança. Ele deve ser uma decisão limitada a uma das alternativas abaixo, sempre vinculada ao commit revisado.

| Decisão | Significado |
|---|---|
| **Aprovado somente como esqueleto** | A bridge permanece opaca, indisponível para segredo e coerente entre as plataformas avaliadas. |
| **Aprovado condicionalmente** | Há somente observações documentais sem impacto de segurança, com responsável e prazo definidos. |
| **Reprovado** | Há vazamento, API secreta, desvio de paridade, build não reprodutível ou achado alto/crítico. |

## Referências

[1]: ../../SECURITY.md "Política de Segurança do Divino Bitcoin"

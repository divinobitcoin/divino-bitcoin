# Triagem de Dependências — 20 de agosto de 2026

**Escopo:** dependências de produção resolvidas pelo `pnpm-lock.yaml`.  
**Comando:** `pnpm audit --prod --audit-level critical`.  
**Decisão de segurança:** o roteiro de transferência Signet permanece bloqueado até a correção e revalidação das vulnerabilidades críticas.

## Resultado inicial

| Severidade | Quantidade | Tratamento exigido |
| --- | ---: | --- |
| Crítica | 2 | Corrigir antes de qualquer teste de transferência Signet. |
| Alta | 70 | Triar e registrar plano de atualização antes de candidatura a release. |
| Moderada | 45 | Triar por exposição e corrigir conforme janela de manutenção. |
| Baixa | 6 | Acompanhar em atualização regular. |

## Itens críticos

| Pacote transitivo | Versão resolvida | Correção disponível | Caminho principal | Ação planejada |
| --- | --- | --- | --- | --- |
| `shell-quote` | `1.8.3` | `>= 1.8.4` | Expo CLI / React Native devtools; `concurrently` | Fixar substituição transitiva para a versão corrigida e testar o ambiente. |
| `tar` | `7.5.2` | `>= 7.5.19` | Expo CLI | Fixar substituição transitiva para a versão corrigida e validar Expo Go. |

As substituições deverão ser limitadas a versões corrigidas compatíveis dentro da mesma linha principal. Nenhuma atualização de SDK Expo, alteração de rede, chave, seed ou saldo é autorizada neste marco.

## Evidência e próximo gate

As evidências da auditoria estão ligadas aos avisos públicos [GHSA-w7jw-789q-3m8p](https://github.com/advisories/GHSA-w7jw-789q-3m8p) e [GHSA-23hp-3jrh-7fpw](https://github.com/advisories/GHSA-23hp-3jrh-7fpw). Após atualizar o lockfile, o projeto repetirá a auditoria crítica, os testes, a checagem TypeScript e o lint. Qualquer regressão do Expo Go interromperá a remediação e exigirá restauração para o checkpoint pré-atualização.

## Resultado após a substituição transitiva

As substituições para `shell-quote@1.8.4` e `tar@7.5.19` zeraram os itens críticos da auditoria de produção. Após a atualização de `axios`, das substituições transitivas compatíveis e a migração para Expo SDK 55, uma nova auditoria de produção em 20/08/2026 reportou **0 críticas, 33 altas, 12 moderadas e 3 baixas**. Os itens altos remanescentes continuam bloqueando Mainnet, distribuição pública, cofre de chaves e transferências Signet; a aceitação limitada para atividades preparatórias sem segredo está registrada em [`signet-dependency-risk-acceptance.md`](./signet-dependency-risk-acceptance.md). Nenhuma dessas atualizações será assumida como segura sem nova auditoria, testes e verificação do Expo Go.

## Atualização de remediação e SBOM

Em 20/08/2026, `@trpc/client`, `@trpc/react-query` e `@trpc/server` foram atualizados para 11.8.0, e `drizzle-orm` para 0.45.2. A nova auditoria de produção reportou **0 críticas, 31 altas, 12 moderadas e 3 baixas**. A redução de dois itens não altera o gate: toda vulnerabilidade alta continua bloqueando cofre, Mainnet, assinatura e pagamentos.

O relatório ainda oferece atualizações para transitivos da cadeia Expo/Metro, Express e NativeWind. O pnpm 9.12.0 desta árvore não aplicou as substituições configuradas ao lockfile resolvido; por isso elas foram removidas, em vez de manter uma configuração que poderia sugerir proteção inexistente. Não foi feita edição manual do lockfile. A remediação restante depende de atualização upstream compatível, remoção/substituição de dependência direta ou migração de ferramenta de pacote revisada.

O SBOM de produção atualizado está em [`sbom-cyclonedx-production.json`](./sbom-cyclonedx-production.json), contém 868 componentes e é gerado por `pnpm sbom:prod` diretamente do lockfile versionado. O escopo e as limitações estão em [`sbom-production.md`](./sbom-production.md).

## Rodada upstream após o development build

Após incluir o cliente de desenvolvimento e aplicar todas as atualizações compatíveis oferecidas pelo resolvedor, a auditoria de produção de 20/08/2026 passou a registrar **0 críticas, 4 altas, 3 moderadas e 0 baixas**. A redução de 31 para 4 itens altos é verificável no artefato de auditoria e no lockfile, mas não habilita segredo, assinatura, Signet vivo, Mainnet ou distribuição.

| Componente | Itens altos | Caminho | Situação | Decisão |
|---|---:|---|---|---|
| `js-yaml@4.1.1` | 2 | `expo@55.0.29` → `@expo/cli@55.0.35` → `@expo/xcpretty@4.4.4` | O auditor indica `4.3.1`, mas a cadeia compatível do SDK 55 continua resolvendo `4.1.1`; a substituição de workspace não é gravada pelo pnpm 9.12.0 neste lockfile. | Bloqueado por atualização upstream do Expo/CLI; não editar o lockfile nem forçar versão incompatível. |
| `image-size@1.2.1` | 2 | `react-native@0.83.10` → `@react-native/community-cli-plugin@0.83.10` → `metro@0.83.7` | O auditor informa que não há versão corrigida. | Bloqueado por upstream Metro/React Native; reavaliar em cada atualização do SDK. |

As substituições que não foram incorporadas ao lockfile foram removidas do manifesto. Apenas as atualizações efetivamente resolvidas e os controles de rastreabilidade permanecem no projeto. A aceitação limitada ao ambiente preparatório Signet continua aplicável, mas os quatro avisos altos bloqueiam o cofre com segredo, qualquer transação e release público.

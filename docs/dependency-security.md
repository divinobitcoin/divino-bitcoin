# Rastreabilidade de Dependências

**Status:** controle preparatório para Signet; sem impacto em chaves, custódia ou fundos  
**Última revisão:** 20 de agosto de 2026

## Política

O arquivo `pnpm-lock.yaml` é a referência de resolução de dependências do Divino Bitcoin. Alterações em dependências de produção, criptografia, armazenamento, rede ou compilação exigem revisão por pares, justificativa no pull request e novo checkpoint. Instalações de CI deverão usar resolução congelada, e uma auditoria de dependências deverá ocorrer antes de cada release candidato.

Cada release candidato terá um SBOM em CycloneDX, contendo dependências de produção, versões, licenças disponíveis, hashes/proveniência quando suportados e o commit de origem. O arquivo não poderá conter credenciais, URLs com segredo ou dados de usuário. Os SBOMs serão publicados junto do artefato somente após revisão.

## Substituições transitivas

As substituições de dependências devem ser definidas em `pnpm-workspace.yaml`, conforme a documentação do pnpm [Settings][2]. Alterar diretamente o lockfile é proibido. Toda substituição exige auditoria posterior, testes automatizados e validação no Expo Go, pois atualizações transitivas podem afetar o empacotador. Itens altos ou críticos não corrigidos impedem Mainnet e distribuição pública; a permanência no modo demonstrativo e em Signet só pode ocorrer com riscos documentados e revisão explícita.

## Estado atual da ferramenta

O projeto declara `pnpm@9.12.0`. Nesta linha, configurações de resolução como `overrides` devem permanecer no `pnpm-workspace.yaml`; colocá-las em `package.json` é ignorado. [1] A geração nativa `pnpm sbom` foi adicionada apenas no pnpm 11 e suporta CycloneDX ou SPDX, com saída de arquivo e filtro de dependências de produção. [2] Por isso, o comando ainda não é adotado no repositório: atualizar o gerenciador de pacotes altera a cadeia de desenvolvimento e exige ADR, teste de instalação limpa e checkpoint específico.

Também foi tentada a saída `npm sbom`, mas a árvore instalada apresentou uma inconsistência de peer dependency (`p-limit` requerido por `p-locate`). Nenhum SBOM parcial foi aceito. Esta falha será tratada como item de higiene da cadeia de fornecimento, sem bloquear o ambiente Signet sem valor econômico; ela bloqueia qualquer candidatura a Mainnet.

| Controle | Estado | Gate |
| --- | --- | --- |
| Lockfile versionado | Ativo | Todos os merges |
| Revisão de mudança de dependência sensível | Ativo por política | Todos os merges |
| Auditoria de dependências | Expo SDK 55 aplicado; itens críticos corrigidos e itens altos reduzidos de 63 para 33 em 20/08/2026 | Antes de teste de transferência Signet |
| SBOM CycloneDX de produção | Pendente de ADR de ferramenta | Antes de release candidato |
| Proveniência e assinatura de artefato | Pendente | Antes de Mainnet |

## Referências

[1] [pnpm 9 — Settings e `pnpm-workspace.yaml`](https://pnpm.io/9.x/settings)
[2] [pnpm — comando `sbom`](https://pnpm.io/cli/sbom)
[3] [OWASP CycloneDX](https://owasp.org/www-project-cyclonedx/)

## Auditoria de 20 de agosto de 2026

A auditoria de produção após atualizar `@trpc/*` para 11.8.0 e `drizzle-orm` para 0.45.2 reportou **0 críticas, 31 altas, 12 moderadas e 3 baixas**. A redução de 33 para 31 decorre de atualizações diretas compatíveis. Os itens altos que restam continuam concentrados na cadeia Expo/Metro e em ferramentas de desenvolvimento, incluindo `image-size`, `minimatch`, `js-yaml`, `picomatch` e dependências do Expo CLI. A presença no relatório não equivale a explorabilidade no binário Android, mas mantém bloqueados Mainnet, segredo de usuário e transações Signet até nova reavaliação.

As versões corrigidas de `@xmldom/xmldom`, `node-forge`, `path-to-regexp` e outras dependências transitivas foram verificadas no registro, porém o pnpm 9.12.0 não refletiu substituições no lockfile desta árvore apesar da sintaxe documentada. Nenhuma alteração manual de lockfile será usada para mascarar esse resultado. A próxima opção de geração de SBOM será baseada no lockfile versionado e documentará explicitamente o escopo de produção, em vez de interpretar a árvore `node_modules` hoisted como se fosse um `package-lock.json`.

O `@cyclonedx/cyclonedx-npm` foi avaliado em versão 6.0.1, compatível com Node 22, mas interrompeu a análise devido a divergências esperadas entre `npm ls` e o layout hoisted do pnpm. Ele foi removido em seguida, sem permanecer como dependência de desenvolvimento. O comando nativo `pnpm sbom`, disponível em linhas mais recentes do pnpm, permanece uma referência para evolução futura após uma migração de gerenciador de pacotes especificamente revisada. [2]

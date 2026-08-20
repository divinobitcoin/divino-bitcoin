# SBOM de Produção

O arquivo [`sbom-cyclonedx-production.json`](./sbom-cyclonedx-production.json) é o inventário de componentes de produção do Divino Bitcoin no formato **CycloneDX 1.6**. Ele é derivado deterministicamente de `pnpm-lock.yaml`: percorre somente `dependencies` do importador raiz e suas dependências transitivas, incluindo opcionais de produção, e exclui `devDependencies` diretas do projeto. Um pacote tipicamente usado em desenvolvimento ainda pode aparecer se alguma dependência de produção o declarar como requisito transitivo; o inventário registra a resolução efetiva, não uma inferência sobre uso em runtime.

Execute `pnpm sbom:prod` após toda alteração de dependência ou lockfile. O gerador não interpreta a árvore `node_modules` hoisted como fonte de verdade; isso evita a classificação incorreta de pacotes como extraneous pela ferramenta `npm ls`. O lockfile versionado permanece a evidência de resolução.

O SBOM descreve componentes e integridades registradas no lockfile. Ele **não** atesta ausência de vulnerabilidades, nem substitui `pnpm audit --prod --json`, revisão de licença, proveniência ou validação em dispositivo. A auditoria de 20/08/2026 e o risco residual estão registrados em [`dependency-security.md`](./dependency-security.md) e [`signet-dependency-risk-acceptance.md`](./signet-dependency-risk-acceptance.md).

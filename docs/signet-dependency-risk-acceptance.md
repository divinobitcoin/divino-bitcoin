# Aceitação de Risco de Dependências — Escopo Signet

**Data:** 20 de agosto de 2026  
**Status:** aceitação condicional para atividades preparatórias internas em Signet; **não** é autorização de lançamento, Mainnet, custódia, armazenamento de seed ou transferência de valor.  
**Revisão obrigatória até:** 19 de setembro de 2026, ou imediatamente após alteração de dependências, descoberta de nova vulnerabilidade crítica ou antes de qualquer funcionalidade com chave privada.

## Decisão e limite

O Divino Bitcoin aceita, de forma temporária e restrita, o risco residual de dependências para continuar o trabalho de engenharia **sem valor econômico** no perfil Signet. A decisão permite somente a especificação de arquitetura, vetores públicos de interoperabilidade, isolamento de dados locais e validações que não criem, importem, persistam ou assinem com chaves privadas.

> Esta decisão não reduz a gravidade dos avisos remanescentes. Ela apenas limita o contexto de execução até que a cadeia de dependências seja remediada e reavaliada.

O OWASP recomenda analisar a vulnerabilidade, seus fatores mitigadores e a cadeia da dependência direta antes de aceitar risco de um componente transitivo. O NIST trata a gestão de risco de cadeia de fornecimento como processo de identificar, avaliar e mitigar riscos durante todo o ciclo de vida. [1] [2]

## Evidência de auditoria

Em 20 de agosto de 2026, a execução de `pnpm audit --prod --json` sobre o lockfile resolvido reportou o seguinte estado:

| Severidade | Quantidade | Decisão |
|---|---:|---|
| Crítica | 0 | Deve permanecer em zero. Qualquer ocorrência revoga esta aceitação imediatamente. |
| Alta | 33 | Aceita somente para o escopo preparatório descrito neste documento. Bloqueia Mainnet, distribuição pública e qualquer cofre de chaves. |
| Moderada | 12 | Monitorada a cada atualização e antes de qualquer marco de integração. |
| Baixa | 3 | Monitorada em manutenção regular. |

Os caminhos identificados incluem cadeias de ferramenta e empacotamento, como `expo > @expo/cli`, `expo > @expo/metro`, e a cadeia web de `nativewind > tailwindcss`, além de componentes do servidor de desenvolvimento. Esses caminhos **não comprovam** alcance no binário final nem eliminam risco; eles definem onde a investigação e a atualização precisam ocorrer. A documentação de auditoria orienta revisar o campo de caminho, atualizar a dependência direta quando houver correção e registrar fatores mitigadores quando não houver. [3]

## Escopo permitido

| Atividade | Permitida | Condição obrigatória |
|---|---|---|
| Documentar arquitetura de autocustódia | Sim | Sem material secreto ou exemplos de seed reais. |
| Criar namespaces de armazenamento vazios para Signet | Sim | Sem chave, seed, token de nó ou invoice real. |
| Adicionar vetores BIP públicos e testes determinísticos | Sim | Vetores oficiais apenas; nenhum segredo fornecido por usuário. |
| Validar UX demonstrativa no Expo Go | Sim | Manter `assertLiveLightningEnabled` bloqueando conexões reais. |
| Instalar ou atualizar dependências | Sim | Auditoria, testes, TypeScript, lint e checkpoint posteriores. |

## Operações proibidas

| Operação | Estado | Justificativa |
|---|---|---|
| Criar, importar ou persistir seed phrase | Bloqueada | O risco de cadeia ainda é incompatível com material de recuperação. |
| Derivar ou armazenar chave privada | Bloqueada | Exige cofre nativo, revisão independente e cadeia de dependências aprovada. |
| Assinar PSBT, transação ou pagamento Lightning | Bloqueada | Uma assinatura pode habilitar perda irreversível de fundos. |
| Conectar a Electrum, Esplora, LSP, nó ou NWC | Bloqueada | Amplia a superfície de rede antes dos controles de chave e de arquitetura. |
| Mainnet, distribuição pública ou release candidato | Bloqueada | Requer ausência de severidade crítica/alta, SBOM, proveniência e revisão de segurança. |

## Controles compensatórios e gatilhos de revogação

O lockfile versionado, as substituições rastreáveis no `pnpm-workspace.yaml`, os testes automatizados, o TypeScript, o lint e a validação no Expo Go continuam obrigatórios. A auditoria de produção será repetida antes de cada marco técnico e após qualquer alteração na resolução de dependências. A aceitação é revogada automaticamente se surgir item crítico, se aumentarem os itens altos, se houver regressão no Expo Go, se um pacote de criptografia ou armazenamento seguro for introduzido, ou se o escopo passar a manipular segredo ou rede Bitcoin.

Para avançar da preparação isolada à primeira transferência Signet, será necessário um checkpoint separado contendo: cofre de chaves projetado e revisado, vetores BIP aprovados, isolamento persistente de rede, análise de dependências atualizada e aprovação explícita do proprietário do projeto. A aceitação atual não substitui nenhum desses gates.

## Referências

[1] [OWASP — Vulnerable Dependency Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Vulnerable_Dependency_Management_Cheat_Sheet.html)  
[2] [NIST — Cybersecurity Supply Chain Risk Management](https://csrc.nist.gov/projects/cyber-supply-chain-risk-management)  
[3] [npm Docs — Auditing package dependencies for security vulnerabilities](https://docs.npmjs.com/auditing-package-dependencies-for-security-vulnerabilities/)

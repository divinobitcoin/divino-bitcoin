# Política de Segurança do Divino Bitcoin

**Status:** política inicial para o período de demonstração e desenvolvimento em Signet  
**Última revisão:** 20 de agosto de 2026

> O Divino Bitcoin está em modo demonstrativo e de desenvolvimento. Ele não gera, importa ou armazena seeds, chaves privadas, canais Lightning ou satoshis reais neste estágio. Esta política não é uma garantia de segurança nem uma autorização para testar sistemas de terceiros.

## Compromisso

O Divino Bitcoin pretende ser uma carteira livre, autocustodiada, aberta e auditável. A segurança de material criptográfico, da assinatura local, dos limites de rede e do processo de release é requisito de produto. Relatos feitos de boa-fé serão tratados de modo coordenado, preservando pesquisadores e usuários enquanto uma correção é preparada.

Esta política seguirá evoluindo antes de qualquer suporte a seed, Signet integrado, on-chain, Lightning ou Mainnet. A política não substitui auditoria independente, revisão jurídica, revisão de licença ou o dever do usuário de proteger backups e dispositivos.

## Versões e superfície cobertas

| Elemento | Situação atual | Cobertura |
| --- | --- | --- |
| Código-fonte publicado e histórico de releases | GPL-3.0-or-later | Coberto |
| Aplicativo Expo em demonstração | Sem chaves, fundos ou conexão Lightning real | Coberto |
| Perfil de desenvolvimento Signet | Configuração bloqueada, sem cofre ou transação | Coberto |
| Futuro cofre de seed, assinatura on-chain e nó Lightning | Ainda não implementado | Será coberto antes da primeira versão que o contenha |
| Infraestrutura, SDKs e serviços de terceiros | Operados por seus respectivos responsáveis | Relate apenas o impacto direto sobre o código do Divino Bitcoin |

## Como relatar uma vulnerabilidade

**Não abra uma issue pública, não publique uma prova de conceito e não inclua seed, chave privada, backup, invoice, endereço de uso real, token, captura de tela sensível ou dados pessoais no relato.** Se a falha envolver uma versão pública no GitHub, use o recurso de *Private Vulnerability Reporting* do repositório assim que ele estiver habilitado. Antes da publicação pública do repositório, utilize o canal privado indicado pelo responsável do projeto; não use issues, comentários de loja ou redes sociais.

Um relato útil descreve a versão ou commit afetado, plataforma, pré-condições, impacto esperado, passos mínimos e não destrutivos para reprodução, evidência sanitizada e uma sugestão de mitigação se houver. Pesquisadores devem interromper os testes assim que confirmarem o impacto, evitar acesso a dados de terceiros e nunca tentar mover fundos, extrair material criptográfico, degradar disponibilidade ou explorar infraestrutura que não lhes pertence.

| Etapa | Meta inicial | Resultado esperado |
| --- | --- | --- |
| Confirmação de recebimento | Até 5 dias úteis | Identificador privado e confirmação de triagem |
| Avaliação inicial | Até 14 dias corridos | Escopo, impacto, severidade preliminar e plano de correção |
| Atualizações | A cada 14 dias enquanto aberto | Progresso, bloqueios e data reavaliada |
| Divulgação coordenada | Após correção, mitigação ou decisão documentada | Advisory, crédito opcional e versão corrigida |

Essas metas não são SLA e podem mudar quando houver exploração ativa, dependência de terceiros, alteração de protocolo ou risco a usuários. A divulgação coordenada deve equilibrar a necessidade de correção e a informação pública; esse princípio é consistente com práticas descritas pelo CERT/CC. [1]

## Escopo e classificação de severidade

| Severidade | Exemplos de impacto que exigem prioridade |
| --- | --- |
| **Crítica** | Exposição ou extração de seed, chave privada, chave de canal ou backup; assinatura não autorizada; desvio silencioso de destino ou valor; execução arbitrária em fluxo de assinatura; bypass que permita Mainnet ou fundos reais contra as barreiras previstas. |
| **Alta** | Alteração de transação antes da confirmação; acesso indevido a armazenamento protegido; downgrade de rede ou de verificação; falha de recuperação com risco plausível de perda de controle; adulteração de build ou atualização. |
| **Média** | Vazamento de metadados sensíveis, falha de isolamento entre Demo/Signet/Mainnet, confirmação enganosa sem possibilidade direta de gasto ou controles móveis ausentes em fluxo sensível. |
| **Baixa** | Defeitos sem impacto demonstrável em segredo, assinatura, integridade de transação, disponibilidade crítica ou privacidade material. |

O modelo de ameaça em `docs/threat-model.md` será a fonte de rastreabilidade entre ativos, ameaças, controles e testes. A classificação considera impacto, pré-condições, alcance, detectabilidade e possibilidade de usuário recuperar o controle; não é definida apenas por complexidade de exploração.

## Pesquisa de boa-fé e porto seguro

O projeto não tomará medidas contra pesquisadores que atuem de boa-fé, dentro deste escopo, com técnicas não destrutivas, em seus próprios dispositivos e dados, e que relatem privadamente o problema. A pesquisa deve observar leis aplicáveis, termos de plataformas e direitos de terceiros. Esta declaração não autoriza engenharia social, phishing, extorsão, negação de serviço, teste em contas de terceiros, acesso não autorizado, interceptação de tráfego alheio, publicação prematura ou tentativa de movimentar ativos.

Pesquisadores não devem inferir que ambientes Signet ou demonstração autorizam testes fora deste repositório. Serviços de faucet, relays, exploradores, nós, bibliotecas e lojas possuem políticas próprias.

## Controles de engenharia e transparência

A segurança móvel será avaliada contra os domínios de armazenamento, criptografia, autenticação, rede, plataforma, código, resiliência e privacidade do OWASP MASVS. [2] O modelo de ameaça seguirá uma abordagem centrada nos dados e em suas superfícies de ataque e defesa, em linha com a orientação do NIST para modelagem de ameaças. [3]

Antes de qualquer fundo real, a equipe deverá publicar ou revisar, no mínimo, modelo de ameaça, requisitos de cofre, vetores de teste, dependências e licenças, SBOM, proveniência de build, política de atualização, plano de incidente e evidências de auditoria. Builds que manipulem chaves ou fundos não serão distribuídos pelo Expo Go.

## Divulgação pública e créditos

Após uma correção, o projeto poderá publicar um advisory com versões afetadas, impacto, mitigação, crédito ao pesquisador quando houver consentimento e referências a CVE quando aplicável. Detalhes exploráveis serão retidos ou minimizados enquanto usuários ainda estiverem expostos. Falhas críticas com exploração ativa podem exigir comunicação mais rápida e coordenação adicional.

## Referências

[1] [CERT/CC — Vulnerability Disclosure Policy](https://certcc.github.io/certcc_disclosure_policy/)  
[2] [OWASP — Mobile Application Security Verification Standard](https://mas.owasp.org/MASVS/)  
[3] [NIST SP 800-154 — Guide to Data-Centric System Threat Modeling](https://csrc.nist.gov/pubs/sp/800/154/ipd)

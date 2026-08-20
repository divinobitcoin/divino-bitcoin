# Integração Lightning — Decisão de Arquitetura

## Contexto

A versão atual do **Divino Bitcoin** opera exclusivamente em modo de demonstração. A interface, as regras de saldo e os registros locais foram deliberadamente separados de qualquer fonte de fundos. Essa separação evita que credenciais de um nó, chaves de carteira ou bitcoin real sejam usados antes de uma definição explícita de custódia, limites e responsabilidade operacional.

Para ativar a Lightning Network real, há **duas arquiteturas viáveis**. A decisão deve ser tomada antes de conectar uma API, gerar uma seed phrase ou liberar pagamentos.

| Opção | Como funciona | Benefícios | Riscos e obrigações |
| --- | --- | --- | --- |
| **1. Conexão Nostr Wallet Connect (NWC)** | O usuário conecta uma carteira ou nó já existente a partir de uma URI `nostr+walletconnect`. O aplicativo solicita capacidades, cria invoices e pede pagamentos por mensagens fim a fim cifradas. | Mantém o aplicativo como cliente da carteira existente; permite conexões revogáveis e limites definidos pelo serviço de carteira. O protocolo prevê métodos como `get_balance`, `make_invoice` e `pay_invoice`. [1] | A URI contém um segredo de conexão e precisa ficar somente no armazenamento seguro do aparelho. É necessário limitar capacidades, validar a URI, tratar indisponibilidade de relay e pedir confirmação forte antes de cada pagamento. |
| **2. Gateway próprio para LND ou LNbits** | O aplicativo conversa apenas com uma API própria; esse gateway então acessa LND ou uma instância LNbits. Tokens e autenticação do nó permanecem fora do app. | Controle operacional e auditoria centralizados; LND oferece APIs gRPC e REST autenticadas; LNbits expõe endpoints de saldo, invoices e pagamentos com escopos de chave. [2] [3] | Exige infraestrutura persistente, monitoramento, limites por usuário, reconciliação, gestão de incidentes e revisão de custódia. O app nunca deve incluir macaroons LND ou chaves administrativas LNbits. |

## Requisitos comuns antes da ativação

Independentemente da opção escolhida, o aplicativo deverá validar BOLT11/LNURL, exibir valor, taxa máxima e destino antes do envio, solicitar biometria para uma operação sensível e registrar somente metadados mínimos. As credenciais de integração devem ficar em armazenamento protegido e nunca em variáveis públicas do aplicativo ou no repositório.

> O NIP-47 descreve uma conexão em que o aplicativo cliente usa a URI de conexão para comunicar-se com um serviço de carteira por mensagens cifradas. A URI inclui uma chave secreta específica da conexão, portanto deve ser tratada como dado sensível. [1]

Para a rota com nó próprio, a documentação do LND informa que chamadas gRPC ou REST dependem de conexão TLS/SSL e macaroon de autenticação. [2] Em uma arquitetura móvel, essas credenciais devem permanecer no gateway, não no cliente. Para LNbits, chaves de API possuem escopos por carteira e diferenciam a criação de invoices do envio de pagamentos; a menor permissão necessária deve ser aplicada. [3]

## Próxima decisão necessária

A próxima etapa depende da escolha entre **NWC** e **gateway próprio**. Após essa confirmação, a implementação adicionará a camada correspondente, manterá os segredos fora do código-fonte e ativará testes de integração em ambiente de testes antes de qualquer movimentação de fundos reais.

## Estrutura inicial implementada

A primeira camada de preparação permite selecionar localmente a arquitetura preferida, preservando o aplicativo em modo de demonstração. O contrato `LightningProviderAdapter` já delimita as operações que uma integração futura deverá oferecer: consulta de saldo, criação de invoice e pagamento de invoice. Nenhuma implementação de rede foi adicionada, e todas essas operações continuam bloqueadas por projeto.

> A seleção de NWC ou gateway não coleta URI, chave, macaroon, token ou saldo. A etapa seguinte exige uma escolha explícita da arquitetura, uma revisão de segurança e testes em ambiente isolado antes de habilitar qualquer função financeira.

## Referências

[1]: https://nips.nostr.com/47 "NIP-47 — Nostr Wallet Connect"
[2]: https://lightning.engineering/api-docs/api/lnd/ "Lightning Labs — LND API Reference"
[3]: https://docs.lnbits.com/api/ "LNbits — API Reference"

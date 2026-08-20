# Contrato Local de Fonte On-Chain Combinada

**Status:** implementado somente como contrato local.  
**Data:** 20 de agosto de 2026

## Limite do marco

O módulo `shared/signet-onchain-source.ts` representa a decisão de uma fonte on-chain combinada: Electrum configurável e Esplora configurável. Ele não contém URLs, endpoints, credenciais, chamadas HTTP, WebSocket, consulta de saldo, descoberta de UTXO, construção de transação, broadcast ou integração com biblioteca Bitcoin.

> Uma fonte de cadeia permite observar ou transmitir dados; ela não pode criar, proteger, derivar ou recuperar uma chave. Esse limite continua sendo do cofre autocustodial, que permanece bloqueado.

| Campo | Valor atual | Salvaguarda |
|---|---|---|
| Rede | `signet` | A guarda `assertSignetOnly()` rejeita Mainnet, Testnet e Regtest. |
| Estratégia | `combined-configurable` | O usuário poderá escolher a prioridade somente em marco futuro. |
| Fontes | Electrum e Esplora | Ambas têm `endpoint: null` e `status: not-configured`. |
| Sincronização | `false` | Não existe cliente de rede nesta versão. |
| Broadcast | `false` | Uma transação não pode ser enviada. |
| Credenciais | `false` | Não existe suporte a token, senha ou conexão autenticada. |

## Motivo da combinação

BDK trata Electrum e Esplora como backends distintos de blockchain, e uma carteira pode escolher a fonte compatível com seu modelo operacional. [1] [2] Electrum alerta que um servidor pode inferir informações de privacidade das consultas; a possibilidade de apontar para um servidor escolhido pelo usuário evita tornar um provedor público único uma dependência do aplicativo. [3] Nenhum desses fatos é usado para justificar uma conexão neste marco: a configuração local é apenas o contrato que preserva a escolha futura.

## Gates para ativação futura

| Gate | Exigência antes de remover o bloqueio |
|---|---|
| Cofre e derivação | Build próprio, material de chave não exportável, recuperação e vetores BIP completos aprovados. |
| Dependências | Revisão da cadeia, SBOM e remediação das vulnerabilidades altas que hoje bloqueiam chaves e rede. |
| Privacidade | Sem endpoint embutido, consentimento explícito, documentação de metadados enviados e política de troca de fonte. |
| Protocolo | Validação de TLS/identidade quando aplicável, limite de recursos, testes de erro e separação Signet. |
| Operação | Checkpoint específico e aprovação explícita antes de habilitar sincronização; broadcast somente após uma revisão posterior de PSBT e assinatura. |

## Referências

[1] [Bitcoin Dev Kit — repositório oficial](https://github.com/bitcoindevkit/bdk)  
[2] [BDK — Blockchain backends](https://docs.rs/bdk/latest/bdk/blockchain/index.html)  
[3] [Electrum — FAQ: confiança e privacidade de servidores](https://docs.electrum.org/en/latest/faq.html)

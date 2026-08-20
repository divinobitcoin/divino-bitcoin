# Pesquisa: requisitos para Lightning com saldo real

## Fontes consultadas em 20 de agosto de 2026

| Fonte | Constatação relevante | URL |
| --- | --- | --- |
| NIP-47 | NWC conecta um cliente a uma carteira Lightning remota por mensagens diretas Nostr criptografadas de ponta a ponta; suporta capacidades como `get_balance`, `make_invoice` e `pay_invoice`. | https://nips.nostr.com/47 |
| Documentação NWC | A URI de conexão traz um segredo de cliente; conexões podem ser distintas por aplicativo, revogadas e receber restrições como orçamento. | https://docs.nwc.dev/bitcoin-apps-and-websites/connecting-to-the-wallet/traditional-connection-flow |
| Documentação NWC | O protocolo pode expor recebimento, envio, saldo, histórico e verificação de pagamentos; controles granulares de permissão e orçamento são recomendados. | https://docs.nwc.dev/bitcoin-lightning-wallets/benefits-and-features |
| Guia Alby | NWC é uma especificação para comunicação com nó Lightning via Nostr e pode viabilizar pagamentos por backend ou aplicativo móvel. | https://guides.getalby.com/developer-guide/developer-guide/nostr-wallet-connect-api |

## Implicações para o Divino Bitcoin

O aplicativo atual permanece inteiramente em demonstração: o adaptador está apenas definido como interface, a conexão real é sempre desativada e os fluxos da carteira chamam funções de fatura, liquidação e pagamento locais. Uma integração real exigirá um adaptador NWC ou gateway, armazenamento protegido da URI ou credenciais, validação BOLT11, consulta de capacidades do provedor, tratamento de status assíncrono, limites de valor e taxa, autenticação biométrica antes de enviar, registros auditáveis e mecanismo de revogação/desconexão.

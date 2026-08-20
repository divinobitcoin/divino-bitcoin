# Notas de Validação BOLT11

O leitor deve aceitar faturas BOLT11 em Bech32, com ou sem o prefixo de URI `lightning:`, e rejeitar entradas cuja soma de verificação seja inválida. O prefixo humano deve iniciar com `ln` e indicar a rede, como `lnbc` para Bitcoin principal e `lntb` para testnet. O valor na parte legível é opcional e pode ser expresso com multiplicadores. [1]

Nesta atualização, a validação local será **sintática e estrutural**: normalização da URI, Bech32, prefixo/rede, multiplicador de valor, timestamp e presença do campo `p` (payment hash). A confirmação de pagamento real continuará dependendo do provedor Lightning escolhido, que deverá verificar assinatura, expiração e roteamento antes de enviar fundos.

## Referência

[1]: https://github.com/lightning/bolts/blob/master/11-payment-encoding.md "BOLT #11: Invoice Protocol for Lightning Payments"

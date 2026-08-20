# Ambiente de desenvolvimento: Bitcoin Signet

> **Decisão de projeto:** `Signet` é a única rede Bitcoin permitida para a primeira etapa de desenvolvimento integrada. Mainnet, Testnet e Regtest não são perfis selecionáveis neste build.

Signet é uma rede de teste do protocolo Bitcoin com blocos validados por um desafio adicional controlado pelo signet. Ela foi concebida para permitir testes previsíveis sem expor Bitcoin de produção. [1]

| Aspecto | Regra atual |
| --- | --- |
| Perfil de código | `ACTIVE_DEVELOPMENT_NETWORK = "signet"` |
| Prefixo Lightning esperado | `lntbs` |
| Chaves e seed | Não são geradas, importadas ou persistidas nesta etapa |
| Nó, saldo, invoice e pagamento | Permanecem bloqueados; a demonstração local não ganha capacidade de rede |
| Mainnet | Rejeitada por `assertSignetOnly()` |
| Persistência | O estado demonstrativo existente continua em seu namespace próprio; um futuro cofre Signet deverá usar armazenamento separado antes de qualquer dado de carteira |

O validador BOLT11 pode identificar faturas de mais de uma rede para fins de inspeção. Isso não é uma autorização de pagamento: toda futura camada de assinatura, conexão de nó ou transmissão deverá validar o perfil ativo antes de operar. A salvaguarda atual de Lightning continua retornando bloqueio para qualquer operação real.

## Limites operacionais desta fase

Não use este aplicativo no Expo Go para criar seeds, importar carteira, conectar nó, aceitar credenciais ou movimentar valor. O trabalho seguinte é de arquitetura e testes: definir o namespace separado de Signet, os vetores BIP, uma estratégia de sincronização e a interface de cofre antes de integrar qualquer biblioteca de carteira.

## Referências

[1] [BIP-325 — Signet](https://bips.dev/325/)

# NODE-PROPRIO-ESCRITA-001 — primeira transmissão via `sendrawtransaction` pelo nó próprio

**Status:** FECHADO para o que este documento afirma — ver "O que isto NÃO estabelece".
**Data:** 29/08/2026

## O que aconteceu

`NODE-PROPRIO-LEITURA-001` (29/08/2026) fechou o caminho de leitura de
`shared/bitcoin-core-wallet-client.ts` contra o nó real. Faltava a outra
metade do I-3 (CARTA-001): `broadcastRawTransactionViaCoreRpc`, que chama
`sendrawtransaction` no `bitcoind` do próprio usuário em vez do Esplora
público. Escrito contra respostas simuladas; nunca tinha tocado um nó
real.

`scripts/lab-signet-flow.ts send <destino> <sats> [sat/vB] --via-node
--confirmo` (adicionado em `578814e`) foi exercitado em 29/08/2026 contra
`~/.bitcoin-divino-signet`, com seed de laboratório descartável, gerada
depois de um reboot que apagou a seed e o processo anteriores — recomeço
completo do zero, faucet incluído.

## A transação

| Campo | Valor |
|---|---|
| Entrada | 1 UTXO de 10.000 sat |
| Saída 1 | 5.000 sat → `tb1qdm8fh7gx788flancldk9xqxtsfc3csu7yjwcgd` |
| Saída 2 (troco) | 4.719 sat → mesmo endereço |
| Taxa | 281 sat (141 vB, 1.99 sat/vB — estimativa bateu exata) |
| Txid | `55ee6f3358cfd1f111bc35310def412ecb1a8fdd044a2eabbe14afd5868e5991` |
| Transmitido via | `sendrawtransaction`, RPC base do nó próprio (não escopo de wallet — broadcast não é operação de chave) |

Destino e troco são o mesmo endereço de propósito: fecha o ciclo de
escrita sem mandar a moeda descartável para fora da mesma seed de
laboratório. Por isso as duas saídas aparecem como "TROCO" na revisão —
correto, não é bug.

## Confirmação por duas fontes independentes

1. **O próprio script** reportou `ACEITA PELO NÓ` com o txid acima —
   mas isso sozinho é o script confirmando o próprio trabalho.
2. **`bitcoin-cli getmempoolentry <txid>`**, chamada separada, direto no
   nó, fora do código da carteira: devolveu a entrada real do mempool —
   `vsize: 141`, `fees.base: 0.00000281` (281 sat) — batendo exatamente
   com o que a carteira calculou e revisou antes de transmitir.

As duas fontes concordam. A segunda é o que torna isto uma verificação,
não uma alegação do próprio código sobre si mesmo.

## O que isto estabelece

- `broadcastRawTransactionViaCoreRpc` funciona contra um `bitcoind` real:
  monta a chamada `sendrawtransaction` certa, o nó aceita, o txid
  devolvido bate com o calculado localmente antes da transmissão.
- A disciplina de precheck local (recalcular o txid a partir dos bytes
  assinados antes de qualquer chamada de rede) não impediu uma
  transmissão válida — ela só existe para barrar uma inválida.
- I-3 (CARTA-001) está fechado nas duas direções pelo nó próprio: leitura
  (`NODE-PROPRIO-LEITURA-001`) e escrita (este documento).
- `send --via-node` funciona de ponta a ponta como alternativa ao
  Esplora público, exatamente como `BROADCAST-REAL-001` fechou o mesmo
  ciclo contra o Esplora.

## O que isto NÃO estabelece

- **Não é um envio a um destinatário externo.** As duas saídas voltam
  para a mesma seed de laboratório. Não prova nada sobre construir ou
  revisar uma saída que realmente sai da carteira — isso já foi provado
  em `BROADCAST-REAL-001`, só não repetido aqui via nó.
- **Não prova propagação além do nó próprio.** `getmempoolentry`
  confirma que o nó aceitou e guardou a transação no seu próprio mempool;
  não confirma que ela se espalhou pela rede Signet nem que outro nó a
  viu. Checar isso exigiria consultar uma segunda fonte de rede (ex.:
  mempool.space) depois de ela confirmar em bloco.
- **Não exercitou RBF, múltiplas entradas, nem saída P2TR/P2WSH** — só o
  caso mais simples: 1 entrada P2WPKH, 2 saídas P2WPKH.
- Não liga isto à interface do app — `app/dev/signet-psbt.tsx` continua
  transmitindo pelo Esplora; escolher a fonte é decisão separada, sem
  gate, mas ainda não tomada.
- Não substitui auditoria externa (I-4, CARTA-001).

## Próximo passo de maior valor

Confirmar a transação em bloco (via `mempool.space/signet/tx/<txid>` ou
nova consulta ao próprio nó) fecha a lacuna de propagação acima. Depois
disso, os itens de maior valor seguintes são os já listados nas
"Próximas ações" da ficha do projeto: ampliar a evidência de rede
(múltiplas entradas, troco descartado por poeira, RBF) e considerar
ligar a leitura da interface ao nó próprio em vez do Esplora público.

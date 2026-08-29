# NODE-PROPRIO-LEITURA-001 — primeira verificação do caminho de leitura pelo nó próprio

**Status:** FECHADO para o que este documento afirma — ver "O que isto NÃO estabelece".
**Data:** 29/08/2026

## O que aconteceu

`shared/bitcoin-core-wallet-client.ts` foi escrito para I-3 (CARTA-001): a
carteira consultar saldo, UTXOs e transmitir através do `bitcoind` do
próprio usuário, em vez de depender só de um servidor Esplora de
terceiro. Escrito primeiro contra respostas HTTP simuladas — `pnpm test`
verde não prova que o código funciona contra um nó de verdade, só que
trata as formas de resposta que se esperava receber.

`scripts/wallet-core-smoke.ts` rodou contra o nó real do proprietário
(`~/.bitcoin-divino-signet`, Signet, `prune=10000`) em 29/08/2026. O
resultado final:

| Fonte | Confirmado | UTXOs |
|---|---|---|
| Nó próprio (`bitcoin-core-wallet-client`) | 369 sat | 1 |
| Esplora público (mempool.space) | 369 sat | 1 |

Mesmo endereço (`tb1qpulnagydhu2agf9u022300xt0uvhqk3w3ds3nx`), duas fontes
independentes, mesmo resultado.

## Os quatro achados no caminho

Nenhum foi visto em teste unitário — todos só apareceram contra o nó
real, e em três dos quatro casos o mock de teste repetia a mesma
suposição errada do código, então os testes passavam sem cobrir o
comportamento real:

| # | Achado | Causa |
|---|---|---|
| 1 | `getbalances` lido do grupo errado | Uma wallet `disable_private_keys=true` reporta saldo em `mine`, não em `watchonly`. `watchonly` é para um caso diferente (wallet com chave própria que também observa scripts de fora). |
| 2 | `!response.ok` checado antes do corpo JSON-RPC | O Core devolve HTTP 500 (não 200) para a maioria dos erros de nível RPC, com a mensagem real dentro do corpo. Checar o status antes de ler o corpo descartava a mensagem. Mesmo padrão existe, não corrigido, em `shared/bitcoin-core-rpc-client.ts` (achado registrado, não corrigido nesta rodada). |
| 3 | `loadwallet` código -35 tratado como erro fatal | "Wallet already loaded" não é uma falha — é o estado que a função queria alcançar. `bitcoind` não descarrega wallet sozinho entre chamadas. |
| 4 | (estrutural, não código) `prune=10000` do nó | Ainda não bateu na prática — o `birthday` do teste (30 dias atrás) ficou dentro da janela retida — mas é um risco real para uma janela de rescan mais longa. Não corrigido porque não é um bug, é uma característica do nó que precisa ser considerada ao escolher `birthday`. |

## O que isto estabelece

- O caminho `ensureWatchOnlyWallet` → `importWatchOnlyAddress` →
  `listWatchOnlyUtxos` / `getWatchOnlyBalanceSummary` funciona contra um
  `bitcoind` real, para um único endereço.
- `ensureWatchOnlyWallet` recusa prosseguir se a wallet não confirmar
  `private_keys_enabled=false` — comportamento verificado, não só
  presumido: o nó devolveu `false` de verdade, e o código leu certo.
- O fallback `createwallet` → `loadwallet` (incluindo o caso "já
  carregada") foi exercitado nas duas formas: primeira criação e segunda
  chamada com a wallet já em memória.
- Duas fontes independentes (nó próprio e Esplora público) concordam
  sobre o mesmo estado on-chain, para este endereço.

## O que isto NÃO estabelece

- **`sendrawtransaction` via nó nunca foi chamado.** Só o caminho de
  leitura foi exercitado.
- **`importWatchOnlyDescriptors`** (conta inteira via xpub com faixa de
  recebimento/troco) continua sem nunca ter tocado um nó real — só
  `importWatchOnlyAddress` (endereço único) foi testado.
- Só um endereço, com um único UTXO simples, foi testado. Não prova
  comportamento com múltiplos UTXOs, endereços P2TR/P2WSH, ou saldo não
  confirmado real (o `untrusted_pending` sempre veio zero neste teste).
- Não prova nada sobre ligar isto à interface do app — `liveSyncEnabled`
  continua `false`, o app continua lendo do Esplora público hoje. Ligar é
  decisão de arquitetura separada.
- Não substitui auditoria externa (I-4, CARTA-001).

## Próximo passo de maior valor

Exercitar `sendrawtransaction` via `broadcastRawTransactionViaCoreRpc` —
fechar o mesmo tipo de ciclo que `BROADCAST-REAL-001` fechou para o
Esplora, agora para o nó próprio.

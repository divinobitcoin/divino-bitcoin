# RAMO-TROCO-001 — a conta é rastreada nos dois ramos

**Data:** 02/09/2026
**Estado:** FECHADO para singlesig BIP-84 em Signet, com as limitações da seção 5.
**Faixa:** LAB (`LAB-LANE-001`, L1/L2/L3). Signet, material descartável, valor econômico zero.

---

## 1. O que faltava provar

`ACCOUNT-DESCRIPTORS-001` provou que o nó encontra fundos da conta a partir dos
descriptors. Mas toda a evidência era de dinheiro **chegando** num endereço
escolhido a dedo e colado num faucet — o endereço era conhecido antes de existir
saldo.

O ramo de troco é o caso oposto: **quem escolhe o endereço é a carteira**. Quando
uma transação é feita, o resto volta para um endereço do ramo `1`, sem o usuário
saber qual.

Se o nó não observasse esse ramo, a consequência seria a pior classe de defeito
numa carteira: **ela mostraria menos dinheiro do que existe**. O saldo cairia
depois de um gasto, o usuário concluiria que perdeu fundos, e não teria perdido
nada — os satoshis estariam na blockchain, num endereço que a carteira deixou de
observar.

## 2. A conta usada

Conta nova, criada depois de `LAB-SEED-VOLATIL-001`, com a disciplina corrigida:

1. `new-seed` com o aviso novo (commit `1b3667c`);
2. Recovery Kit gravado em `~/recovery-kit-lab-signet.txt`, `chmod 600`, **antes**
   de a conta receber qualquer moeda;
3. seed hex acrescentada ao kit — o gerador ainda não a inclui (ver seção 5);
4. só então o faucet.

**O caminho de retomada foi exercitado de verdade**: a seed foi lida de volta do
arquivo do kit, derivou a mesma conta, e o dinheiro apareceu. Não é alegação —
é o que as execuções mostram.

Wallet no nó: `divino-watch-only-conta-02`, criada limpa (ver `SMOKE-MULTICONTA-001`).

## 3. A transação

Enviada para o próprio endereço de troco da conta, **transmitida pelo nó do
usuário** (`--via-node`), não por servidor de terceiro.

| Campo | Valor |
|---|---|
| txid | `fa108bf2dab6029b4f6559a2c1da4669881f9e8c26112c5b5d3c91f909d297e1` |
| Entradas | 1 × 10.000 sat, em `m/84'/1'/0'/0/0` |
| Saídas | 3.000 sat + 6.719 sat, ambas em `m/84'/1'/0'/1/0` |
| Taxa | 281 sat |
| Tamanho | 141 vB — **estimado 141 vB** |
| Broadcast | `sendrawtransaction` no `bitcoind` próprio → `ACEITA PELO NÓ` |

`10.000 = 3.000 + 6.719 + 281`. A invariante de fechamento verificada em execução.

A revisão pré-transmissão, lida **dos bytes da transação assinada** (requisito
`T2`), trouxe dois sinais que valem registro:

- `Sai da carteira: 0 sat` — primeira vez que o código reconhece as saídas como
  próprias. Antes, sem lista de endereços de troco, tudo contava como saindo.
- `Todas as saídas são de troco: nenhum valor sai para um destinatário externo` —
  o aviso diz em voz alta que a transação não paga ninguém, em vez de deixar o
  usuário descobrir depois.

## 4. Resultado, depois da confirmação

```
Nó      — confirmado: 9719 sat (2 UTXO) | pendente: 0 sat (0 UTXO)
Esplora — confirmado: 9719 sat (2 UTXO) | pendente: 0 sat (0 UTXO)
```

Duas fontes independentes, mesmo valor, mesma contagem, **no ramo que a carteira
escolheu sozinha**. `RAMO-TROCO-001` fechado.

## 5. O que isto NÃO prova

**A fonte de cadeia não é independente do lado do nó.** O Esplora consultado é
público e externo, então aqui há duas fontes de verdade distintas — diferente do
`INTEROP-01`, onde o Sparrow lia do mesmo `bitcoind`. Mas o Esplora é `T4`: ele
sabe quais endereços foram consultados.

**Uma transação da forma mais simples.** Uma entrada, duas saídas, mesmo
endereço. Falta: múltiplas entradas, troco descartado por poeira, destino P2TR ou
P2WSH, RBF.

**Reúso de endereço.** As duas saídas foram para o mesmo endereço, porque o
destino escolhido para o teste é o próprio endereço de troco da ferramenta. É
ruim para privacidade e a carteira final não pode se comportar assim. Não afeta o
que foi provado aqui.

**`KIT-MNEMONIC-001` continua aberto** — a conta nasceu de entropia hex.

**`KIT-SEED-HEX-001`, novo:** o `recovery-kit.ts` imprime o `tprv`, que serve a
Sparrow e Electrum, mas **não imprime a seed hex**, que é o que as ferramentas
deste repositório pedem. Recuperar a conta em software de terceiro funciona;
recuperá-la no próprio laboratório, não. Foi contornado à mão nesta rodada.

Nada aqui diz respeito a Mainnet, cofre nativo, iOS ou à interface. Não substitui
auditoria externa.

## 6. Dois defeitos do script, encontrados no caminho

Os dois deram **falso negativo** sobre rodadas que tinham funcionado, e os dois
são da mesma família do `SMOKE-VERDICT-001`: **a régua estava errada, não o que
era medido.**

### `SMOKE-MULTICONTA-001`

`listunspent` responde pela **wallet inteira** do Core, não pela conta. A conta
perdida em `LAB-SEED-VOLATIL-001` continuou dentro de
`divino-watch-only-conta`, e a primeira execução com a conta nova somou as duas:
o nó reportou 10.000 sat confirmados que o Esplora não via, porque eram de outra
conta.

Provado com `listunspent`, que mostrou os dois UTXOs lado a lado — um em
`tb1q4mn0lh…` com 129 confirmações (conta velha) e um em `tb1q9dxsq…` com zero
(conta nova).

**Correção:** filtrar os UTXOs do nó pelos endereços da própria conta antes de
comparar, e avisar quando sobrar UTXO de fora.

### `SMOKE-TRUSTED-001`

`getbalances.mine.trusted` **não quer dizer "confirmado"**. Quer dizer "não
confirmado, mas eu confio" — e o Core confia no troco ainda não confirmado de uma
transação cujas entradas a própria wallet conhece por inteiro, porque ninguém de
fora pode gastá-las duas vezes.

O script tirava os **valores** de `getbalances` e as **contagens** de
`listunspent`. Enquanto todo o dinheiro veio de faucet — de terceiro — as duas
definições coincidiram por acidente. Na primeira transação da conta **para si
mesma**, o troco não confirmado apareceu como `trusted` no nó e como não
confirmado no Esplora:

```
Nó      — confirmado: 9719 sat (0 UTXO) | pendente:    0 sat (2 UTXO)
Esplora — confirmado:    0 sat (0 UTXO) | pendente: 9719 sat (2 UTXO)
```

As contagens batiam. Só a classificação divergia. O nó chamava de `trusted` um
saldo que ele mesmo listava com zero confirmações — internamente coerente, e
incompatível com a régua do outro lado.

**Correção:** somar os valores do próprio `listunspent`, que traz `confirmations`
por UTXO — a mesma definição que o Esplora usa.

### O que funcionou

Nas três vezes, o script **recusou dizer `PROVADO`**. Ele não sabia por que os
números divergiam e, em vez de arredondar, parou e mandou investigar. É o
fail-closed fazendo o trabalho dele, e é a diferença entre um achado e um bug em
produção.

O que não funcionou foi o **diagnóstico**: a mensagem apontava rescan, faixa e
propagação — nenhum dos três, nas duas vezes. Uma mensagem de erro que aponta
para o lugar errado custa mais tempo que nenhuma mensagem. Corrigida junto.

## 7. Referências

- `docs/decisions/INTEROP-01-RECUPERACAO-INDEPENDENTE.md`
- `docs/decisions/BROADCAST-REAL-001-PRIMEIRA-TRANSMISSAO.md`
- `scripts/wallet-account-smoke.ts`, `scripts/lab-signet-flow.ts`
- https://mempool.space/signet/tx/fa108bf2dab6029b4f6559a2c1da4669881f9e8c26112c5b5d3c91f909d297e1

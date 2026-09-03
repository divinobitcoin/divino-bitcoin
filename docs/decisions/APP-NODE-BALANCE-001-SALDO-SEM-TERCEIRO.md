# APP-NODE-BALANCE-001 — o aplicativo lê o saldo do nó do próprio dono

**Data:** 03/09/2026
**Estado:** FECHADO para leitura de saldo em Signet, com as limitações da seção 6.
**Faixa:** LAB (`LAB-LANE-001`, L1/L2/L3). Signet, material descartável, valor
econômico zero.

---

## 1. O buraco que isto fecha

O projeto se descreve como descentralizado. O aplicativo, até hoje, perguntava
o saldo ao `mempool.space` (`app/dev/signet-watch.tsx`). Isso funciona e é `T4`
no threat model: **quem escolhe o servidor escolhe quem observa as consultas do
usuário.** Um servidor de terceiro que responde saldo sabe quais endereços
interessam a quem pergunta, de qual IP, e com que frequência — e isso liga
endereços entre si com muito mais eficiência do que a cadeia sozinha permite.

`NODE-PROPRIO-LEITURA-001` (29/08) já tinha provado que **o código** consegue
falar com o `bitcoind` do usuário. Mas quem falava era um script rodando em
Node, no computador. O aplicativo continuava perguntando ao terceiro.

Este documento registra a primeira vez em que **o aplicativo, no celular**,
leu o saldo do nó do próprio dono, e de mais ninguém.

## 2. O que foi exercitado

Tela `app/dev/signet-node-balance.tsx`, no Xiaomi Note 11, contra o
`bitcoind` do proprietário (`~/.bitcoin-divino-signet`, `chain=signet`), pela
rede local.

A tela recebe a chave estendida **pública** da conta, colada da PARTE 2 do
Recovery Kit, mais a data de nascimento da carteira e a credencial do RPC. Com
isso ela:

1. cria (ou carrega) no nó uma wallet `disable_private_keys=true`;
2. importa os dois descriptors — recebimento e troco — pedindo ao nó o checksum;
3. lê os UTXOs por `listunspent` e soma.

## 3. O resultado

| Campo | Valor |
|---|---|
| Confirmado | 131.448 sats |
| UTXOs confirmados | 2 |
| UTXOs pendentes | 0 |
| Endereços observados | 40 |
| Wallet no nó | `divino-conta-671e8db6` |
| Fonte | `http://192.168.15.5:38332` |

Os 40 endereços são 20 por ramo, recebimento e troco — o `RANGE_END = 19` do
código. O saldo é o mesmo que nó e Esplora concordaram em `PSBT-DERIV-001`,
depois da transação `ce7fe3ec…`.

## 4. Duas decisões de desenho que valem mais que o resultado

### A interface não deriva chave nenhuma, e não é por disciplina

`app/` é *runtime root* do `guard:lab-boundary`, e a ADR-0001 proíbe a interface
de derivar. O CI **reprova** um import de `shared/bip84-derivation` a partir de
`app/`. A consequência já estava escrita e agora foi paga: **a chave estendida
da conta tem de chegar pronta.** Hoje ela chega colada pelo usuário; amanhã, do
cofre nativo. É a mesma costura do PSBT aplicada à leitura — a tela monta e
revisa, outro produz o material sensível.

### Uma wallet do Core por conta, para não precisar filtrar

`SMOKE-MULTICONTA-001` mostrou que `listunspent` responde pela **wallet inteira**
do Core, não pela conta. O `wallet-account-smoke.ts` resolveu filtrando pelos
endereços da própria conta — o que exige derivá-los, e a interface não pode.

A tela **evita o problema em vez de resolvê-lo**: o nome da wallet no nó é um
hash do próprio xpub (`nomeDeWalletParaXpub`). Se a wallet contém apenas aquela
conta, `listunspent` já *é* a conta, e não há o que filtrar. Hash de string não
é derivação de chave, e por isso `shared/account-xpub.ts` pode morar num runtime
root.

O nome é determinístico de propósito: a mesma conta reaberta amanhã cai na mesma
wallet, e o import é idempotente (`RANGE-SHRINK-001`).

## 5. Três achados apareceram no caminho, e nenhum em teste unitário

Os três passaram pelas quatro validações com a suíte verde. Só o aparelho
mostrou — a mesma lição do bug dos botões invisíveis.

### `KIT-NODE-API-001` — `Buffer` não existe no React Native

O cabeçalho Basic auth era montado com `Buffer.from(...).toString("base64")`.
`Buffer` é global do **Node.js**; no runtime do React Native (Hermes) ele não
existe. O `vitest` roda em Node, onde existe. O `tsc` aprova porque
`@types/node` promete que existe. O `lint` não tem opinião. O guard cuida de
outra coisa.

Corrigido com `@scure/base` em três módulos. Um deles, `psbt-parser.ts`, estava
**latente**: o caminho de leitura de PSBT nunca tinha sido exercitado no
aparelho, embora a tela "Enviar em Signet" constasse como verificada desde
27/08. `tests/runtime-sem-buffer.test.ts` impede a volta.

### `NODE-AUTH-BLIND-001` — o 401 vinha mudo

`RPC-HTTP-STATUS-001` estabeleceu que o Core põe o erro real no corpo JSON-RPC e
devolve HTTP 500. **O 401 escapa dessa regra**: é gerado antes de qualquer
processamento de RPC, e o corpo vem vazio. Não havia mensagem do nó para
repassar, e a tela só sabia dizer "status HTTP 401, sem corpo legível".

Diagnosticar isso era impossível: a credencial é digitada num campo que esconde
o que foi escrito. A mensagem passou a informar o usuário enviado, entre aspas
angulares — para espaço nas pontas aparecer — e o **tamanho** da senha. Nunca a
senha.

### `AUTOFILL-LEAK-001` — o campo foi capturado pelo gerenciador do Google

Documento próprio. É o achado mais grave dos três, e o único que não tem nada a
ver com Bitcoin.

## 6. O que isto NÃO prova

**Não prova nada sobre produção.** O transporte é RPC do Core por HTTP na rede
local: **sem TLS**, com Basic auth legível para quem estiver na mesma rede, e
usando a interface de **administrador** do nó, não uma de menor privilégio. A
exceção de texto claro no Android existe só no build de depuração
(`plugins/with-lan-cleartext-debug.js`), para um endereço nomeado. Produção
exige Tor ou túnel autenticado, e isso continua **não decidido**
(`NODE-TRANSPORT-001`).

**Não prova nada sobre Mainnet.** `G-MAINNET` e `G-VALOR` continuam fechados.

**Não prova nada sobre iOS**, sobre o cofre nativo, nem sobre seed real.

**Não substitui auditoria.** Uma leitura correta não diz nada sobre a segurança
do caminho de assinatura.

**A credencial ainda é digitada à mão no telefone.** É o que produziu duas das
três falhas desta sessão. Registrado como `CRED-DIGITADA-001`, não resolvido.

## 7. O que fica verdadeiro depois disto

Uma frase, e só ela:

> A carteira consegue saber o próprio saldo perguntando ao nó do dono, sem
> consultar servidor de terceiro nenhum.

Em Signet, com xpub colado, em build de depuração, na rede local de casa.

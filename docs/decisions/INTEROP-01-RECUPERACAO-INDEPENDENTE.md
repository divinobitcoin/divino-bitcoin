# INTEROP-01 — recuperação por implementação independente

**Data:** 01/09/2026
**Estado:** FECHADO para singlesig BIP-84 em Signet, com as limitações declaradas na seção 4.
**Faixa:** LAB (`LAB-LANE-001`, L1/L2/L3). Signet, material descartável, valor econômico zero.

---

## 1. O que se queria provar

A pesquisa de soberania de saída (25/08/2026) propõe `INTEROP-01`: antes de
Mainnet, a recuperação precisa ser testada em **pelo menos duas implementações
independentes**, sendo uma delas ferramenta de referência.

Metade já existia. `scripts/wallet-account-smoke.ts` provou, em 31/08 e 01/09,
que o Bitcoin Core encontra a conta a partir dos descriptors. Isso é **uma**
implementação — e é a nossa, no nosso nó, chamada pelo nosso código. Concordar
consigo mesmo não é evidência.

Faltava a segunda: outro software, escrito por outra pessoa, recebendo **apenas
o que está impresso no Recovery Kit**, chegando na mesma conta.

## 2. O que foi feito

**Ferramenta:** Sparrow Wallet 2.5.4, arquivo `.tar.gz` autônomo (sem instalação
com privilégio de sistema, conforme a política do projeto para a máquina onde
vive o nó Mainnet pessoal).

**Autenticidade do binário verificada antes de executar**, nesta ordem:

1. `gpg --verify` do manifesto contra a assinatura → `Assinatura correta de
   "Craig Raw <craig@sparrowwallet.com>"`.
2. Fingerprint conferida em duas fontes (site oficial e README do repositório):
   `D4D0D3202FC06849A257B38DE94618334C674B40`.
3. `sha256sum -c` do `.tar.gz` contra o manifesto assinado → `OK`.

A ordem importa: a assinatura prova que o **manifesto** é do autor; só o
`sha256sum` liga o manifesto ao **arquivo no disco**. Um sem o outro não vale.

**Configuração:** rede Signet (confirmada por três sinais independentes — a
porta 38332 preenchida automaticamente, a ausência de "Signet" no menu
`Restart In`, e o rótulo "Signet" na própria janela). Servidor: Bitcoin Core do
próprio usuário, banner `/Satoshi:31.0.0/`.

**Carteira criada:** `Single Signature HD`, `Native Segwit (P2WPKH)`, keystore
`Watch Only Wallet`.

**Entradas — só material do kit:**

| Campo | Valor |
|---|---|
| Master fingerprint | `23f64ff8` |
| Derivation path | `m/84'/1'/0'` |
| Chave estendida da conta | `tpub…` (a mesma que o nó guarda) |
| Birthday | `2026-08-25` |
| Tem transações anteriores | sim |

## 3. Resultado

| Campo | Valor |
|---|---|
| Saldo | **10.000 sat** |
| UTXOs | **1** |
| Data da transação | 2026-08-31 20:55 |
| Saída | `534ef367…:0` |
| Endereço | `tb1q4mn0lhswrqlfmueylk2mqzcm2qzeujuk4hdf4t` |

O endereço é exatamente o `m/84'/1'/0'/0/0` impresso pelo Recovery Kit e pelo
`wallet-account-smoke.ts`. Três produtores independentes do mesmo endereço:
o nosso derivador, o `shared/bip84-derivation` (teste de concordância, commit
`0613d7f`) e o Sparrow.

## 4. O que isto NÃO prova

**Os dados da cadeia não são independentes.** O Sparrow leu do **mesmo**
`bitcoind`. O que foi exercitado de forma independente é a **derivação e a
interpretação do descriptor** — que é a parte que responde "outro programa acha
minhas moedas?". Um nó mentiroso enganaria os dois igual. Fechar essa dimensão
exige uma segunda fonte de cadeia, e não foi feito.

**Não houve gasto.** Carteira watch-only, nenhuma assinatura produzida pelo
Sparrow. `INTEROP-01` está fechado para **descoberta**, não para **gasto**.

**`KIT-MNEMONIC-001` continua aberto.** A conta nasceu de entropia hex, não de
mnemonic BIP-39, porque a ferramenta de laboratório recusa mnemonic de
propósito. O que o usuário final vai guardar são palavras, e esse formato **não
foi testado**. Nenhuma promessa pública de recuperabilidade antes disso.

**A chave estendida veio do nó, não do papel.** Na hora do teste o kit impresso
não estava à mão (ver seção 5), e a `tpub` foi lida de `listdescriptors`. Isso
não invalida o resultado — o endereço que o Sparrow mostrou bate com o que o kit
imprimiu, o que amarra os dois — mas a versão purista do teste, partindo só do
papel, ainda não foi feita.

Nada aqui diz respeito a Mainnet, cofre nativo, iOS ou à interface. Não
substitui auditoria externa.

## 5. `LAB-SEED-VOLATIL-001` — o achado não planejado

Durante o teste, **a seed da conta foi perdida**.

Ela havia sido gerada com `export DIVINO_LAB_SEED=$(node -e "…randomBytes…")`.
O valor nunca foi escrito em disco — por desenho: o comentário de
`scripts/lab-signet-flow.ts` chama isso de disciplina correta, e é, contra
vazamento. A consequência não estava escrita em lugar nenhum: **o valor também
nunca foi escrito no histórico**, só o comando que o gera, e `randomBytes`
produz outro a cada execução. Quando os terminais foram fechados, a seed deixou
de existir.

Os 10.000 sat desta conta são, a partir de agora, **permanentemente
inacessíveis**.

O custo real é zero — é moeda de faucet. O valor do achado não é.

**Fundos ficaram irrecuperáveis sem ataque nenhum.** Sem invasor, sem defeito de
código, sem servidor mentindo, sem chave vazada. Uma janela de terminal fechou.
É metade do risco de uma carteira autocustodiada, e é a metade sobre a qual quase
não se escreve.

E há uma simetria que vale registrar, porque é a arquitetura do projeto se
comportando como projetada:

- o material **privado** vivia só na memória de um processo — sumiu;
- o material **público** havia sido entregue ao nó — sobreviveu, e permitiu que
  uma ferramenta de terceiro reconstruísse a visão da conta.

É o enunciado da pesquisa acontecendo por acidente, na direção inversa da
prevista: não foi a Divino que deixou de existir, foi a seed. A parte pública
continuou de pé.

**Ações decorrentes:**

1. `scripts/lab-signet-flow.ts new-seed` deve avisar, na saída, que a seed só
   existe em RAM e que fechar o terminal a destrói.
2. O Recovery Kit deve ser gravado em arquivo **antes** de a conta ser usada, e
   fora do repositório (um `git add .` distraído publicaria o `tprv`).
3. A conta desta evidência não pode ser reutilizada para a rodada de troco. Seed
   nova, salva antes do uso, faucet novo.

## 6. Referências

- Pesquisa comparativa de autocustódia e soberania de saída, 25/08/2026 —
  `INTEROP-01`, `RECOVERY-01`, Teste A e Teste B.
- `scripts/recovery-kit.ts` — gerador do kit.
- `scripts/wallet-account-smoke.ts` — a primeira implementação.
- `docs/decisions/BROADCAST-REAL-001-PRIMEIRA-TRANSMISSAO.md` — evidência anterior.
- Sparrow Wallet: https://sparrowwallet.com/download/

# PSBT-DERIV-001 — a PSBT passa a carregar a origem das chaves

**Data:** 03/09/2026
**Estado:** **FECHADO para construção e rede.** Aberto para assinador externo.
**Commits:** `9331858` (campo e recusas) e `08ecd88` (laboratório preenche),
sobre o baseline `dd12df9`. Push confirmado por `git fetch`: `origin/main` =
`c5fef13`.

---

## O que estava faltando

`shared/psbt-builder.ts` montava PSBTs sem o campo `bip32Derivation`. O próprio
cabeçalho do arquivo declarava a omissão, com a justificativa de que preencher
antes de existir assinador seria "enviar campo cuja forma não foi testada
contra assinador nenhum".

A justificativa parecia prudente e estava invertida. Enquanto o campo não
existisse, **nenhum assinador externo podia ser exercitado** — porque sem ele o
assinador não tem como saber qual chave derivar para cada entrada. Ele não erra:
recusa. A ausência do campo não era espera pelo assinador; era o que impedia o
assinador de existir.

Isso ficou explícito quando a Emenda 2 da ADR-0001 listou as condições de
`EXTERNAL_HARDWARE`: `PSBT-DERIV-001` é a condição `E1`, e é bloqueante.

## O que foi feito

O campo é **opcional** no módulo, e duas regras impedem o preenchimento pela
metade — que seria pior que a ausência.

### Regra 1 — tudo ou nada nas entradas

Uma PSBT com derivação em algumas entradas faz o assinador externo assinar o que
reconhece e devolver o resto **em silêncio**. Quem vê "assinada" transmite algo
inválido. O construtor recusa montar nesse caso.

### Regra 2 — a chave pública é conferida contra o endereço

`hash160(chave pública)` tem de bater com o programa de 20 bytes do script
P2WPKH. Sem essa conferência, o módulo estaria repassando adiante a palavra de
quem chamou; com ela, uma chave trocada — por engano ou por ataque — é recusada
**na montagem**, na máquina de quem monta, e não descoberta no aparelho do
usuário na hora de assinar.

A conferência é igualdade de hash, **não derivação**. Por isso cabe em
`shared/`, que é *runtime root*, onde derivar é proibido pela ADR-0001. O
`guard:lab-boundary` continua `PASS`.

### O troco também carrega origem, e isso é segurança

Sem `bip32Derivation` na saída de troco, um assinador externo honesto só consegue
dizer *"sai X para o destino e Y para um endereço que eu não reconheço"*. Trocar
o endereço de troco pelo do atacante é o golpe clássico contra assinador cego, e
o usuário confirma achando que está devolvendo dinheiro para si mesmo.

Com o campo, o dispositivo deriva o caminho e **confere sozinho**.

## Codificação: verificada, não presumida

A BIP-174 grava a fingerprint da mestra como 4 bytes **na ordem em que ela é
escrita**, e cada índice do caminho em 32 bits **little-endian**.

O `@scure/btc-signer` 2.3.0 modela isso como `{ fingerprint: number, path:
number[] }`, com `P.U32BE` para a fingerprint e `P.U32LE` para os índices —
lido no coder da biblioteca e confirmado montando uma PSBT e procurando a
fingerprint nos bytes crus.

Há teste olhando os bytes crus **de propósito**: um round-trip pela mesma
biblioteca inverteria de volta e esconderia o erro. Foi exatamente assim que
`TPUB-SERIAL-001` sobreviveu a 24 testes verdes e só apareceu contra o nó real.

## Evidência de rede

Transação transmitida pelo `bitcoind` do próprio usuário, com `--via-node`.

```
txid       ce7fe3ecb0f8b430b0b595dcb40756a827d886eea606014d9f4d3ff09522e3d2
entrada    131.729 sat   tb1q6cjfaxg7z2g9jskcneex6hnvx23a43j48l2dd0   (m/84'/1'/0'/0/0)
saída 0     20.000 sat   tb1qp54rwlqklnsl9tk7q4knjgy33hcek3kqe76h6e   (m/84'/1'/0'/0/1)
saída 1    111.448 sat   tb1qdc3euqp7shtgrf3ya9a6epzqhmh2tljpyu7ang   (m/84'/1'/0'/1/0)
taxa           281 sat
tamanho        141 vB estimado = 141 vB real
```

`20.000 + 111.448 + 281 = 131.729` — a invariante de fechamento, verificada em
execução.

**Determinismo confirmado antes de transmitir.** A mesma transação foi montada e
assinada duas vezes num sandbox isolado e produziu bytes idênticos (RFC 6979). A
previsão foi declarada antes do broadcast: o txid da transmissão teria de ser o
mesmo da revisão a seco. Foi. Isso significa que os bytes aceitos pelo nó são
exatamente os que o usuário revisou — não uma segunda versão parecida.

**Depois da confirmação**, `scripts/wallet-account-smoke.ts`:

```
Nó      — confirmado: 131448 sat (2 UTXO) | pendente: 0 sat (0 UTXO)
Esplora — confirmado: 131448 sat (2 UTXO) | pendente: 0 sat (0 UTXO)   [20 endereços]
```

Veredito `PROVADO`.

## Três coisas novas nesta rodada

1. **`bip32Derivation` em rede real**, nas entradas e no troco.
2. **Zero reúso de endereço.** No `RAMO-TROCO-001` as duas saídas foram para o
   mesmo endereço, e ficou registrado como defeito de privacidade. Aqui destino
   e troco são endereços distintos, cada um usado uma vez.
3. **A conta nasceu de mnemonic BIP-39.** Todo o histórico anterior de evidência
   de rede era de contas nascidas de entropia hexadecimal (`KIT-MNEMONIC-001`).

## O que NÃO foi provado

**Nenhum assinador externo real recebeu esta PSBT.** O nó aceitou a transação,
mas o nó não lê `bip32Derivation` — ele lê a assinatura pronta. O campo pode
estar sintaticamente correto e ainda assim ser recusado por um dispositivo por
razão que não conhecemos.

Fechar essa metade é a condição `E3` da Emenda 2 da ADR-0001, e exige um
Coldcard, SeedSigner, Jade ou equivalente. **Continua aberta.**

Também não prova nada sobre Mainnet, cofre nativo, iOS ou a interface. Não
substitui auditoria externa. `WF-F10`: este código é **permitido**, não
**auditado**.

## Achado que saiu desta rodada

**`SMOKE-ESPLORA-CRASH-001`** — numa das execuções, o `mempool.space` não
respondeu e `scripts/wallet-account-smoke.ts` morreu com `TypeError: fetch
failed` e um *stack trace*, **depois** de já ter obtido a resposta do nó do
próprio usuário.

O comportamento correto é dizer *"o nó respondeu isto; a segunda fonte não
estava disponível; sem segunda fonte eu não digo PROVADO"* — fail-closed com
explicação, em vez de fail-closed com entulho.

Falha de terceiro é condição normal de operação, não exceção. E é a mesma classe
de defeito que, no aplicativo, mostraria uma tela quebrada em vez de "não
consegui falar com o servidor". **Aberto.**

## Cobertura

`tests/psbt-builder-bip32-derivation.test.ts`, 16 testes. A maioria sobre as
**recusas**, não sobre o preenchimento: chave que não bate com o endereço,
derivação parcial, chave não comprimida, fingerprint malformada, caminho
malformado, `m` sozinho, `changeDerivation` sem troco. Há também um teste de que
`m/84h/...` e `m/84'/...` produzem a mesma PSBT byte por byte.

Suíte: `328 passed | 1 skipped`. `TEST/LAB BOUNDARY: PASS`.

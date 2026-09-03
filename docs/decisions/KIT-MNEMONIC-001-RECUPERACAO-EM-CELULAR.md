# KIT-MNEMONIC-001 — as doze palavras recuperadas num celular

**Data:** 03/09/2026
**Estado:** **FECHADO para derivação.** Aberto para visibilidade de cadeia.
**Baseline:** `3dff9d0`

---

## A pergunta

O Recovery Kit da Divino imprime doze palavras BIP-39. A pergunta que bloqueava
qualquer promessa pública de recuperabilidade era simples e nunca tinha sido
respondida:

> **Uma carteira de celular real, escrita por outra gente, consegue consumir
> essas palavras e chegar na mesma conta?**

Enquanto isso não fosse exercitado num aparelho, o projeto tinha um asterisco
escondido: *"recuperável, desde que você tenha um PC com Node instalado"*.

## O resultado

**Bateu, caractere por caractere.**

```
Endereço mostrado pelo Blockstream Green (Android, Testnet, Receber):
  tb1q6cjfaxg7z2g9jskcneex6hnvx23a43j48l2dd0

Endereço que o Recovery Kit prevê em m/84'/1'/0'/0/0:
  tb1q6cjfaxg7z2g9jskcneex6hnvx23a43j48l2dd0

cmp: idênticos · sha256 idêntico · 42 caracteres
```

A comparação foi feita por `cmp` e por hash, **não a olho**. Conferir 42
caracteres visualmente é como o caso 9 aconteceu.

### O que isso prova

Doze palavras geradas pela **nossa** ferramenta, **transcritas à mão** pelo
proprietário — sem foto, sem cópia digital —, digitadas num **aplicativo de
terceiro**, num **outro aparelho**, produziram **exatamente** o endereço que o
nosso kit prevê.

A corrente inteira concorda com uma implementação independente:

```
mnemonic BIP-39 → seed por PBKDF2 → BIP-32 → conta BIP-84 → P2WPKH
```

De um lado, TypeScript com `@scure`. Do outro, o GDK da Blockstream, núcleo
nativo em C++. Linguagens diferentes, autores diferentes, mesmo endereço.

**Duas implementações independentes concordando é evidência. Uma só é
autoconfirmação.** A frase está no cabeçalho do `recovery-kit.ts` desde que ele
foi escrito; agora foi cumprida.

Isto é diferente do `INTEROP-01`, que fechou em 01/09: lá a recuperação foi por
**xpub e descriptor** no Sparrow, material público de nível de conta. Aqui foi
pelas **palavras**, que é o que o usuário final guarda.

### O que isso NÃO prova

**O saldo não apareceu.** A carteira mostrou `0 TEST`.

Isso é esperado e **não é defeito do kit**: o Green estava perguntando a um
servidor Electrum de **testnet**, e os fundos estão na **Signet**. Signet e
testnet compartilham `coin_type = 1'`, o prefixo `tb1` e a derivação inteira —
por isso o endereço bate — mas são cadeias diferentes, com blocos diferentes.

A derivação é nossa e está provada. **Qual cadeia o aplicativo enxerga é
configuração de servidor, e não passa pelo nosso código.**

Também não prova: gasto a partir do celular; nada sobre Mainnet, cofre nativo ou
iOS; e não substitui auditoria.

---

## Ambiente do teste

| | |
|---|---|
| Aplicativo | Blockstream App (Green), Android |
| Versão | **5.6.1** — lida pelo proprietário em Configurações → Sobre → Versão |
| Aparelho | Xiaomi Note 11 |
| Rede escolhida | Testnet |
| Conta criada | "Account: Standard" |
| Origem das palavras | `~/recovery-kit-mnemonic.txt`, transcritas à mão |
| Conta de laboratório | 131.448 sat em 2 UTXOs, ramos 0 e 1, na Signet |

---

## O caminho que o usuário teve de descobrir

Registrado porque **é o achado de produto mais caro do teste**.

1. Tela inicial → menu **⋮** → **Configurações do app** *(Applies to every wallet)*
2. Dentro dela, entre Tor, proxy, dispositivos de hardware e telemetria:
   **Enable Testnet** — *"Allow testnet wallets"*
3. Voltar → **Começar** → **Set Up Mobile Wallet** / **Restaurar do backup**
4. **Só então** aparece **"Selecionar rede: Mainnet / Testnet"**

### `GREEN-REDE-OCULTA-001` — a escolha de rede não existe até um interruptor global ser ligado

Sem o `Enable Testnet`, a tela "Selecionar rede" **simplesmente não aparece**, e
a restauração cai onde o aplicativo decidir.

**Foi o que aconteceu na primeira tentativa.** O proprietário completou um fluxo
de restauração inteiro, sem errar um passo, e terminou numa carteira **Liquid
mainnet** — endereço `lq1q…`, URI `liquidnetwork:`, saldo `0,00 USD`. Nenhum
aviso, em nenhum momento, de que aquela não era a rede das palavras dele.

Em nenhum ponto do fluxo o aplicativo perguntou rede, script type ou derivation
path.

**A consequência, se aquelas palavras fossem dinheiro real:** a pessoa olharia
um saldo zero e concluiria que perdeu tudo. É exatamente o cenário que a
**PARTE 2 do nosso Recovery Kit** existe para evitar.

**Regra que sai daqui, para a Divino:** a rede pertence ao **fluxo de
restauração**, na frente, no momento em que as palavras entram — nunca atrás de
um interruptor global que o usuário não sabe que existe. Uma pessoa recuperando
fundos sob estresse não vasculha menu de configurações antes de digitar.

---

## `MOBILE-SIGNET-001` — Signet praticamente não existe em carteira de celular

Levantamento feito no aparelho e na documentação, não em fórum:

| Carteira | Signet | Como foi verificado |
|---|---|---|
| Zeus | **não** — Mainnet, Testnet, Multipeer | observado no aparelho, 01/09 |
| BlueWallet | **não documentado** — a wiki oficial de tipos de carteira não menciona testnet nem signet | documentação, 03/09 |
| Blockstream Green | **não** — "Selecionar rede" oferece só Mainnet e Testnet | observado no aparelho, 03/09 |

**Isto refuta a alegação de comunidade** trazida em 03/09, de que dava para usar
Signet no Green apontando um "Personal Electrum Server". A opção
`Servidor pessoal Electrum — "Use your own server"` **existe** (junto de
`Custom Server Gap Limit — Number of unused addresses to scan. Default: 20`),
mas a **rede** continua sendo uma escolha de duas, e Signet não está entre elas.

Se essa configuração pode fazer uma carteira "Testnet" enxergar a cadeia Signet
— já que a derivação é a mesma — **não foi testado**, e continua como hipótese.

**Consequência de arquitetura:** a prova de recuperação **com saldo visível** num
celular exige (a) um servidor Electrum servindo Signet, (b) mudar o laboratório
para testnet, ou (c) aceitar que essa metade só fecha em Mainnet. Nenhuma das
três é decisão para tomar por impulso.

---

## O teclado filtrado pela wordlist — recurso a copiar

Observado quadro a quadro. Com `middl` digitado, **apenas a letra `e` estava
acesa**; as outras 25 estavam apagadas.

O aplicativo filtra o teclado pela **lista de palavras BIP-39**: a cada letra,
calcula quais palavras ainda são possíveis com aquele prefixo e desabilita toda
letra que não leva a nenhuma. Depois de `middl`, a única palavra da lista é
`middle`.

**O que previne:** digitar uma palavra que não existe na lista. Erro de leitura,
letra trocada, palavra inventada — barrados letra por letra, na hora.

**O que NÃO previne:** uma palavra que existe mas é a errada. Se o papel diz
`bridge` e a pessoa digita `brief`, as duas estão na lista e o teclado deixa
passar. Quem pega isso é o **checksum**, no fim.

**São duas camadas distintas, e as duas valem cópia.** A nossa
`lerMnemonicDoAmbiente` já faz a segunda; a primeira é de interface e ainda não
existe.

Vale registrar também: seletor de **12 / 24 / 27** palavras, e botões **Colar** e
**Ler código QR** na mesma tela.

---

## Hipótese declarada e REFUTADA

Antes de o proprietário olhar o endereço, ficou registrado:

> **Hipótese:** "Account: Standard" no Green é a conta **2-de-2 multisig**
> co-assinada pelo servidor da Blockstream, não uma singlesig BIP-84. Se for,
> o endereço **não** vai bater, e as doze palavras sozinhas não controlam
> aquele endereço.
>
> **Condição de refutação:** o endereço bater com o do kit.

**Refutada.** O endereço bateu. A conta Standard, restaurada por mnemonic com
rede Testnet, é singlesig BIP-84 em `m/84'/1'/0'`.

Fica registrado porque **a hipótese foi declarada com a sua condição de
refutação antes do resultado**, que é a única forma de errar de maneira útil.

---

## Disciplina: material queimado

As doze palavras desta conta **foram filmadas e o vídeo atravessou a internet**.
São públicas. Qualquer pessoa que veja a gravação pode gastar os 131.448 sat.

Aceitável: moeda de Signet, valor econômico zero, condições `L2` e `L3` da faixa
`LAB-LANE-001`. **A conta está queimada e não deve ser reutilizada fora do
laboratório.**

Registrado também que a primeira tentativa restaurou essas mesmas palavras numa
conta **Liquid mainnet**. Nada foi enviado para lá. Palavras não sabem em que
rede vivem — é mais uma razão para nunca filmar as de verdade.

---

## Estado do achado

| Dimensão | Estado |
|---|---|
| A carteira de celular aceita as palavras (checksum) | **PROVADO** |
| A derivação bate com implementação independente | **PROVADO** |
| O saldo aparece no celular | **ABERTO** — depende de servidor Electrum de Signet |
| Gastar a partir do celular | **ABERTO** |

**Nenhuma promessa pública de recuperabilidade ainda**, e a razão agora é
específica e pequena: falta a metade de visibilidade de cadeia. A metade que era
sobre **nós** está fechada.

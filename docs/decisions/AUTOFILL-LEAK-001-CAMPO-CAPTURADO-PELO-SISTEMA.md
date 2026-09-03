# AUTOFILL-LEAK-001 — material de carteira saiu do aparelho pelo autofill

**Data:** 03/09/2026
**Estado:** FECHADO em código e verificado em aparelho. Ver seção 6 para o que
continua aberto.
**Faixa:** LAB, mas **o achado não é de laboratório** — o defeito estava em
código de interface que iria para produção.

---

## 1. O que aconteceu

A tela `app/dev/signet-node-balance.tsx` devolvia HTTP 401 ao ler saldo. O nó
estava certo: um `curl` do mesmo IP de rede local, com a credencial lida do
`bitcoin.conf`, respondeu `200` no loopback **e** `200` na rede local.

Instrumentado o 401 (`NODE-AUTH-BLIND-001`), a mensagem passou a informar o
usuário enviado e o tamanho da senha. Os dois batiam: `divino_signet_rpc`, 17
caracteres; senha, 6 caracteres. Nenhum espaço nas pontas.

Um botão de revelar a senha, acrescentado no mesmo patch, mostrou o valor:
`0r4c40`, com `r` minúsculo. A senha do nó é `0R4c40`, com `R` maiúsculo.

Perguntado como o valor errado chegou ali, o proprietário respondeu:

> *"apareceu um preenchimento automático do Google, e eu confiei nesse
> preenchimento automático. Ele veio com a senha minúscula."*

**O erro de digitação foi o sintoma. O achado é que o valor estava guardado.**

## 2. Por que isto é grave

O gerenciador de senhas do Google tinha capturado o campo de senha do RPC numa
digitação anterior e sincronizado o valor na conta Google do proprietário.

O princípio inegociável deste projeto é que **material sensível não sai do
dispositivo**. `RECOVERY-EXIT-001`, Emenda 1, fechou nuvem e transferência
aparelho-a-aparelho para material de cofre. Ninguém tinha olhado para o caminho
de saída mais banal que existe num aplicativo Android: o campo de texto.

`secureTextEntry` esconde o texto na tela. Ele **não** impede o Android de
expor o campo ao serviço de autofill. São duas coisas diferentes, e
confundi-las era o defeito.

### O campo de senha era o menos valioso da tela

A senha do RPC de um nó de Signet vale pouco: sem TLS, na rede local, sem chave
de gasto atrás dela. O resto da mesma tela vale muito:

- **A chave estendida pública da conta** revela *todos* os endereços da
  carteira, passados e futuros. Um xpub no gerenciador de senhas de um terceiro
  é o histórico inteiro da carteira num servidor que não é do usuário. Ele não
  gasta nada — e privacidade não é uma propriedade menor numa carteira Bitcoin.
- **Endereço de destino e valor**, nas telas de envio, descrevem para quem o
  usuário paga e quanto.
- **Uma PSBT** carrega entradas, saídas e troco.

Numa carteira, o autofill é conveniência para quem preenche formulário de site
e superfície de vazamento para quem digita material de carteira. O padrão
correto é o oposto do padrão da web.

## 3. A correção

Entra `components/campo-texto.tsx`, um campo que já nasce com três propriedades:

| Propriedade | Plataforma | Papel |
|---|---|---|
| `importantForAutofill="no"` | Android | É a que teria impedido o caso real |
| `autoComplete="off"` | ambas | Sem ela o sistema adivinha o tipo do campo por heurística |
| `textContentType="none"` | iOS | Mesma intenção, **não verificada** |

As três foram conferidas na tipagem do React Native 0.83.10 deste repositório,
não escritas de memória.

**Elas vêm depois do repasse de propriedades**, de propósito: assim nenhuma
chamada consegue reativar o autofill por engano passando a propriedade de volta.
É garantia, não convenção.

Os 19 campos das 7 telas passaram a usar o componente.

## 4. Por que um componente e um teste, e não uma revisão de código

Porque "lembrar de pôr a propriedade" falha na próxima tela. É a mesma escolha
do `guard:lab-boundary` e do `tests/runtime-sem-buffer.test.ts`: quando uma
propriedade de segurança depende de disciplina humana, ela se perde.

`tests/campos-sem-autofill.test.ts` reprova `<TextInput` cru dentro de `app/`, e
também verifica que o componente continua carregando as três propriedades
**depois** do spread — sem essa segunda parte, apagar uma delas passaria verde.

**O teste foi verificado falhando** antes de entrar: um `TextInput` cru foi
recolocado de propósito numa tela, o teste reprovou apontando o arquivo, e a
tela foi restaurada. Teste que nunca falhou não prova nada.

## 5. Verificação em aparelho

Xiaomi Note 11, 03/09/2026, depois do patch: a senha nova de 24 caracteres foi
digitada no campo, o saldo foi lido, e **o Google não ofereceu preenchimento nem
perguntou "salvar senha?" ao sair da tela** — comportamento que ocorria antes.
A tela "Enviar em Signet", cujos 6 campos também foram trocados, continuou
aceitando entrada normalmente.

Este passo é distinto das quatro validações. Nenhuma delas renderiza nada, e
nenhuma delas sabe o que o gerenciador de senhas do sistema faz.

## 6. O que continua aberto

**A entrada já salva.** O código impede novas capturas; o valor que já estava na
conta Google continuava lá e teve de ser apagado à mão. Correção de código não
apaga o que já vazou.

**A senha comprometida.** `0R4c40` apareceu em capturas de tela, em vídeo, no
gerenciador do Google e em conversa. Foi rotacionada em 03/09 para 24 letras
minúsculas sorteadas de `/dev/urandom`. O nó foi reiniciado e respondeu `200`.

**`CRED-DIGITADA-001` — a correção de fundo, não feita.** Este patch fecha um
caminho de saída. Ele não resolve que a tela **pede um segredo digitado à mão
num celular**. Teclado de terceiro continua vendo o que é digitado, inclusive em
campo de senha; captura de tela continua possível; e a revelação da senha, que
foi o que diagnosticou o 401, é ela própria uma exposição.

O desenho certo é não digitar: o computador exibe um QR, o celular lê. Isso
elimina o erro de transcrição, o autofill e a senha na tela de uma vez.

**iOS não foi verificado.** `textContentType` entra pelo mesmo motivo que a
propriedade do Android, e sem nenhuma alegação de que funciona lá (`WF-F10`).

**Teclados de terceiro não são cobertos.** Um teclado instalado pelo usuário lê
tudo que passa por ele. Nenhuma propriedade de campo muda isso.

## 7. A regra que fica

> Nenhum campo de texto de uma carteira é oferecido ao preenchimento automático
> do sistema — **nem os que não parecem sensíveis**.

E o corolário sobre senhas escolhidas por humano, que saiu da mesma conversa:
`0R4c40` é "ORAÇÃO" em *leet*. Substituição de tipo `o→0`, `a→4` é a primeira
regra de qualquer conjunto padrão de quebra de senha — vem pronta na instalação
do `hashcat`. Uma senha assim não vale seu comprimento em caracteres; vale a
posição da palavra numa lista.

**Consequência de projeto:** se a Divino um dia oferecer a *passphrase* opcional
da BIP-39, o usuário médio escolherá exatamente esse tipo de senha e acreditará
estar protegido. É mais uma razão para a seed ser **sorteada, nunca escolhida**:
entropia de máquina não negocia com a intuição humana sobre o que parece
difícil.

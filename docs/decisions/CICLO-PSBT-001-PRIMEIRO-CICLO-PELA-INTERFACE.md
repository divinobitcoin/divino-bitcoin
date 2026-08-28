# CICLO-PSBT-001 — Primeiro ciclo PSBT completo pela interface

**Status:** `EVIDÊNCIA REGISTRADA — SIGN-EXTERNO-001 fechado`
**Data:** 28 de agosto de 2026
**Rede:** Signet
**Valor econômico:** zero

---

## O que foi feito

Uma transação foi **montada no celular, assinada em outra máquina, revisada no celular a partir dos próprios bytes, e transmitida pelo celular**. O nó da Signet aceitou.

É a primeira vez que o fluxo PSBT roda inteiro pela interface. Até aqui, o caminho on-chain só tinha sido exercitado pela ferramenta de linha de comando, que monta e assina no mesmo processo — o que não prova separação nenhuma.

| Campo | Valor |
|---|---|
| Txid | `12ebcef87ceff30efd2f9283ba5820ba4a88f4e199e641030f5dc11cb601f476` |
| Entrada | `c0ba3f1caa8d8e30a71b8cd1cc67f40b71d5faf79bc8acc7a4532b5dcf823509:1` (1.000 sat, de faucet) |
| Saída de destino | 350 sat |
| Saída de troco | 369 sat |
| Taxa | 281 sat |
| Peso | 561 → 141 vB |
| Sequence | `0xfffffffd` (RBF sinalizado) |
| Forma | 1 entrada, 2 saídas, tudo P2WPKH |

Aceita na mempool às 15:35. Confirmação em bloco pendente no momento desta escrita — ver "Sobre confirmação", abaixo.

### O caminho, e em que máquina cada passo rodou

| Passo | Onde | Módulo |
|---|---|---|
| Ler UTXOs | celular | `shared/esplora-client` |
| Selecionar moedas, estimar taxa | celular | `shared/coin-selection` |
| Montar PSBT | celular | `shared/psbt-builder` |
| **Assinar** | **Dell, outro processo** | `scripts/lab-signet-flow.ts sign` |
| Finalizar e revisar pelos bytes | celular | `shared/transaction-broadcast` |
| Transmitir | celular | `shared/transaction-broadcast` |

A PSBT atravessou a fronteira entre as duas máquinas duas vezes, copiada e colada à mão.

---

## O que isto estabelece

1. **A interface nunca teve a chave privada, e isso agora é observado, não declarado.** A assinatura foi produzida por um processo em outro computador. `app/` é um dos *runtime roots* do `pnpm guard:lab-boundary` e não pode importar `shared/psbt-signer` — o CI reprova se alguém tentar. A ADR-0001 deixou de ser texto e virou comportamento verificado.

2. **O fluxo PSBT é praticável, não só correto no papel.** Montar em um lugar, assinar em outro e transmitir de volta funcionou com cópia e cola manual, no cenário mais hostil possível para a ergonomia. É a mesma costura onde o cofre nativo entra quando existir.

3. **A resolução do caminho de derivação a partir dos bytes funciona.** A PSBT não carrega `bip32Derivation` (ver `PSBT-DERIV-001`). O comando `sign` decodificou o endereço da entrada a partir do `witnessUtxo.script` e encontrou, entre os caminhos conhecidos, o que produz aquele endereço — `m/84'/1'/0'/0/0`. Não supôs, e teria recusado a PSBT inteira se nenhum caminho batesse.

4. **A revisão exibida na tela é a transação que o nó recebeu.** Os 350, 369, 281 e 141 vB mostrados no aparelho são os mesmos valores que o nó reporta para a transação aceita. A revisão sai dos bytes (`T2`), e agora existe uma confirmação externa disso.

5. **A estimativa de taxa está exata pela terceira vez.** Estimado 141 vB, real 141 vB (peso 561).

6. **A recusa de UTXO não confirmado continua ativa.** Depois da transmissão, `balance` mostra o troco de 369 sat como total e **0 sat como gastável**, porque ainda não confirmou.

---

## O que isto NÃO estabelece

- **A forma mais simples possível.** Uma entrada, duas saídas, um único tipo de script. Não exercita múltiplas entradas, troco descartado por poeira, destino P2TR ou P2WSH, nem RBF de verdade — o sinalizador está lá, a substituição não foi feita.

- **Nada sobre o cofre nativo.** A assinatura saiu de `shared/psbt-signer`, módulo **TEST/LAB permanente** que a ADR-0001 rejeita como caminho de produção. Nenhum gate de segredo real foi tocado.

- **Nada sobre Mainnet.** Signet tem regras próprias e valor econômico zero.

- **Nada sobre iOS**, que segue sem build possível.

- **Nada sobre usabilidade.** Copiar e colar uma PSBT em base64 entre dois aparelhos é aceitável em laboratório e não é interface de carteira.

- **Não substitui auditoria externa.**

---

## Sobre confirmação

A afirmação sustentada por este documento é **aceitação pelo nó**, e ela já aconteceu. Um nó valida assinatura, estrutura, regras de consenso e política de mempool antes de aceitar; recusaria com mensagem específica se qualquer uma falhasse.

Confirmação em bloco acrescenta durabilidade, não validade. Se a transação for substituída ou expirar da mempool sem confirmar, nada do que está estabelecido acima deixa de valer — a validação já foi feita e observada.

---

## Achado fechado

**`SIGN-EXTERNO-001`** — a ferramenta de laboratório só assinava a PSBT que ela mesma montava, o que mantinha o ciclo cortado no meio. O comando `sign <psbt-base64>` fechou o corte. Registrado em `4e9c309`.

---

## Próximas verificações, em ordem de valor

1. **Múltiplas entradas** contra a rede.
2. **Troco descartado por poeira** — confirma que a rede aceita saída única quando o troco cai abaixo de 294 sat. Já se sabe que o módulo absorve o troco na taxa **em silêncio**; a revisão deveria avisar, e não avisa.
3. Destino **P2TR e P2WSH**, confirmando a medição de tamanho de saída contra um nó.
4. **RBF exercitado**: transmitir com taxa baixa e substituir por uma maior.
5. **Nó próprio como fonte on-chain.** Hoje a leitura e a transmissão passam pelo `mempool.space`, que aprende quais endereços interessam ao usuário e pode mentir (`T4`).

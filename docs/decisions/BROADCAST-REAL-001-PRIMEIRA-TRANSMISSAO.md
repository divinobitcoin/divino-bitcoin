# BROADCAST-REAL-001 — Primeira transmissão real na Signet

**Status:** `EVIDÊNCIA REGISTRADA — achado fechado`
**Data:** 27 de agosto de 2026
**Rede:** Signet
**Valor econômico:** zero

---

## O que foi feito

Uma transação construída, assinada e transmitida pelos módulos do projeto foi **aceita por um nó da rede Signet**.

| Campo | Valor |
|---|---|
| Txid | `87174464d90500db2e87227dee5d123f5f5c4b14642dd8499d398819d0e7238c` |
| Entrada gasta | `4b1d731d2759e03a738c7eb138dc9a39bde95cc9c38a50bbbe588efe3d501815:1` (10.000 sat, de faucet) |
| Saída de destino | 5.000 sat |
| Saída de troco | 4.719 sat |
| Taxa | 281 sat |
| Tamanho | 141 vB |
| Forma | 1 entrada, 2 saídas, tudo P2WPKH |

Endpoint usado: Esplora público (`mempool.space/signet/api`), via `POST /tx`.

Caminho exercitado, ponta a ponta, com os módulos reais:

```
esplora-client → coin-selection → psbt-builder → psbt-signer → transaction-broadcast
```

Ferramenta: `scripts/lab-signet-flow.ts`, sob a faixa `LAB-LANE-001`. Seed aleatória descartável, gerada na hora, nunca escrita em disco.

---

## O que isto estabelece

Cada item abaixo era, até hoje, uma afirmação apoiada apenas em teste próprio. Agora é fato observado contra um nó independente.

1. **A ordem de bytes do txid está correta.** Se estivesse invertida, a entrada apontaria para um outpoint inexistente e o nó recusaria com `bad-txns-inputs-missingorspent`. Aceitou.

2. **A assinatura é válida.** Um nó valida a testemunha antes de aceitar. Assinatura errada seria recusada com `non-mandatory-script-verify-flag`.

3. **A PSBT é bem formada e a finalização produz transação válida.** O nó leu, validou e aceitou os bytes extraídos.

4. **A estimativa de taxa está correta.** Estimado 141 vB, real 141 vB. Segunda medição exata — a primeira foi contra transação de teste, esta contra transação transmitida.

5. **A invariante de fechamento vale na prática.** `5.000 + 4.719 + 281 = 10.000`, conferido pelo módulo em execução e confirmado pela aceitação do nó.

6. **A recusa de UTXO não confirmado funciona.** Uma tentativa anterior, com a moeda do faucet ainda na mempool, foi corretamente barrada pela seleção de moedas. Só passou depois da confirmação.

---

## O que isto NÃO estabelece

Registrado com o mesmo cuidado, porque uma transmissão bem-sucedida é exatamente o tipo de resultado que convida a exagerar a conclusão. `WF-F10` aplica-se aqui.

- **Uma transação, da forma mais simples possível.** Uma entrada, duas saídas, um único tipo de script. Não exercita múltiplas entradas, endereços de tipos diferentes, troco descartado por poeira, taxa no limite de retransmissão, nem RBF contra um nó real. Esses caminhos existem em teste, não em rede.

- **Nada sobre o cofre nativo.** A assinatura saiu de `shared/psbt-signer`, módulo **TEST/LAB permanente** que a ADR-0001 rejeita como caminho de produção. Nenhum gate de segredo real foi tocado, adiantado ou informado por este resultado.

- **Nada sobre Mainnet.** Signet tem regras de consenso próprias e valor econômico zero. Aceitação aqui não é evidência de comportamento correto lá.

- **Nada sobre iOS**, nada sobre interface, nada sobre uso por outra pessoa.

- **Não substitui auditoria externa.** Continua sendo pré-condição para qualquer coisa com valor econômico.

---

## Afirmação honesta resultante

> O caminho on-chain do projeto — leitura, seleção de moedas, construção de PSBT, assinatura, revisão e transmissão — foi exercitado ponta a ponta contra a rede Signet, com material descartável e valor zero, na sua forma mais simples, e foi aceito.

Nem mais que isso, nem menos.

---

## Consequências

- `BROADCAST-REAL-001` — **fechado**.
- Marco 0.8 — caminho on-chain completo e exercitado em rede. Falta interface.
- Faixa `LAB-LANE-001` — funcionou como pretendida: do destravamento à transmissão real no mesmo dia, sem gate nenhum, sem tocar em segredo, sem tocar em valor.

Próximas verificações que ampliariam a evidência, em ordem de valor:

1. Transação com **múltiplas entradas** contra a rede.
2. Transação com **troco descartado por poeira** — confirma que a rede aceita a saída única quando o troco cai abaixo de 294 sat.
3. Envio para endereço **P2TR e P2WSH**, confirmando que a medição de tamanho de saída vale contra um nó.
4. **RBF exercitado**: transmitir com taxa baixa e substituir por uma maior.

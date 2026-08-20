# Catálogo Público de Vetores BIP

**Status:** catálogo estático para testes; não há implementação criptográfica, criação/importação de seed, derivação de chave, endereço ativo ou operação de rede.  
**Data:** 20 de agosto de 2026

## Escopo

Os vetores em `shared/public-bip-vectors.ts` são dados publicados por especificações abertas. Eles não são fornecidos pelo usuário e não podem ser reutilizados em produção. O catálogo separa explicitamente os vetores de qualquer interface e não expõe um `xprv`, chave privada, operação de derivação ou função de assinatura.

| Conjunto | Origem | Dado congelado | Verificação atual |
|---|---|---|---|
| BIP-39 | Vetor inglês oficial mantido pelo projeto de referência indicado na BIP-39. [1] [2] | Entropia de 128 bits, mnemonic pública, passphrase `TREZOR` e seed esperada de 64 bytes. | Forma e tamanhos do vetor; nenhuma transformação criptográfica. |
| BIP-32 | Vetor 1 da especificação. [3] | Seed pública, caminho `m/0'/1/2'` e chave pública estendida esperada. | Caminho e prefixo público; nenhum `xprv` é armazenado. |
| BIP-84 | Vetor oficial P2WPKH. [4] | Caminho e endereço Mainnet publicados pela especificação. | Referência de interoperabilidade, sem uso em Signet. |
| Signet | BIP-325. [5] | Política declarativa `signet` e caminho somente `test-compatible`. | Rejeita Mainnet e não produz chave ou endereço. |

> Os dados de BIP-39 são públicos exclusivamente porque pertencem ao vetor de teste oficial. Uma mnemonic criada, importada ou informada por uma pessoa nunca poderá atravessar este módulo, testes, logs, clipboard, telemetria ou armazenamento local.

## Política de caminho preparatória

O contrato `formatSignetTestCompatibleBip84Path()` produz apenas uma **string de caminho** no formato `m/84'/1'/account'/change/index`. Ele exige a rede `signet`, aceita `change` somente como `0` ou `1` e limita os demais índices ao intervalo BIP-32 não hardened de `0` a `2³¹ − 1`. BIP-44 reserva `coin_type' = 1'` para Bitcoin Testnet, e BIP-84 aplica a mesma estrutura de conta com `purpose' = 84'`. [6] [4]

O sufixo `test-compatible` é intencional: BIP-325 descreve consenso Signet, não um coin type ou uma derivação própria. [5] A decisão futura sobre serialização e endereço deverá ser testada contra um nó Signet e uma biblioteca auditada antes de qualquer derivação real.

## Gates para ativar uma implementação BIP

| Gate | Exigência |
|---|---|
| Dependências | Sem vulnerabilidade crítica/alta, SBOM e procedência revisada. |
| Cofre | ADR aprovada, build próprio, teste de Keystore/Secure Enclave e política de recuperação. |
| Testes | Vetores BIP completos, testes negativos e revisão independente. |
| Rede | Fonte combinada configurada sem endpoint padrão, validação Signet e nenhuma Mainnet. |
| Operação | Acesso explicitamente autorizado em um checkpoint futuro; assinatura e broadcast permanecem bloqueados até então. |

## Referências

[1] [BIP-39 — Mnemonic code for generating deterministic keys](https://bips.dev/39/)  
[2] [Trezor python-mnemonic — vetores oficiais](https://github.com/trezor/python-mnemonic/blob/master/vectors.json)  
[3] [BIP-32 — Hierarchical Deterministic Wallets](https://bips.dev/32/)  
[4] [BIP-84 — Derivation scheme for P2WPKH accounts](https://bips.dev/84/)  
[5] [BIP-325 — Signet](https://bips.dev/325/)  
[6] [BIP-44 — Multi-Account Hierarchy for Deterministic Wallets](https://bips.dev/44/)

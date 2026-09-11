# Alinhamento — uma fatia, um agente, um main

Última actualização: 2026-09-09. Signet. Sem valor real. Sem auditoria.

Entrada comum posterior: leia primeiro [`../AGENTS.md`](../AGENTS.md) e
[`ai/SYNC-IA-DIVINO-BITCOIN-v2.md`](ai/SYNC-IA-DIVINO-BITCOIN-v2.md). Este
arquivo continua registrando a divisão operacional dos agentes; não substitui a
CARTA-001 nem o estado verificado no HEAD atual.

## Quem faz o quê
- Humano (Divino): testa no Xiaomi, decide a fatia, único `git push`.
- Este chat Grok (web): arquitectura, prompt da fatia, ler print. Não compete com o Code no mesmo passo.
- Grok Code (Dell): implementa UMA fatia, commit local, `installDebug` se o adb tiver o telemóvel. Sem `git push`.
- Claude Code (Dell): a PRÓXIMA fatia, só depois de `git log -1` igual ao último commit aceite. Não reescreve o que o Grok acabou de gravar.
- GPT: prosa, README, explicar Bitcoin. Sem código do cofre.

Proibido: dois agentes a gravar o mesmo ficheiro na mesma sessão. Sem NWC, LNbits, macaroon, Mainnet, `getSeed`, outras chains.

## Arranque obrigatório (Claude / Grok Code)

Cola a saída no chat do agente. Sem isto, o agente inventa o projecto.

## O que JÁ existe (não refazer)
- Cofre nativo Kotlin Signet: gerar / restaurar BIP39, quiz, signPsbt, JS não vê seed.
- On-chain: saldo (bitcoind RPC ou Esplora público se o RPC cair), montar PSBT, assinar, transmitir. Fingerprint laboratório 4ad88255.
- Nível 1 = chave neste telemóvel. Nível 2 = watch-only, descritor, PSBT para fora. Sem loja.
- Fatura Lightning: lê lntbs, recusa lnbc/lntb. Pagar DESLIGADO. Sem canal, sem NWC.
- Kit: 12 palavras ≠ mapa (rede, path, descritores).
- Autofill Android desligado; senha RPC rodada após fuga ao Gestor Google.

## O que NÃO é verdade
- Sem terceiro: falso quando o Esplora entra. Chave não sai; endereços saem.
- LN depois = não PAGAR. A leitura BOLT11 Signet já está.
- iOS não é o cofre que assina no Xiaomi.
- Testes Node ≠ Hermes.

## Fechado nesta árvore (não refazer)
- Revisão nativa da PSBT (FLAG_SECURE): destino, sats, taxa, fingerprint antes de signPsbt. Tx Signet 97ea03c8…deaf.

## Próxima fatia
Humano decide. Candidatos, não fazer todos: rótulo destino vs troco na Activity nativa; tirar NWC da UI Signet; README honesto com o cofre que assina. Sem Lightning a pagar. Sem Mainnet.

## Cota
Chat Grok e Grok Code partilham o mesmo poço semanal.

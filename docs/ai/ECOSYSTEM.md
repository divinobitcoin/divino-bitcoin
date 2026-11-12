# Ecossistema Divino Bitcoin

**Status:** `PROJECT_KNOWLEDGE` — mapa operacional para agentes de IA  
**Data:** 2026-11-11  
**Fonte:** SYNC-IA v2 + estado do painel VPS + identidade visual aprovada

Este arquivo é o mapa do ecossistema. Não substitui CARTA-001, ADRs, SYNC-IA nem
decisões de custódia. Serve para que qualquer agente saiba quais domínios existem,
onde está a verdade de cada um e o que não pode misturar.

## Domínios

| Domínio | Verdade canônica | O que o agente pode fazer | Hard stops |
|---------|-------------------|---------------------------|------------|
| **Carteira** | CARTA-001, WALLET-FOUNDATION-001, ADRs, código em `modules/divino-native-vault` | Laboratório Signet, documentação, testes com material descartável | Mainnet, seed real, afirmação de segurança, push sem humano |
| **Identidade visual** | `docs/brand/assets/` + `VISUAL-IDENTITY-SYSTEM.md` | Usar o Nó Soberano oficial e a paleta. Não redesenhar | Inventar logo, animar o símbolo, monograma C, moeda/raio |
| **YouTube / Conteúdo** | `YOUTUBE-PRODUCTION-SOP.md` + SYNC-IA v2 | Produzir Shorts no método aprovado até a master | Publicar sem autorização, afirmar segurança, usar marca não oficial |
| **Live / Painel** | Estado na VPS (`/var/www/painel/`) + templates no repositório | Propor templates, dados.json, animações. Atualizar via humano ou GPT na VPS | Alterar chave RTMP, afirmar dados em tempo real sem fonte |
| **Análise / Dados** | Fontes externas (CoinGecko, Binance) + `update_dados.py` | Consumir e exibir. Não criar narrativa de preço | Recomendação financeira, preços sem timestamp |

## Regras de sincronização

1. **Humano único no `git push` para main.** Fatias sequenciais.
2. **Handoff obrigatório** em `docs/handoffs/` ao final de sessão material.
3. **SYNC-IA v1 e v2 são imutáveis.** Nova versão só com delta.
4. **Não misture domínios.** Conteúdo não vira fonte normativa da carteira.
5. **Não registre segredos.** Chave RTMP, seed, token, endereço de gestão.

## Estado operacional rápido (2026-11-11)

- Canal YouTube: ~24 inscritos, playlist Fundamentos com 5 Shorts, banner com Nó Soberano.
- Live: painel Global Terminal em produção na VPS, cron a cada 5 min, FFmpeg x11grab.
- Carteira: Signet Android gera/restaura/assina. iOS e Mainnet fora.
- Identidade: Nó Soberano oficial em `docs/brand/assets/`.

## Como um agente começa

1. Leia este arquivo.
2. Leia `docs/ai/README.md` e o SYNC vigente.
3. Declare baseline, domínio e hard stops.
4. Trabalhe.
5. Deixe handoff.

# Divino Bitcoin — Roadmap da demonstração estável à versão 1.0

**Status:** diretrizes estratégicas formalizadas; execução permanece em demonstração  
**Data:** 20 de agosto de 2026  
**Princípio central:** o Divino Bitcoin deve ser uma carteira livre, aberta e verificável, na qual o usuário controla as chaves de gasto. Nenhuma conveniência operacional justifica retirar essa soberania, esconder riscos ou introduzir custódia por terceiros.

> A demonstração atual permanece como ambiente padrão. Nenhuma etapa deste documento habilita, por si só, uma conexão real, uma geração de chave de produção ou uma movimentação de satoshis.

## 1. O ponto de virada

O Divino Bitcoin possui uma demonstração Android estável, validada no Xiaomi Note 11S, com boas-vindas, Carteira, Atividade, Ajustes, Receber, Enviar, referências locais, cópia, colagem e detalhe de transação. Saldo, faturas, liquidações, pagamentos e taxas ainda são simulados. A camada de domínio declara adaptadores de integração futura, porém bloqueia intencionalmente qualquer conexão real.

O escopo a partir deste ponto deixa de ser apenas uma interface Lightning. A versão 1.0 deverá suportar transações **Bitcoin on-chain** e **Lightning**, com custódia integral do cliente. Isso desloca o centro da arquitetura: conexões NWC e gateways podem existir como interoperabilidade opcional, mas não podem ser a base de controle das chaves ou dos fundos do usuário.

| Já existe | Não existe e precisa ser construído ou validado |
| --- | --- |
| Fluxos demonstrativos Android completos e histórico local | Geração, recuperação, backup e proteção de material de chave do usuário |
| Estado local, preferências de privacidade e biometria | Sincronização on-chain, UTXOs, seleção de moedas, estimativa de taxas, construção e transmissão de transações |
| Contratos de domínio para Receber e Enviar | Assinatura local, suporte a PSBT/hardware signers e validação de endereço, valor e taxa |
| Estilos Android isolados e testes de lógica | Nó Lightning autocustodiado no dispositivo, persistência de canais, recuperação e estratégia de liquidez |
| Demonstração sem conexão real | Auditoria de segurança, build verificável, SBOM, processo de release e resposta a incidentes |

## 2. Diretrizes inegociáveis

### Código aberto, verificável e auditável

O repositório, scripts de build, testes, modelos de ameaça, decisões de arquitetura, configurações de CI, dependências e artefatos de release devem ser públicos e revisáveis. A abertura inclui mecanismos para reproduzir o build e verificar sua procedência; nunca inclui seeds, chaves privadas, cópias de segurança, dados pessoais, endereços de uso sensível ou registros de pagamento.

O código próprio passa a ser licenciado sob **GPL-3.0-or-later**. A primeira distribuição pública ainda deverá trazer o texto integral da licença, `README`, `CONTRIBUTING.md`, `SECURITY.md`, política de divulgação responsável, lista de dependências, SBOM em SPDX, changelog e documentação de releases assinados. Esses itens são entregáveis de produto, não documentação opcional. OpenSSF Scorecard e SLSA serão referências para medir progressivamente a integridade da cadeia de fornecimento [7] [8].

### Autocustódia integral do cliente

O usuário deve gerar, recuperar e controlar a seed e as chaves de gasto. A arquitetura não poderá armazenar seed, xprv, chave de canal Lightning nem chave de assinatura em servidor, API, provedor de observabilidade ou repositório. O aplicativo poderá consultar serviços de rede, retransmitir transações e usar infraestrutura de pares, mas estes serviços não receberão capacidade de assinar ou mover fundos.

O fluxo de criação de carteira exigirá entropia gerada localmente, backup explícito, confirmação de recuperação e orientação clara sobre a responsabilidade do usuário. BIP-39 descreve a representação mnemônica de entropia para derivação de seed e BIP-32 define a árvore determinística de chaves [1] [2]. A seed deve permanecer protegida no dispositivo por um cofre criptográfico do sistema operacional e só deve ficar disponível na memória pelo menor tempo necessário. Não será criada criptografia própria: o produto deve compor implementações abertas, mantidas e testadas das primitivas e dos protocolos adotados.

### Bitcoin completo: on-chain e Lightning

A carteira on-chain precisará derivar endereços, descobrir saldo e UTXOs, construir, revisar, assinar e transmitir transações no cliente. A primeira política de interoperabilidade deverá privilegiar SegWit nativo com caminho BIP-84, sujeito a uma decisão formal de compatibilidade e a vetores de teste [3]. PSBT será um requisito para permitir revisão externa e integração futura com hardware signers e signers offline [4].

Lightning autocustodiado será tratado como um subsistema próprio, e não como um simples adaptador de “pagar fatura”. A chave do nó, a persistência de canais, os estados de atualização, a recuperação, a liquidez, o roteamento, os limites e a estratégia de backup devem permanecer sob controle criptográfico do usuário. LDK será avaliado como candidato técnico por oferecer uma implementação Lightning configurável para dispositivos móveis; BDK será avaliado para a camada de carteira Bitcoin baseada em descritores [5] [6]. A adoção de qualquer biblioteca dependerá de revisão de licença, vetores, superfície nativa e auditoria, e não apenas de disponibilidade de integração.

### Privacidade, clareza e segurança de operação

Todo envio mostrará destinatário, valor, taxa, total máximo, rede e origem da solicitação antes da assinatura. A UX deverá separar de forma inequívoca os ambientes **Demonstração**, **Testnet/Signet** e **Mainnet**, nunca compartilhar área de armazenamento entre eles e bloquear qualquer migração silenciosa. Biometria será uma camada local de autorização de uso do cofre, não substituta da seed nem mecanismo de recuperação.

Telemetria deverá ser opt-in, minimizada e incapaz de capturar seeds, chaves, invoices, endereços sensíveis ou conteúdo de tela. O usuário deve poder exportar dados públicos de atividade, remover dados locais e verificar a origem do binário instalado. A proteção de chaves será avaliada por modelo de ameaça, testes de degradação e análise de dispositivos comprometidos; o aplicativo não prometerá segurança absoluta.

## 3. Arquitetura-alvo

| Camada | Responsabilidade | Regra de custódia e auditabilidade |
| --- | --- | --- |
| Aplicativo móvel | Interface, UX de backup, revisão de transação, autorização local e exibição de estado | Nunca simula uma confirmação real; código e testes públicos |
| Núcleo criptográfico local | Entropia, seed, derivação, chaves, assinatura e validação | Material de gasto não deixa o dispositivo em claro; dependências fixadas, revisadas e testadas contra vetores |
| Carteira on-chain | Descritores, endereços, UTXOs, coin selection, PSBT, taxas e broadcasting | Assinatura sempre local; serviços de rede não recebem chave privada |
| Nó Lightning local | Chaves do nó, canais, estado, invoices, pagamentos, liquidez e recuperação | Estado protegido e estratégia de backup recuperável pelo usuário; nenhuma carteira remota é requisito de custódia |
| Fontes de rede | P2P, nó próprio, Electrum/esplora configurável pelo usuário ou provedores públicos | Devem ser substituíveis e tratadas como fontes não confiáveis de dados e propagação |
| Serviços opcionais | Notificações, LSP, relay Nostr, backup cifrado por chave do usuário | Não podem assinar, recuperar seed ou converter o modelo em custódia; contrato e limites documentados |

NWC e gateways deixam de ser alternativas de arquitetura primária. Podem ser oferecidos no futuro como conectores explícitos para uma carteira que o próprio usuário já controla, desde que a UI explique a delegação e a permissão. Eles não atendem, por si, ao requisito de que o Divino Bitcoin seja a carteira autocustodiada responsável pelas chaves do usuário.

## 4. Marcos propostos até a 1.0

| Marco | Objetivo | Entregáveis | Critério de saída |
| --- | --- | --- | --- |
| **0.6 — Demo congelada** | Preservar a base Android validada e separar o modo demonstração | Tag da demo, guia de teste, cobertura atual e documentação de regressões | Fluxos demonstrativos repetíveis no Xiaomi, sem regressão bloqueante conhecida |
| **0.7 — Fundação livre e auditável** | Preparar o projeto para escrutínio público | GPL-3.0-or-later registrada, governança, modelo de ameaça, CI, análise de dependências, SBOM, releases e política de segurança | Repositório publicável sem segredos, com revisão obrigatória para código sensível e build documentado |
| **0.8 — Cofre e carteira on-chain em ambiente sem valor** | Criar a base de autocustódia sem expor fundos econômicos | Geração e recuperação testadas, derivação BIP, armazenamento protegido, endereços, sincronização, PSBT e transações em **Signet** | Vetores BIP aprovados, restauração verificada, nenhuma chave em logs e transações de teste assinadas localmente |
| **0.9 — Lightning autocustodiado em ambiente sem valor** | Integrar o nó Lightning local e a recuperação segura | Avaliação/integração de núcleo Lightning, persistência, invoices, pagamentos, falhas, limites, backup e recuperação em Signet/Testnet | Perdas simuladas de processo e rede são tratadas; estado de canal pode ser restaurado conforme a estratégia documentada |
| **0.9.x — Piloto mainnet deliberadamente limitado** | Exercitar arquitetura com valor real após aprovação de segurança | Build Android assinado, carteira nova e dedicada, limites conservadores, confirmação reforçada, suporte a hardware signer/PSBT quando aplicável e plano de incidente | Auditoria interna concluída, revisão externa de escopo acordado, testes ponta a ponta e aceite explícito de risco |
| **1.0 — Carteira livre autocustodiada** | Publicar uma primeira versão aberta de Bitcoin on-chain e Lightning dentro do escopo aprovado | Auditoria externa independente, correções públicas, release notes, SBOM, proveniência, documentação de recuperação e reporte de vulnerabilidades | Nenhum achado crítico aberto, recuperação validada, processo de release verificável e critérios de custódia comprovados |

Não há estimativas de prazo. Cada marco depende de revisão técnica, testes de recuperação, auditoria e verificações independentes. O piloto mainnet não é uma obrigação de cronograma e pode ser adiado ou cancelado se qualquer controle de segurança falhar.

## 5. Trilhas de trabalho prioritárias

| Trilha | Primeiro trabalho concreto | Resultado verificável |
| --- | --- | --- |
| Constituição open source | Escolher licença e criar documentos de governança e segurança | Repositório compreensível, publicável e pronto para contribuição externa |
| Modelo de ameaça | Mapear seed, chave de canal, estado de canal, backup, binário, rede e dispositivo comprometido | Riscos priorizados, controles rastreáveis e testes negativos planejados |
| Autocustódia on-chain | Comparar bibliotecas, definir descritores e implementar apenas em Signet/Testnet | Criação, backup, restauração e assinatura local provados por vetores e testes |
| Integração de rede | Definir fontes configuráveis, verificação de respostas e política de privacidade | Nenhum provedor único passa a ser ponto de custódia ou verdade absoluta |
| Lightning local | Definir estratégia de nó móvel, LSP, liquidez, persistência e recuperação | Pagamentos e falhas em rede de teste com estado preservado e recuperável |
| Qualidade de release | Adicionar CI, SBOM, análise de dependências, assinatura e verificação de binários | Artefatos rastreáveis, revisáveis e comparáveis entre builds |
| Auditoria independente | Preparar escopo, evidências, orçamento e ciclo público de correções | Relatório, resposta aos achados e decisão de release documentada |

## 6. Decisões estratégicas para a próxima sessão

| Decisão | Opções a discutir | Consequência direta |
| --- | --- | --- |
| Licença | **GPL-3.0-or-later** para o código próprio | Impõe copyleft forte e requer verificação de compatibilidade de dependências e distribuição |
| Primeira rede de desenvolvimento | **Signet exclusivamente** | Define o primeiro perfil sem valor econômico; Mainnet e demais redes ficam bloqueadas |
| Modelo on-chain | Nó do usuário, fontes configuráveis ou combinação verificável | Define privacidade, custo operacional e complexidade de sincronização |
| Estratégia Lightning | Nó móvel local, apoio de LSP sem custódia ou escopo inicial on-chain antes de Lightning | Define o maior risco técnico de persistência, liquidez e recuperação |
| Recuperação | Seed, passphrase opcional, hardware signer e backup cifrado de estado | Define UX, ameaça de perda de dispositivo e documentação obrigatória |
| Público de pré-lançamento | Uso pessoal, grupo fechado ou público | Define exigência de suporte, auditoria e limites antes da 1.0 |

## 7. Critério de prontidão para qualquer fundo real

O aplicativo só poderá sair dos ambientes sem valor quando todos os itens estiverem comprovados, não apenas planejados:

- [ ] A geração de seed, backup, confirmação e restauração foram testados contra vetores e em dispositivos limpos.
- [ ] Nenhuma seed, chave privada, chave de canal ou segredo de backup aparece em Git, telemetria, logs, relatórios de falha ou capturas de diagnóstico.
- [ ] A carteira constrói e assina transações localmente, exibe destinatário, valor, taxa e total e rejeita entradas inválidas ou ambíguas.
- [ ] PSBT e a integração de hardware signer planejada foram testados com vetores e em dispositivos de teste.
- [ ] Estados e backups Lightning foram testados sob perda de aplicativo, perda de conectividade e recuperação de dispositivo.
- [ ] Redes demo, Testnet/Signet e Mainnet são isoladas por dados, UX e proteção contra troca acidental.
- [ ] O binário de piloto é assinado, rastreável e não depende do Expo Go para operar com chaves ou fundos.
- [ ] Auditoria de segurança independente foi concluída, achados críticos foram resolvidos e o plano de incidente foi exercitado.

## 8. Próxima conversa após a pausa

A próxima sessão recomendada é o modelo de ameaça e a arquitetura do cofre de autocustódia antes de qualquer código de pagamentos. Com GPL-3.0-or-later e Signet definidos, o marco 0.7 pode se tornar uma lista de tarefas pequenas, revisáveis e públicas.

## Referências

[1]: https://bips.dev/39/ "BIP-39 — Mnemonic code for generating deterministic keys"
[2]: https://bips.dev/32/ "BIP-32 — Hierarchical Deterministic Wallets"
[3]: https://bips.dev/84/ "BIP-84 — Derivation scheme for P2WPKH based accounts"
[4]: https://bips.dev/174/ "BIP-174 — Partially Signed Bitcoin Transaction Format"
[5]: https://bitcoindevkit.org/ "Bitcoin Dev Kit"
[6]: https://lightningdevkit.org/ "Lightning Dev Kit"
[7]: https://openssf.org/projects/scorecard/ "OpenSSF Scorecard"
[8]: https://slsa.dev/ "SLSA"
[9]: https://bips.dev/325/ "BIP-325 — Signet"

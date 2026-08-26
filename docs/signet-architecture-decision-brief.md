# Decisões de Arquitetura para o Primeiro Marco Signet

**Status:** proposta para decisão do proprietário; nenhuma integração de rede, criação de seed, derivação, assinatura ou transferência foi iniciada.  
**Data:** 20 de agosto de 2026

## Decisão aprovada pelo proprietário

Em 20 de agosto de 2026, o proprietário selecionou a combinação **C, C, A, A**. O primeiro caminho on-chain será uma fonte combinada e configurável, sem endpoint público pré-definido. Lightning será adiado até que a base on-chain Signet, os vetores BIP, o cofre nativo e os controles de recuperação tenham sido validados. A primeira versão não oferecerá passphrase BIP-39. O pré-lançamento terá escopo de uso pessoal — **revisado em 26 de agosto de 2026 para grupo fechado; ver emenda abaixo**.

Essas escolhas não autorizam conexão a serviços de cadeia, geração ou importação de mnemonic, derivação de chaves, construção/assinatura de PSBT ou transmissão. O próximo marco limita-se a contratos locais, vetores públicos e testes determinísticos.

## Emenda de 26 de agosto de 2026 — público de pré-lançamento

**Decisão revisada:** o público de pré-lançamento passa de **uso pessoal** para **grupo fechado**. Ambas as categorias já constavam como alternativas mapeadas na tabela "Decisões que não podem ser inferidas automaticamente" deste documento; esta emenda apenas seleciona a segunda em vez da primeira.

**Motivo declarado pelo proprietário:** existe um grupo pequeno de pessoas de confiança, conscientes do caráter experimental e sem valor econômico do projeto, sem capacidade de auditoria formal, mas capazes de ajudar a identificar falhas de uso real.

**Pré-condição explícita antes de qualquer distribuição a esse grupo:** a carteira precisa estar em estado testável — interface Signet funcional e cofre nativo com os cinco critérios fail-closed verificados em aparelho, conforme `docs/decisions/P3-01-VERIFICACAO-COFRE-NATIVO.md`. Esta emenda **não** autoriza distribuição imediata; ela apenas atualiza o público-alvo para quando esse estado for atingido.

**O que esta emenda não faz:** não adianta nenhum gate da ADR-0001 nem do `threat-model.md`, não autoriza Mainnet ou valor econômico, e não substitui auditoria externa independente antes do gate G5. Distribuir a um grupo fechado amplia a exposição a erro de uso real, mas não converte revisão informal em auditoria.

## Base de interoperabilidade e vetores públicos

O marco futuro de autocustódia deverá separar explicitamente a geração/recuperação de mnemonic, a derivação determinística, a conta SegWit e a construção de transação. BIP-39 converte entropia em mnemonic e mnemonic em seed; a especificação usa PBKDF2-HMAC-SHA512 com 2048 iterações e destaca que toda passphrase produz uma seed válida. [1] BIP-32 define a árvore determinística e inclui vetores para derivação normal, hardened e casos de zeros à esquerda. [2] BIP-84 estabelece a estrutura `m / 84' / coin_type' / account' / change / address_index` para contas P2WPKH e publica vetores de interoperabilidade. [3] BIP-174 define o formato PSBT que permite construir uma transação e passá-la a um assinador offline sem lhe dar acesso direto ao conjunto UTXO. [4]

> Os vetores a seguir serão públicos e artificiais. Eles são evidência de compatibilidade, não material de recuperação de usuário e nunca deverão ser inseridos em armazenamento persistente, logs ou fluxos de UI.

| Grupo de vetor | Fonte | Verificação exigida antes de qualquer biblioteca Bitcoin |
|---|---|---|
| BIP-39 | Vários vetores oficiais, passphrase pública `TREZOR` | Entropia → mnemonic, checksum, NFKD e seed de 64 bytes. |
| BIP-32 | Vetores 1–5 oficiais | Master xprv/xpub, caminhos normal/hardened e falhas de derivação inválida. |
| BIP-84 | Vetor oficial P2WPKH | Conta, chave pública e endereço derivado no caminho publicado; variante Signet somente após fixar `coin_type` e serialização. |
| BIP-174 | Exemplos oficiais de PSBT | Parse, preservação de mapas e recusa de payload fora de rede, sem assinar ou transmitir. |

O repositório ainda **não** contém uma implementação BIP nem uma biblioteca criptográfica. A inclusão de qualquer uma depende da decisão de arquitetura abaixo, de análise de dependências e de um checkpoint específico.

### Delimitação de rede para os vetores

BIP-325 especifica Signet como uma rede de teste com um desafio adicional de consenso para o progresso dos blocos; não especifica um novo esquema de derivação de carteira. [12] BIP-44 reserva `coin_type' = 1'` para **Bitcoin Testnet**, enquanto BIP-84 reaproveita a estrutura BIP-44 e define as versões `vpub` e `vprv` para Testnet. [13] [3] Portanto, os vetores públicos usarão os formatos Testnet somente para verificar serialização e caminho, sempre marcados como `test-compatible` e nunca como uma alegação de que BIP-325 criou um coin type próprio para Signet.

Nenhum vetor será convertido em endereço Signet, usado para consulta ou enviado à interface. A futura política de derivação só poderá fixar formatos de endereço e serialização após validação cruzada com nó Signet e biblioteca revisada. Até lá, o contrato local deve expor a rede `signet` separadamente do caminho BIP de teste e deve recusar Mainnet.

Os testes de catálogo verificarão que BIP-39 aceita somente tamanhos de entropia entre 128 e 256 bits, em incrementos de 32 bits, e que a derivação de seed usa NFKD, PBKDF2-HMAC-SHA512 com 2048 iterações e resultado de 64 bytes. [1] Para BIP-32, a suíte deverá incluir o caminho publicado com derivações normal e hardened e a regra de recusa quando uma derivação pública hardened for solicitada. [2] Estes são requisitos de teste de dados públicos; não haverá função de geração, importação ou persistência de mnemonic neste marco.

## Decisões que não podem ser inferidas automaticamente

| Decisão | Alternativas iniciais | Efeito de segurança e produto |
|---|---|---|
| Fonte on-chain | Nó próprio; Electrum configurável; Esplora configurável; combinação verificável. | Define privacidade, disponibilidade, superfície de rede e esforço de validação. |
| Estratégia Lightning | LDK no dispositivo; LSP sem custódia; adiar Lightning até o on-chain Signet estar maduro. | Define persistência de canal, backup, monitoramento, conectividade e recuperação. |
| Passphrase BIP-39 | Não oferecer inicialmente; oferecer como recurso avançado com confirmação e educação. | Uma passphrase errada revela outra carteira válida e pode causar perda irrecuperável. [1] |
| Público do pré-lançamento | Uso pessoal; grupo fechado; público. | Define requisitos de suporte, telemetria, distribuição e resposta a incidentes. |

Até essas escolhas serem confirmadas, o próximo trabalho permanecerá documental e em vetores determinísticos, com `assertLiveLightningEnabled` bloqueando operações reais e o namespace Signet limitado a registros públicos.

## Alternativas on-chain avaliadas

BDK disponibiliza componentes separados para consumir dados de cadeia por Esplora, Electrum e Bitcoin Core RPC. [5] A documentação de seus backends também relaciona Electrum, Esplora, filtros compactos/Neutrino e RPC como opções distintas. [6] Essa modularidade favorece uma interface de fonte de cadeia independente do cofre, mas não remove as implicações de privacidade e disponibilidade de cada servidor.

| Alternativa | Vantagem principal | Risco ou custo dominante | Adequação para o primeiro marco Signet |
|---|---|---|---|
| Nó próprio via RPC | Mantém a fonte de cadeia sob operação do usuário. | Exige infraestrutura, disponibilidade, credenciais locais e suporte operacional. | Alta para quem já opera nó; não deve ser obrigatório ao primeiro teste. |
| Electrum configurável | Ecossistema e APIs estabelecidos para sincronização leve. | O servidor principal recebe hashes dos scripts monitorados, pode associar endereços e vê o IP; também pode omitir transações. [7] | Alta como opção explícita, desde que nunca haja endpoint público silencioso. |
| Esplora configurável | API HTTP simples e componente suportado por BDK. [5] | Um servidor de terceiros observa consultas e disponibilidade passa a depender desse serviço. | Média para Signet, com endpoint visível e confirmação de rede. |
| Combinação configurável | Permite iniciar com endpoint próprio e adicionar alternativas sem acoplar a carteira. | Maior superfície de configuração, validação e suporte. | **Recomendada** como direção: interface de fonte on-chain, usuário escolhe endpoint e o app não presume Mainnet. |

Para Signet, a recomendação técnica inicial é uma camada de fonte on-chain configurável, sem endpoint público embutido e com seleção explícita da rede em toda configuração. Ela deve começar com leitura e sincronização de metadados públicos; broadcast, seleção de moedas, PSBT e assinatura seguem bloqueados. A implementação concreta continua dependente da escolha do proprietário e da aprovação dos vetores BIP.

## Alternativas Lightning avaliadas

LDK é uma implementação Lightning independente e flexível, indicada quando a aplicação precisa controlar a própria sincronização de cadeia, gestão de chaves e lógica de armazenamento/backup. [8] A biblioteca `ldk-node` combina LDK e BDK em um nó autocustodial; ela aceita dados de cadeia por RPC, Electrum ou Esplora e pode persistir estado de carteira e canal em SQLite, PostgreSQL, sistema de arquivos ou backend próprio. Sua API pública ainda não é estável antes da versão 1.0. [9]

LSPs podem fornecer conectividade e liquidez de entrada preservando a autocustódia quando as chaves e o estado do nó permanecem com o cliente, mas introduzem escolhas de contraparte, taxa, disponibilidade e privacidade. [10] O protocolo aberto LSPS contempla transporte, pedido de canal, abertura just-in-time e notificações; seu uso ainda requer tratamento explícito de eventos e persistência. [11] A documentação de design também aponta que estado de canal precisa de backup atualizado, que carteiras não custodiantes precisam estar online para receber e que o usuário deve poder trocar, recusar ou combinar LSPs. [10]

| Alternativa | Benefício | Custo e controles exigidos | Adequação agora |
|---|---|---|---|
| Nó Lightning local com LDK | Maior controle de custódia, protocolos e contrapartes. | Build nativo, persistência de estado, backup de canal, monitoramento de cadeia, conectividade, watchtower e recuperação. | Direção de longo prazo; não iniciar enquanto o on-chain Signet e o cofre não forem validados. |
| LSP sem custódia, acoplado a nó local | Reduz fricção de liquidez e abertura de canal. | Manter a custódia no cliente, registrar taxas, evitar lock-in, permitir troca/opt-out e tratar privacidade/backup. | Possível fase posterior, após nó local e persistência segura. |
| On-chain primeiro, Lightning adiado | Reduz a superfície inicial e permite validar derivação, fontes de cadeia e PSBT sem estado de canal. | Não oferece pagamentos Lightning no primeiro marco. | **Recomendação para o próximo marco Signet.** |

## Posição recomendada para aprovação

Para preservar a autocustódia sem antecipar mecanismos frágeis, a sequência aprovada é: **(1)** on-chain Signet com fonte combinada configurável e sem broadcast, **(2)** vetores BIP e cofre nativo em build próprio, **(3)** PSBT offline e revisão, **(4)** nó LDK local com backup e monitoramento testados, e só então **(5)** LSP opt-in, intercambiável e sem custódia. Essa ordem não muda o objetivo de integração total com Bitcoin e Lightning; ela evita que os requisitos persistentes de Lightning sejam introduzidos antes da base de chave e recuperação.

## Referências

[1] [BIP-39 — Mnemonic code for generating deterministic keys](https://bips.dev/39/)  
[2] [BIP-32 — Hierarchical Deterministic Wallets](https://bips.dev/32/)  
[3] [BIP-84 — Derivation scheme for P2WPKH based accounts](https://bips.dev/84/)  
[4] [BIP-174 — Partially Signed Bitcoin Transaction Format](https://bips.dev/174/)  
[5] [Bitcoin Dev Kit — repositório oficial](https://github.com/bitcoindevkit/bdk)  
[6] [BDK — Blockchain backends](https://docs.rs/bdk/latest/bdk/blockchain/index.html)  
[7] [Electrum — FAQ: confiança e privacidade de servidores](https://docs.electrum.org/en/latest/faq.html)  
[8] [Lightning Development Kit — Introduction](https://lightningdevkit.org/introduction/)  
[9] [LDK Node — repositório oficial](https://github.com/lightningdevkit/ldk-node)  
[10] [Bitcoin Design — Lightning services](https://bitcoin.design/guide/how-it-works/lightning-services/)  
[11] [lightning-liquidity — documentação de LSPS](https://docs.rs/lightning-liquidity/latest/lightning_liquidity/)  
[12] [BIP-325 — Signet](https://bips.dev/325/)  
[13] [BIP-44 — Multi-Account Hierarchy for Deterministic Wallets](https://bips.dev/44/)

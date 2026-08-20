# Plano de Execução — Primeiro Fluxo Signet sem Valor Econômico

**Status:** pronto para execução incremental; ainda não habilita cliente de rede, endpoint, saldo, UTXO, endereço, seed, chave, assinatura, broadcast ou Lightning.  
**Objetivo:** transformar os gates S0–S6 já aprovados em marcos técnicos pequenos, reversíveis e auditáveis. O único resultado permitido ao final é a leitura de um metadado público da cadeia Signet, sem identidade de carteira.[1]

> **Regra de parada:** se uma mudança introduzir material secreto, identificador de carteira, dado econômico, rede diferente de Signet, fallback silencioso, endpoint embutido, telemetria identificável ou uma exceção sem evidência, o gate em curso falha. A alteração não avança para o próximo gate.

## 1. Limite operacional da primeira entrega

| Permitido quando todos os gates forem aprovados | Continua bloqueado antes, durante e depois da primeira entrega |
|---|---|
| Abrir uma tela de diagnóstico Signet. | Mainnet, Testnet, Regtest e escolha de rede pelo usuário. |
| Exibir uma fonte pública escolhida explicitamente, o momento da leitura e o estado de conexão. | Seed, mnemonic, passphrase, chave privada, chave pública de carteira, xpub, descriptor, endereço ou fingerprint. |
| Consultar um único metadado público, como altura da cadeia ou identificação da ponta. | Saldo, UTXO, transação de usuário, mempool associado, sincronização de carteira ou persistência de histórico. |
| Tratar timeout, indisponibilidade e resposta inválida sem travar a interface. | PSBT, assinatura, broadcast, faucet, invoice, canal, LSP, Lightning ou valor econômico. |

O plano deliberadamente não escolhe uma fonte nem cria conexão nesta etapa. A escolha explícita de uma fonte pública é uma decisão de segurança e privacidade que só pode ocorrer no início de S3.[1] [2]

## 2. Sequência operacional

| Marco | Mudança autorizada | Evidência mínima antes de avançar | Bloqueios que permanecem |
|---|---|---|---|
| **M0 — Baseline congelado** | Nenhuma alteração funcional. Consolidar hash, SBOM, testes e documentos de escopo. | Checkpoint, `pnpm test`, `pnpm check`, `pnpm lint`, SBOM e lista de arquivos em escopo. | Rede e carteira indisponíveis. |
| **M1 — S0: rota e UI sem rede** | Adicionar somente uma rota/tela informativa Signet, sem import de cliente HTTP/Electrum. | Teste de rota; busca por imports de rede; captura Android/Web; revisão de texto de limites. | Nenhuma requisição ou configuração de fonte. |
| **M2 — S1: isolamento verificável** | Reforçar guards de rota, storage e parâmetros para aceitar exclusivamente Signet. | Testes negativos para Mainnet/Testnet/Regtest; inspeção de namespaces; análise de parâmetros. | Nenhum endpoint, segredo ou carteira. |
| **M3 — S2: contrato de ausência de carteira** | Adicionar testes estáticos e de runtime que rejeitem campos de carteira/segredo em toda a rota. | Testes de exposição, inspeção de bridge/bundle e relatório de revisão independente do esqueleto. | Cofre permanece inoperante; não há API BIP de produção. |
| **M4 — S3: adaptador de fonte isolado** | Implementar interface de cliente sem fonte padrão e sem chamada no carregamento da tela. | Escolha explícita e aprovada da fonte; fixtures para URL, TLS, timeout, tamanho e schema; logs redigidos. | Endpoint privado, tokens e fallback automático proibidos. |
| **M5 — S4: leitura mínima** | Implementar uma única consulta de metadado público pelo adaptador aprovado. | Captura sanitizada de requisição; teste de contrato; inspeção de armazenamento; teste offline. | Nenhum parâmetro de carteira, cache econômico ou leitura de dados de usuário. |
| **M6 — S5: privacidade e UX** | Exibir fonte, horário, limitação de privacidade, falha e estado offline. | Revisão de acessibilidade, UX e strings; teste Android/Web; confirmação de ausência de telemetria identificável. | A UI não promete privacidade absoluta nem permite operações econômicas. |
| **M7 — S6: validação e rollback** | Habilitar a flag local apenas para a execução de teste físico. | Vídeo/capturas Android e navegador, logs sanitizados, procedimento de rollback e checkpoint. | Recurso não se torna carteira, nem libera etapas posteriores. |

## 3. Ordem de execução imediata

O trabalho deve começar em **M0**, não em M4. Esta ordem evita que uma chamada de rede seja usada como substituto de controles de escopo, isolamento e ausência de carteira.

### M0 — Baseline congelado

O responsável registra a referência imutável de início, a versão do development build já validado, o resultado das verificações e a lista de documentos de governança. A revisão independente do cofre pode ocorrer em paralelo, mas a ausência de sua conclusão impede o avanço de S2 para S3.

| Artefato | Resultado esperado |
|---|---|
| `docs/first-signet-non-economic-flow-gates.md` | Fonte normativa dos critérios S0–S6. |
| `docs/adr-0001-native-vault.md` | Fronteira opaca do cofre mantida sem operação de segredo. |
| `docs/independent-native-vault-review-checklist.md` | Escopo da revisão externa e evidências esperadas. |
| `docs/signet-onchain-source.md` | Contrato de fonte sem endpoint embutido. |
| SBOM e auditoria de dependências | Estado de supply chain associado ao checkpoint. |

### M1 — S0: tela e escopo sem rede

A primeira alteração de código deve ser uma tela de diagnóstico somente informativa. Ela deve declarar que o perfil é Signet e que a fonte pública ainda não está configurada. Nenhuma dependência de rede, URL, hostname, cabeçalho HTTP ou cliente Electrum pode ser adicionada neste marco.

**Testes de aceite:** a tela abre no Android e no navegador; não existe chamada de rede durante abertura, foco, atualização ou retorno de navegação; a busca de código não encontra cliente de rede importado pela rota; e a UI não contém saldo, endereço, receber, enviar ou ação equivalente.

### M2 — S1: isolamento de rede e armazenamento

O segundo marco testa a seleção rígida de Signet em rotas, argumentos e chaves de armazenamento. Toda entrada que tente indicar Mainnet, Testnet ou Regtest deve falhar antes de construir uma configuração de fonte. O namespace de preferência pública, quando vier a existir, deve permanecer separado do estado demonstrativo e não carregar identificador de carteira.[3]

**Testes de aceite:** matrizes de parâmetros proibidos; regressão de namespace; navegação direta com argumentos maliciosos; reinício do app; e verificação de que a recusa não cria cache, log detalhado ou retry.

### M3 — S2: ausência de segredo e carteira

Antes de qualquer adaptador de rede, a rota Signet precisa provar que não é uma via alternativa para introduzir dados econômicos. Crie guards explícitos para rejeitar objetos ou parâmetros que representem seed, mnemonic, chave, WIF, xpub, descriptor, endereço, UTXO, saldo, PSBT, invoice ou assinatura. Os testes devem alcançar JavaScript, storage e a bridge nativa quando a rota for usada.

**Dependência externa obrigatória:** o relatório independente pode aceitar apenas o esqueleto nativo sem segredo. Um achado alto ou crítico aberto no cofre, bridge, logs, backup ou clipboard bloqueia S3.[4]

### M4 — S3: decisão de fonte e adaptador isolado

Este é o primeiro ponto que requer uma decisão explícita do responsável: escolher **uma** fonte pública Signet por vez, Esplora por HTTPS ou Electrum com transporte autenticado/criptografado compatível. A fonte não deve ser codificada como valor padrão nem alterada sem ação explícita. Não há fallback automático entre fontes.

| Decisão a registrar antes de código | Critério de aprovação |
|---|---|
| Tipo de fonte | Esplora **ou** Electrum, nunca ambos em uma mesma execução inicial. |
| Identificador da fonte | Nome público e URL/servidor tratados como configuração revisável, não segredo. |
| Transporte | HTTPS para Esplora; mecanismo autenticado/criptografado documentado quando aplicável a Electrum. |
| Limites | Timeout, limite de bytes, parse estrito e erros categorizados. |
| Privacidade | UI informa exposição de IP; requisição não envia dados de carteira ou dispositivo. |

Se essa decisão não estiver aprovada, a implementação deve ficar no estado **“fonte não configurada”**.

### M5 — S4: uma leitura pública mínima

O adaptador pode consultar somente o metadado escolhido em M4. O modelo de dados da tela deve conter origem, estado, valor público, timestamp, categoria de erro e duração. Ele não deve conter campos genéricos que possam posteriormente receber saldo, UTXO, endereço ou informações de carteira.

**Testes de aceite:** sucesso com fixture pública; offline; DNS/TLS/timeout; resposta grande; resposta malformada; campos extras; origem ausente; reinício; e inspeção de que não houve parâmetro econômico na requisição ou persistência além do cache público permitido.

### M6 — S5: honestidade de privacidade e acessibilidade

A tela deve explicar que o provedor enxerga o IP de quem consulta e que a leitura não significa conexão de carteira nem privacidade garantida. Estados de carregamento, offline, erro e timestamp devem ser compreensíveis e acessíveis. Não incluir ações de “reconectar carteira”, “ver saldo”, “receber” ou “enviar”.

### M7 — S6: teste físico, flag e rollback

O recurso só é testado em development build Android e navegador após a aprovação anterior. A flag local deve desligar o fluxo sem migrar dados ou quebrar a carteira demonstrativa. A evidência deve incluir vídeo/capturas, versão testada, origem escolhida, resultado de cada cenário e logs sanitizados.

## 4. Registro de decisão por gate

Cada marco deve abrir e fechar com um registro mínimo. Isso permite auditoria e impede que a conclusão de um teste seja interpretada como aprovação de escopo posterior.

| Campo | Conteúdo obrigatório |
|---|---|
| Referência imutável | Commit ou checkpoint testado. |
| Gate/Milestone | Exemplo: `S1 / M2`. |
| Alterações avaliadas | Arquivos e comportamento alterado. |
| Testes executados | Comandos, plataforma e resultado. |
| Evidências | Capturas sanitizadas, relatórios e hashes quando aplicável. |
| Exceções | Nenhuma; caso exista, o gate não é aprovado. |
| Decisão | Aprovado, reprovado ou bloqueado; nunca “aprovado provisoriamente” para avançar. |

## 5. Critérios de interrupção e rollback

| Situação observada | Ação obrigatória |
|---|---|
| API de segredo, endereço, saldo, UTXO, assinatura ou pagamento aparece em código/UI/telemetria | Remover a alteração, cancelar o gate e reabrir modelo de ameaça/ADR. |
| A consulta usa Mainnet/Testnet/Regtest ou a rede pode ser selecionada indiretamente | Desabilitar a rota antes de investigar a causa. |
| Fonte não respeita transporte, timeout, limite de resposta ou parse estrito | Não enviar chamadas reais; permanecer em fonte não configurada. |
| Log, backup, clipboard ou erro inclui dado sensível ou endpoint privado | Redigir, remover, rotacionar se necessário e registrar achado de segurança. |
| Falha física degrada a carteira demonstrativa ou impede inicialização | Desligar a flag, restaurar o último checkpoint estável e investigar isoladamente. |

## 6. Definition of Done da primeira entrega

O primeiro fluxo Signet sem valor econômico é concluído somente quando S0–S6 possuem registros completos, nenhum achado crítico ou alto permanece aberto, a revisão independente aprova o escopo limitado do cofre e os testes Android/Web confirmam o comportamento. Essa conclusão autoriza exclusivamente a observação pública descrita aqui; qualquer relação com carteira, fundos, assinatura, sincronização ou Lightning requer novo planejamento, ADR e gates próprios.

## Referências

[1]: ./first-signet-non-economic-flow-gates.md "Gates do Primeiro Fluxo Signet sem Valor Econômico"
[2]: ./signet-architecture-decision-brief.md "Decisão de arquitetura para fonte on-chain combinada"
[3]: ./signet-local-isolation.md "Isolamento local do perfil Signet"
[4]: ./independent-native-vault-review-checklist.md "Checklist de Revisão Independente — Cofre Nativo Kotlin e Swift"

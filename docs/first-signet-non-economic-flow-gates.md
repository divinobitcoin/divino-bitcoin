# Gates do Primeiro Fluxo Signet sem Valor Econômico

**Status:** planejamento aprovado para execução incremental; nenhum gate abaixo habilita custódia, seed, chave privada, assinatura, broadcast, Lightning ou Mainnet.  
**Objetivo do primeiro fluxo:** provar que o aplicativo seleciona exclusivamente o perfil **Signet**, preserva seu namespace isolado e pode apresentar uma leitura pública, sem identificador de carteira e sem operação econômica.  
**Definição de “sem valor econômico”:** nenhum saldo de usuário, UTXO, endereço derivado, invoice, PSBT, chave, seed, assinatura, transação criada ou broadcast é aceito, calculado, persistido ou enviado.

> O fluxo inicial é de **observação pública e sem identidade de carteira**. Ele não é um piloto de pagamento e não cria uma transição implícita para fundos reais, mesmo que a rede Signet seja usada.

## 1. Fluxo-alvo e fronteiras obrigatórias

Quando todos os gates forem aprovados, o usuário poderá abrir uma tela de diagnóstico Signet e solicitar uma leitura pública limitada, como altura atual da cadeia ou identificação pública do bloco de ponta, a partir de fonte configurada e aprovada. A tela deve declarar a origem consultada, o horário, o estado da conexão e os limites de privacidade. O aplicativo não deve enviar identificador de dispositivo, namespace de armazenamento, saldo, endereço, descritor, fingerprint, xpub, histórico de atividade ou dado de cofre.

| Permitido na primeira entrega | Expressamente vedado |
|---|---|
| Validar que a rede solicitada é Signet. | Mainnet, Testnet, Regtest ou seleção de rede pelo usuário. |
| Ler metadado público da cadeia a partir de uma fonte autorizada. | Consultar endereço, transação, UTXO, mempool associado ao usuário ou histórico de carteira. |
| Exibir estado da fonte, dados públicos e limitações de privacidade. | Criar/importar seed, chave, descriptor, endereço ou conta. |
| Armazenar preferência pública de fonte em namespace Signet. | Armazenar segredo, token, endpoint privado ou telemetria identificável. |
| Testar indisponibilidade, timeout e resposta malformada. | Assinar, gerar PSBT, criar/broadcast de transação, abrir canal ou emitir/pagar invoice. |

O contrato de fonte on-chain combinada permanece sem endpoint embutido até que o gate de fonte seja satisfeito. Isso preserva a decisão atual de não adicionar conectividade silenciosa ou credencial no aplicativo.[1]

## 2. Sequência de gates e evidências

Os gates são cumulativos. Uma falha ou uma evidência ausente mantém o fluxo no estágio anterior; não há exceção baseada em “valor baixo” ou uso pessoal.

| Gate | Condição para iniciar | Critérios verificáveis de aprovação | Evidências exigidas | Resultado se falhar |
|---|---|---|---|---|
| **S0 — Escopo congelado** | ADR-0001, modelo de ameaça e checklist de revisão nativa disponíveis. | O primeiro fluxo está documentado como observação pública; a UI não contém ação econômica. | Revisão de requisitos e mock/rotas aprovadas. | Não criar tela ou cliente de rede. |
| **S1 — Isolamento de rede** | S0 aprovado. | `assertSignetOnly()` rejeita Mainnet/Testnet/Regtest; namespace Signet não colide com o estado demonstrativo. | Testes negativos de rede e armazenamento; busca por literais proibidos. | Interromper antes de qualquer configuração de endpoint. |
| **S2 — Sem segredo e sem carteira** | S1 aprovado; revisão nativa aprovada somente como esqueleto. | Não há APIs BIP de produção, alias de cofre, seed, chave, endereço, xpub, descriptor ou assinatura. | Testes de exposição; inspeção de bundle e bridge nativa. | Remover a alteração e reabrir revisão independente. |
| **S3 — Fonte pública controlada** | S2 aprovado. | A fonte deve ser configurada explicitamente, usar HTTPS ou transporte autenticado equivalente, ter timeout, tamanho máximo de resposta, validação de esquema e sem token embutido. | Teste de URL inválida, TLS, timeout, resposta malformada e log sem endpoint privado. | Não fazer requisição; apresentar estado “fonte não configurada”. |
| **S4 — Leitura pública mínima** | S3 aprovado. | A requisição só busca metadado público de cadeia; não inclui identificador de carteira ou dispositivo; não persiste conteúdo de resposta além do necessário. | Captura de requisição redigida, teste de contrato e inspeção de armazenamento. | Bloquear UI de consulta e apagar cache transitório. |
| **S5 — Privacidade e UX** | S4 aprovado. | A tela informa que a fonte recebe o IP do dispositivo e não garante privacidade; mostra origem, momento da leitura, falha e estado offline de forma honesta. | Revisão de UX, acessibilidade e teste físico Android/Web. | Não publicar o fluxo. |
| **S6 — Teste físico e rollback** | S5 aprovado. | Development build Android e navegador repetem o fluxo; falhas não travam o app nem degradam a carteira demo. O recurso pode ser desabilitado por flag local. | Vídeo/capturas, logs sem dados sensíveis e procedimento de rollback. | Manter recurso atrás da flag e corrigir. |

## 3. Regras para a fonte on-chain combinada

A decisão arquitetural atual admite Electrum e Esplora como alternativas configuráveis, mas não autoriza fallback silencioso entre elas.[2] A primeira entrega deve usar **uma fonte por vez**, identificada na interface. Alternar fonte é uma decisão explícita do usuário e deve reiniciar o estado de leitura; isso evita misturar respostas e reduz observabilidade involuntária entre provedores.

| Controle | Regra de implementação para a fase futura | Teste de aceite |
|---|---|---|
| Configuração | Endpoint público ou de infraestrutura própria informado fora do código-fonte e validado contra allowlist de esquema. | Um endpoint ausente impede consulta sem criar valor padrão. |
| Transporte | HTTPS para Esplora; transporte autenticado/criptografado compatível quando Electrum o suportar. | Endpoint HTTP simples é recusado. |
| Privacidade | Sem envio de endereço, xpub, descriptor, fingerprint, namespace ou telemetria. A UI explica a exposição de IP ao provedor. | Espião de requisição encontra somente método público e cabeçalhos mínimos. |
| Validação | Timeout curto, limite de tamanho, parse estrito, rejeição de resposta inesperada e sem execução de conteúdo remoto. | Fixtures malformadas e oversized falham com erro controlado. |
| Persistência | Cache público é opcional, limitado e separado no namespace Signet; nunca é fonte de verdade para saldo. | Reinício e limpeza não alteram estado demo nem introduzem identificador. |
| Observabilidade | Logs locais somente com código de erro, categoria e duração; sem URL completa se ela puder ser privada. | Testes de redaction e inspeção de logs. |

## 4. Matriz de cenários obrigatórios

Antes de marcar S6 como aprovado, a suíte deve cobrir tanto o caminho válido quanto tentativas de violar a fronteira. Todos os testes usam fixtures públicas e determinísticas; nenhum pede satoshi, faucet, endereço ou dado de carteira.

| Cenário | Resultado obrigatório |
|---|---|
| Abrir diagnóstico sem fonte configurada | Estado informativo; nenhuma chamada de rede. |
| Solicitar Mainnet/Testnet/Regtest por rota, storage ou configuração | Rejeição explícita antes de cliente HTTP/Electrum. |
| Fonte Signet válida com resposta pública compatível | Exibe apenas metadado público e timestamp. |
| DNS, TLS, timeout ou rede offline | Erro compreensível, sem travamento e sem retry infinito. |
| Resposta inválida, grande ou com campos extras | Rejeição de parse; nenhum conteúdo é renderizado como instrução. |
| Tentativa de introduzir endereço, xpub, descriptor ou seed em parâmetros | Validação recusa; nada persiste ou é transmitido. |
| Alternar fonte | Estado anterior é limpo e a UI explica a nova origem. |
| Reiniciar app | Preferência pública, se existente, fica só no namespace Signet; não afeta dados demonstrativos. |

## 5. Critério de saída e próximos gates

O primeiro fluxo Signet é aceito somente quando S0 a S6 tiverem evidência associada e não houver achado crítico ou alto em aberto. Essa aceitação permite **apenas** a leitura pública descrita neste documento. Ela não aprova fonte de saldo, derivação de endereço, recuperação, assinatura, transação, faucet, Lightning ou qualquer valor.

Depois da aceitação, as próximas decisões continuam separadas e exigem novos ADRs: consulta de dados associados a carteira, criação/importação de material secreto, derivação pública, sincronização de UTXO e qualquer assinatura. O Lightning permanece fora de escopo até a conclusão independente do cofre e uma análise própria de LDK/LSP.

## Referências

[1]: ./signet-onchain-source.md "Contrato local de fonte on-chain combinada Signet"
[2]: ./signet-architecture-decision-brief.md "Decisão de arquitetura para fonte on-chain combinada"

# Design de Interface — Divino Bitcoin

## Direção do produto

O **Divino Bitcoin** é uma carteira móvel focada em pagamentos rápidos pela Lightning Network. A primeira versão privilegia clareza, confiança e operação com uma mão em telas de proporção 9:16. A experiência segue padrões contemporâneos do iOS: hierarquia tipográfica legível, controles amplos, folhas modais para tarefas transacionais e confirmação explícita antes de uma ação financeira.

> Esta primeira versão será entregue em **modo de demonstração protegido**, usando dados locais simulados. Ela não deve receber, guardar ou movimentar bitcoin real até que uma fonte Lightning auditada seja conectada e validada.

## Princípios de interface

| Princípio | Decisão de interface |
| --- | --- |
| Uso com uma mão | Ações principais ficam na metade inferior da tela; a barra inferior oferece alcance imediato a Carteira, Atividade e Ajustes. |
| Clareza financeira | Os valores em satoshis têm máximo destaque; a conversão em BRL é secundária e identificada como estimativa. |
| Prevenção de erros | Pagamentos mostram destino, valor, taxa e total antes da confirmação. QR e invoices são validados antes de avançar. |
| Privacidade por padrão | Saldos podem ser ocultados; dados sensíveis devem ficar em armazenamento protegido quando uma integração real for ativada. |
| Aparência nativa | Cantos suaves, espaçamento generoso, feedback tátil discreto e folhas modais em vez de telas excessivamente profundas. |

## Paleta e tipografia

| Elemento | Cor | Uso |
| --- | --- | --- |
| Azul elétrico | `#0A84FF` | Ação primária, foco e indicadores Lightning. |
| Grafite profundo | `#0D1117` | Fundo do modo escuro e superfícies de alto contraste. |
| Branco névoa | `#F7F9FC` | Fundo do modo claro e áreas de leitura. |
| Âmbar Bitcoin | `#F7931A` | Marca Bitcoin, valor de destaque e ícones de ativo. |
| Verde confirmação | `#30D158` | Recebimentos, saldo disponível e estados concluídos. |
| Vermelho atenção | `#FF453A` | Erros, falhas e alertas de pagamento. |

A tipografia usa a fonte do sistema, preservando a sensação nativa: título grande em peso semibold, valores numéricos em bold com algarismos tabulares e metadados em tamanho menor, mas com contraste adequado.

## Lista de telas

| Tela | Conteúdo principal | Funções |
| --- | --- | --- |
| Boas-vindas | Marca, explicação breve e aviso do modo de demonstração. | Iniciar configuração e revisar aviso de segurança. |
| Carteira | Saldo em satoshis, equivalência estimada, botões Receber e Enviar, último movimento. | Ocultar saldo, iniciar recebimento ou pagamento. |
| Receber | Valor opcional, descrição, invoice Lightning e QR code. | Criar invoice simulada, copiar, compartilhar e salvar solicitação recente. |
| Enviar | Campo de invoice, leitor de QR, valor e nota. | Colar/ler invoice, revisar dados e confirmar pagamento simulado. |
| Revisão de pagamento | Destino, valor, taxa, total e aviso de irreversibilidade. | Confirmar ou cancelar antes de registrar a transação. |
| Atividade | Linha do tempo de recebimentos e pagamentos, estado e horário. | Filtrar por tipo e abrir detalhes. |
| Detalhe da atividade | Dados completos do movimento e referência da invoice. | Copiar referência e compartilhar comprovante. |
| Ajustes | Privacidade, moeda de exibição, segurança e conexão Lightning. | Ativar ocultação de saldo e consultar o estado da integração. |
| Segurança | Resumo de proteção local e práticas recomendadas. | Revisar alertas e compreender limites do modo atual. |

## Fluxos prioritários

| Fluxo | Caminho |
| --- | --- |
| Primeiro acesso | Boas-vindas → aviso de demonstração → Carteira. |
| Receber | Carteira → Receber → informar valor opcional → gerar invoice → copiar, compartilhar ou mostrar QR. |
| Enviar | Carteira → Enviar → colar ou escanear invoice → revisar pagamento → confirmar → comprovante e Atividade. |
| Consultar histórico | Barra inferior → Atividade → selecionar movimento → detalhes e referência. |
| Proteger privacidade | Barra inferior → Ajustes → Privacidade → alternar ocultação de saldo. |

## Estrutura de dados inicial

| Modelo | Campos essenciais | Persistência |
| --- | --- | --- |
| `WalletState` | saldo disponível, preferência de ocultação, unidade e modo da carteira. | Armazenamento local do aplicativo. |
| `LightningInvoice` | id, invoice, valor em sats, descrição, criação, expiração e estado. | Armazenamento local do aplicativo. |
| `WalletTransaction` | id, direção, valor, taxa, total, contraparte, referência, data e estado. | Armazenamento local do aplicativo. |
| `LightningProviderConfig` | tipo de provedor, endpoint público e estado da conexão. | Sem credenciais nesta primeira versão. |

## Limites da primeira versão

O aplicativo terá uma camada de provedor isolada para que uma integração posterior não altere a interface. Nesta etapa, nenhuma seed phrase, chave privada, token de nó, credencial de custódia ou dinheiro real será registrado no aparelho. Antes de ativar uma fonte Lightning real, será necessário decidir entre conexão a um nó próprio, uma carteira custodial ou um protocolo de conexão remota, além de executar revisão de segurança específica.

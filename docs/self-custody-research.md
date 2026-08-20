# Referências para autocustódia e Bitcoin on-chain

## Fontes consultadas em 20 de agosto de 2026

| Fonte | Constatação relevante | URL |
| --- | --- | --- |
| BIP-32 | Define carteiras determinísticas hierárquicas, permitindo derivar cadeias de chaves a partir de uma raiz e separar material público de capacidade de gasto. | https://bips.dev/32/ |
| BIP-39 | Define frases mnemônicas geradas a partir de entropia para derivar uma seed; recomenda não tratar frases criadas pelo usuário como fonte de seed. | https://bips.dev/39/ |
| BIP-84 | Define o caminho de derivação de contas P2WPKH SegWit nativo, interoperável entre carteiras compatíveis. | https://bips.dev/84/ |
| BIP-174 | Define o formato PSBT para transportar uma transação e informações necessárias a assinaturas, inclusive por signers offline ou hardware wallets. | https://bips.dev/174/ |
| Bitcoin Dev Kit | Fornece bibliotecas abertas para aplicações Bitcoin multiplataforma e deve ser avaliado como base para a camada on-chain. | https://bitcoindevkit.org/ |
| Lightning Dev Kit | Fornece uma implementação Lightning configurável, com suporte a execução em dispositivos móveis e componentes de persistência, rede e gerenciamento de chaves. | https://lightningdevkit.org/ |

## Implicações para o Divino Bitcoin

Autocustódia integral exige que a geração, a recuperação e a assinatura com a chave privada ocorram sob controle do usuário, sem seed ou chave de gasto em qualquer backend. O modo de demonstração não pode ser convertido diretamente: a futura arquitetura deve incluir geração criptograficamente segura de entropia, fluxo de backup e verificação da seed, derivação testada contra vetores BIP, armazenamento com proteção do sistema operacional, assinaturas locais e suporte planejado a hardware signer/PSBT. Não se deve criar criptografia própria; serão adotadas implementações abertas, maduras e auditadas de primitivas e protocolos Bitcoin. BDK e LDK devem passar por uma avaliação de integração nativa, manutenção, vetores de teste e auditoria antes de qualquer adoção.

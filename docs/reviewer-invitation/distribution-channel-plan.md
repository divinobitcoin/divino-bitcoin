# Plano de distribuição do convite de revisão independente

**Status:** preparado; nenhuma divulgação pública foi publicada por este plano.

**Contato público:** `contatodivinobitcoin@proton.me`.

**Repositório público:** <https://github.com/divinobitcoin/divino-bitcoin>.

## Política de identidade e contato

O projeto mantém dois papéis de e-mail segregados. O endereço de contato público acima é o único que pode aparecer no repositório, em discussões, fóruns, mensagens a moderadores e materiais de revisão. O endereço privado de gestão de contas é reservado à criação, recuperação e alertas de segurança; ele não deve ser exposto, adicionado a perfis públicos, usado como destinatário de candidaturas nem registrado em documentação versionada.

| Papel | Uso permitido | Uso vedado |
|---|---|---|
| Contato público | Coordenação de revisão, dúvidas de comunidade e recebimento de relatos iniciais conforme `SECURITY.md` | Recuperação de contas, armazenamento de senhas, códigos de recuperação ou chaves de autenticação |
| Gestão privada | Criação e recuperação de contas, alertas de segurança e dados de autenticação | Qualquer postagem, perfil público, documentação, convite, issue ou resposta em fórum |

Essa separação reduz a superfície de phishing e spam associada ao endereço público. A proteção depende também de autenticação de dois fatores baseada em aplicativo autenticador e de códigos de recuperação mantidos offline pelo proprietário.

## Objetivo e limite do convite

O convite busca revisão independente do limite do cofre nativo Kotlin/Swift e dos controles do primeiro fluxo Signet sem valor econômico. Ele não solicita testes com fundos, seeds, chaves privadas, endpoints de produção, assinaturas, broadcast ou Lightning ativo. A fonte de verdade técnica deve ser o repositório público, acompanhado da ADR, do checklist de revisão e da política de divulgação responsável.

## Canais avaliados

| Canal | Adequação | Estado atual | Forma recomendada | Condição antes de publicar |
|---|---|---|---|---|
| GitHub — repositório oficial | **Primário** | Repositório público criado | README, documentação de revisão, Discussions e issue rastreável | Publicar uma cópia higienizada e revisada do código, sem artefatos, segredos ou metadados internos |
| GitHub Discussions | **Primário** | Disponível para ativação pelo proprietário | Anúncio fixado com escopo, critérios e contato | Habilitar Discussions e criar o post de boas-vindas conforme a documentação do GitHub [^github-discussions] |
| Reddit técnico | Condicional | Conta não criada; regras variam por comunidade | Somente postagem adaptada após leitura das regras específicas e transparência de afiliação | Construir presença legítima, pedir orientação aos moderadores quando houver dúvida e não usar automação de links repetidos [^reddit-self-promotion] |
| Bitcoin Development Mailing List | Não recomendado para este convite | Sem conta | Não publicar anúncio genérico de recrutamento | A lista trata de discussões técnicas de protocolo e propostas; o convite ao revisor de aplicativo não se enquadra como primeiro uso [^bitcoin-dev-list] |
| Comunidades Lightning/Discord/Telegram | Condicional | Sem contas ou permissões de servidor | Mensagem curta apenas em canais que permitam pedidos de revisão | Confirmar regras do servidor e obter autorização de moderadores; não fazer disparos automatizados |
| Redes profissionais/generalistas | Secundário | Sem contas | Resumo público que aponte para o GitHub oficial | Criar perfis mínimos e publicar uma única mensagem adaptada, sem promessas de segurança ou solicitação de fundos |

## Sequência recomendada

1. Publicar no GitHub a cópia auditada do código e dos documentos do convite, preservando a licença **GPL-3.0-or-later** e verificando que não há segredos, chaves, credenciais, arquivos de build privados ou fundos reais.
2. Habilitar GitHub Discussions e abrir um anúncio fixado com o escopo fechado, links para a ADR, checklist, critérios de aceite, política `SECURITY.md` e e-mail público de contato.
3. Abrir uma issue de rastreamento sem dados pessoais para registrar candidaturas, perguntas públicas e o estado da seleção. Candidaturas que exigirem contato privado devem usar somente o e-mail público.
4. Submeter uma versão concisa em comunidades externas uma por vez, respeitando as regras particulares. Não replicar postagens em massa e não solicitar votos, repostagens, avaliações positivas ou divulgação remunerada.
5. Registrar em uma tabela de acompanhamento: canal, URL, data, regra consultada, moderador contatado quando aplicável e resposta recebida. Não armazenar senhas, códigos de autenticação nem dados pessoais de candidatos no repositório.

## Controles de publicação

| Controle | Regra operacional |
|---|---|
| Consentimento | Toda criação de conta, publicação, comentário ou mensagem direta requer confirmação explícita do proprietário imediatamente antes do envio. |
| Transparência | Declarar que o autor do post representa o projeto Divino Bitcoin e que o software segue em modo demonstrativo/Signet sem valor econômico. |
| Escopo | Pedir análise de código e evidência reprodutível; não pedir custódia, transações, sementes, chaves, credenciais ou fundos. |
| Antispam | Uma adaptação por comunidade, sem automação de postagens repetidas, votos ou mensagens privadas em massa. |
| Divulgação responsável | Vulnerabilidades devem seguir `SECURITY.md`; achados não devem ser publicados antes da correção e coordenação adequadas. |

## Referências

[^github-discussions]: GitHub Docs, [Quickstart for GitHub Discussions](https://docs.github.com/en/discussions/quickstart). A documentação descreve Discussions como fórum público de colaboração e explica como habilitá-las e criar um post de boas-vindas.
[^reddit-self-promotion]: Reddit, [Guidelines for self-promotion](https://www.reddit.com/wiki/selfpromotion). A página alerta contra submissões repetidas, manipulação de votos e uso de comunidades como canal meramente promocional; as regras de cada subreddit prevalecem.
[^bitcoin-dev-list]: [Bitcoin Development Mailing List](https://groups.google.com/g/bitcoindev). A atividade observável concentra-se em protocolo, BIPs, releases e discussões de implementação de Bitcoin Core, não em recrutamento genérico para revisão de aplicativos.

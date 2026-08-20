# Isolamento Local de Signet Antes do Cofre

**Status:** contrato preparatório implementado; nenhum dado Signet foi gravado e nenhum segredo é aceito.  
**Data:** 20 de agosto de 2026

## Objetivo

Este marco impede que dados demonstrativos e futuros dados de desenvolvimento sejam confundidos por uma mesma chave local. Ele introduz somente o contrato de namespace em `shared/storage-namespaces.ts` e seus testes. O modo demonstrativo continua usando `divino-bitcoin.wallet.demo.v1`; Signet ainda não possui estado persistido, conexão de rede, endereço, UTXO, invoice, seed, chave privada ou capacidade de assinatura.

> O namespace não é um cofre. Ele reduz a classe de erro de mistura entre ambientes, mas não protege segredo em repouso e não autoriza uma carteira com valor.

## Contrato de namespace

| Domínio | Prefixo ou chave | Conteúdo permitido agora | Conteúdo proibido |
|---|---|---|---|
| Demonstração | `divino-bitcoin.wallet.demo.v1` | Saldo, referências e histórico fictícios. | Dados Signet, segredo ou estado real. |
| Signet público | `divino-bitcoin.signet.public.signet.<registro>.v1` | Configuração de rede, metadados de sincronização e intenção não assinada. | Seed, chave, passphrase, token, preimage, backup de canal ou assinatura. |
| Cofre futuro | Não definido neste marco. | Nenhum. | Todo material secreto até aprovação de arquitetura, biblioteca e auditoria. |

O construtor `createSignetPublicStorageKey()` recebe a rede como entrada e chama `assertSignetOnly()` antes de emitir uma chave. Assim, Mainnet, Testnet e Regtest falham antes de qualquer uso de persistência. Os testes verificam a separação do prefixo demonstrativo, o bloqueio de redes não autorizadas e a lista limitada de registros públicos.

## Controles prévios ao cofre de chaves

O armazenamento sensível em aplicativo móvel deve considerar vazamentos intencionais e acidentais por APIs, backup e logs, conforme o domínio MASVS-STORAGE. [1] No Android, o Keystore pode manter material de chave não exportável e restringir usos, mas isso não elimina a possibilidade de uso local indevido quando o processo ou o dispositivo estiver comprometido. [2] Portanto, uma integração futura não pode tratar o keystore como prova suficiente de segurança.

O `expo-secure-store` usa armazenamento cifrado com Keystore no Android, porém possui limites de tamanho, os dados Android não sobrevivem à desinstalação e entradas com autenticação podem se tornar inacessíveis após mudança biométrica. A autenticação biométrica protegida também não é suportada no Expo Go quando a permissão nativa necessária não está presente. [3] Consequentemente, o cofre futuro exigirá build de desenvolvimento próprio, política de recuperação, testes em dispositivo e revisão específica; ele não será introduzido nem exercitado no Expo Go.

| Controle | Estado neste marco | Gate para avançar |
|---|---|---|
| Tipagem e bloqueio de rede Signet | Ativo | Mantido em todos os novos módulos. |
| Namespace distinto Demo/Signet | Ativo para contrato e testes | Integração somente com dados públicos após revisão. |
| Logs, clipboard, telemetria e backup de segredos | Proibidos por política | Testes negativos antes de criar ou importar mnemonic. |
| Cofre com chave não exportável e política de autenticação | Não iniciado | ADR, build próprio, teste em Android/iOS e revisão independente. |
| Persistência de seed, chave e estado Lightning | Bloqueada | Auditoria de segurança e critérios do modelo de ameaça aprovados. |

## Referências

[1] [OWASP MASVS — Storage](https://mas.owasp.org/MASVS/05-MASVS-STORAGE/)  
[2] [Android Developers — Android Keystore system](https://developer.android.com/privacy-and-security/keystore)  
[3] [Expo — SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/)

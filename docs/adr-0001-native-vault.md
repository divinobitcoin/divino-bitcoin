# ADR-0001 — Cofre Nativo de Autocustódia

**Status:** aceito como arquitetura; habilitação de segredo no build permanece pendente dos gates de segurança definidos nesta ADR.
**Data:** 20 de agosto de 2026  
**Escopo atual:** Signet sem valor econômico, pré-lançamento para uso pessoal e sem passphrase BIP-39.  
**Não escopo:** criação/importação de mnemonic, chaves privadas persistidas, assinatura, PSBT, Lightning, conexão de rede ou fundos reais.

## Contexto e decisão

Uma carteira autocustodial não pode tratar `AsyncStorage`, logs, clipboard, bridge JavaScript, backup automático ou armazenamento de preferências como locais adequados para uma seed, chave privada, preimage ou backup de canal. O Android Keystore permite chaves não exportáveis e autorizações de uso; o Keychain usa classes de acessibilidade e pode exigir presença do usuário. [1] [2] A gestão segura exige definir o ciclo de vida inteiro da chave, e não apenas escolher uma API de armazenamento. [3]

> **Decisão:** o Divino Bitcoin adotará um cofre nativo por plataforma, com interface TypeScript estritamente opaca. O JavaScript orquestrará somente estado público; mnemonic, seed, chave mestre, chave privada e material de assinatura nunca atravessarão a bridge React Native nem serão retornados por uma API de leitura.

O produto continuará sem passphrase BIP-39 na primeira versão. A recuperação será baseada somente em mnemonic fornecida e confirmada pelo usuário em fluxo futuro isolado. A ausência de passphrase reduz o risco operacional de perda irrecuperável, mas não reduz a obrigação de explicar e verificar a cópia de recuperação offline.

## Arquitetura escolhida

| Camada | Responsabilidade | Dados permitidos | Proibições |
|---|---|---|---|
| Interface React Native | Exibir estado público, solicitar autorização explícita e receber erros categorizados. | Identificador opaco do perfil, fingerprint público, descritor público, estado de bloqueio. | Seed, mnemonic, chave privada, PSBT assinado, preimage e bytes de segredo. |
| Núcleo criptográfico nativo | Derivar, assinar e apagar buffers temporários na mesma fronteira nativa. | Handle opaco do cofre e saída pública. | Expor material de chave à bridge, telemetria ou logs. |
| Cofre de plataforma | Criar chave de envelope não exportável, proteger o registro cifrado e aplicar política de autenticação. | Alias, versão do envelope, ciphertext autenticado e metadados mínimos. | Reutilizar chave entre Demo e Signet, sincronizar para nuvem ou migrar automaticamente entre aparelhos. |
| Armazenamento de metadados | Guardar apenas dados públicos do namespace `divino-bitcoin.signet.public.*`. | Fonte on-chain, altura de sincronização, descritores públicos e intenção não assinada. | Qualquer segredo, token, invoice real ou backup de canal. |

O registro secreto futuro será um envelope autenticado, versionado e específico por perfil. O conteúdo cifrado ficará fora dos mecanismos automáticos de backup da aplicação; a chave de envelope ficará no armazenamento de chave protegido da plataforma. `SharedPreferences`, `AsyncStorage` ou outro armazenamento de preferências não pode ser usado como fallback para o envelope secreto apenas porque o conteúdo está cifrado. A rotina nativa irá validar versão, algoritmo e integridade antes de liberar o uso ao núcleo criptográfico. O processo React Native receberá apenas um *handle* transitório, que não poderá ser serializado nem usado em outro perfil ou rede.

## Adaptadores de plataforma

| Plataforma | Raiz de proteção | Política preferida | Fallback permitido | Limites conhecidos |
|---|---|---|---|---|
| Android | Chave AES de envelope não exportável no `AndroidKeyStore`. | Preferir StrongBox quando disponível; exigir bloqueio do aparelho e autenticação do usuário para operações sensíveis. | TEE/Keystore com o mesmo conjunto de autorizações, se StrongBox não estiver disponível. | Um processo ou aparelho comprometido pode tentar usar uma chave local; não pode ser tratado como ambiente confiável. [1] |
| iOS | Registro secreto em Keychain, ligado ao aparelho e protegido por controle de acesso; chave de aprovação opcional no Secure Enclave. | `WhenPasscodeSetThisDeviceOnly`, sem migração/sincronização e com biometria atual ou passcode para uso sensível. | Keychain com a mesma classe de acessibilidade quando Secure Enclave não atender ao algoritmo necessário. | O Secure Enclave trabalha com P-256 e não importa chaves existentes; ele é uma camada de proteção, não um local para uma chave Bitcoin secp256k1 importada. [4] |

No Android, o Keystore mantém material de chave fora do processo da aplicação e permite limitar finalidade, algoritmo e autenticação. [1] A preferência por StrongBox não poderá bloquear usuários: se indisponível, a aplicação exibirá a capacidade e usará um fallback TEE compatível; se não houver nível de segurança aceitável, o cofre não será provisionado. A atestação de chave poderá ser avaliada no futuro, mas não será enviada a um servidor nesta fase, pois validação no próprio aparelho comprometido não é uma prova confiável. [5]

No iOS, itens `ThisDeviceOnly` não migram para outro aparelho, e a classe condicionada a passcode torna itens inutilizáveis quando o código é removido ou redefinido. [2] A chave P-256 criada no Secure Enclave poderá servir como fator de aprovação local; como ela não suporta importar uma chave existente nem substitui secp256k1, ela não será confundida com a chave Bitcoin. [4]

## Contrato de bridge e política de memória

O futuro módulo exporá apenas comandos de alto nível, como `provisionSignetProfile`, `getPublicDescriptor`, `authorizeSigningIntent` e `deleteProfile`. Nenhuma interface chamada `getSeed`, `exportPrivateKey`, `decryptSecret`, `readMnemonic` ou equivalente será criada. Operações criptográficas ocorrerão no módulo nativo, com buffers temporários minimizados e apagados em melhor esforço imediatamente após uso. A ADR reconhece que linguagens gerenciadas não dão garantia universal de apagamento de memória; esse controle reduz exposição, não neutraliza aparelho comprometido.

O cofre não será habilitado ou validado como cofre econômico em Expo Go. A autenticação biométrica do `expo-secure-store` não é suportada em Expo Go quando falta a permissão nativa necessária; além disso, a biblioteca não deve ser a única fonte de verdade para dados críticos irrecuperáveis. [6] A implementação pode avançar em *development build* próprio, módulo nativo revisável, fixtures descartáveis e testes em aparelho Android e iOS. Uma revisão independente e a evidência correspondente continuam necessárias antes de aceitar segredo de usuário.

## Recuperação, exclusão e observabilidade

| Evento | Comportamento exigido | Condição de segurança |
|---|---|---|
| Primeiro provisionamento | Futuro fluxo gera ou importa em memória nativa e exige confirmação de recuperação offline. | Ainda bloqueado; sem dados de usuário neste marco. |
| Desbloqueio | Solicita autenticação local para operação sensível e limita a janela de sessão. | Não registra motivo biométrico, template ou segredo. |
| Alteração biométrica/passcode | Trata o material como potencialmente inacessível e orienta recuperação pelo fluxo futuro. | Não tenta contornar a proteção com cópia em nuvem. |
| Desinstalação/restauração | Não presume persistência no Android e não depende da persistência no iOS. | A mnemonic offline, não o aparelho, é a recuperação final. [6] |
| Exclusão de perfil | Apaga ciphertext, alias/registro de plataforma e metadados públicos associados. | Registra somente evento não sensível; nenhuma cópia ou log do segredo. |

Logs, relatórios de falha, área de transferência, analytics, notificações, screenshots automáticos e backups de aplicativo serão explicitamente excluídos de todo material secreto. A telemetria futura, se aprovada, conterá apenas códigos de evento agregados e não identificadores de carteira, descritores ou dados de transação.

## Alternativas rejeitadas

| Alternativa | Decisão | Motivo |
|---|---|---|
| `AsyncStorage` com cifra em JavaScript | Rejeitada | Mantém chave e plaintext no ambiente JavaScript e amplia log, inspeção e serialização acidental. |
| `expo-secure-store` como cofre final | Rejeitada | Útil para pequenos pares chave-valor, mas não satisfaz por si só o contrato de operações opacas, recuperação e build nativo auditável. [6] |
| Seed em nuvem ou backup automático | Rejeitada | Incompatível com o modelo de autocustódia e amplia a superfície de exfiltração. |
| Passphrase BIP-39 inicial | Rejeitada | Aumenta de modo material o risco de perda por erro humano antes da maturidade da UX de recuperação. |
| Cofre JavaScript compartilhado por Demo e Signet | Rejeitada | Viola o isolamento de ambiente já introduzido no projeto. |

## Gates obrigatórios antes de aceitar segredo de usuário

1. **Dependências:** nenhuma vulnerabilidade crítica ou alta sem remediação/justificativa formal no caminho do cofre, com SBOM e lockfile revisados.
2. **Implementação:** módulo nativo por plataforma, sem rota de exportação, com testes negativos para logs, clipboard, backup e bridge.
3. **Criptografia:** biblioteca de Bitcoin auditada, vetores BIP completos, análise de memória e revisão independente de código.
4. **Recuperação:** UX de backup offline, restauração em aparelho limpo e eliminação testada, sem passphrase na versão inicial.
5. **Operação:** development build em Android/iOS, avaliação de armazenamento/biometria em aparelhos reais e nenhum uso em Expo Go.
6. **Aceitação:** decisão técnica e aprovação do proprietário para aceitar o próximo gate; esta ADR não libera transações Signet. A implementação e os testes de laboratório podem avançar antes dessa aceitação com material descartável.

## Consequências

A arquitetura aumenta complexidade nativa e torna necessário construir, auditar e manter adaptadores Android/iOS. Em troca, evita que a camada de interface manipule o material mais sensível da carteira e mantém demo, Signet público e eventual cofre em domínios separados. Até que todos os gates sejam atendidos, o build do Divino Bitcoin permanece uma aplicação demonstrativa e não aceita segredo de usuário ou valor econômico. Isso não impede a implementação e a validação de laboratório do cofre dentro da arquitetura aprovada.

## Referências

[1] [Android Developers — Android Keystore system](https://developer.android.com/privacy-and-security/keystore)  
[2] [Apple Platform Security — Keychain data protection](https://support.apple.com/guide/security/keychain-data-protection-secb0694df1a/web)  
[3] [OWASP MASVS-CRYPTO-2](https://mas.owasp.org/MASVS/controls/MASVS-CRYPTO-2/)  
[4] [Apple Developer — Protecting keys with the Secure Enclave](https://developer.apple.com/documentation/security/protecting-keys-with-the-secure-enclave)  
[5] [Android Developers — Verify hardware-backed key pairs with key attestation](https://developer.android.com/privacy-and-security/security-key-attestation)  
[6] [Expo — SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/)

# Continuidade da pesquisa e engenharia da carteira

Versão: 1.0

Data de consolidação: 11/09/2026

Escopo: autocustódia on-chain, cofre nativo, nó próprio, PSBT, recuperação e
fronteira Lightning

Status: mapa de continuidade; não substitui CARTA-001, ADRs ou auditoria

## 1. Regra de ouro

O objetivo não é “fazer um app que parece carteira”. É construir uma carteira
Bitcoin aberta em que o usuário mantém a capacidade exclusiva de gastar e de
recuperar seus fundos sem depender do Divino Bitcoin.

Isso exige, simultaneamente:

1. código verificável;
2. geração, uso e proteção local dos segredos;
3. recuperação interoperável;
4. revisão humana do que será assinado;
5. acesso à rede sem servidor custodial do projeto;
6. linguagem pública que não ultrapasse a evidência.

## 2. Autoridade documental

Para qualquer questão de carteira, leia:

1. [`../decisions/CARTA-001-CARTA-DA-CARTEIRA.md`](../decisions/CARTA-001-CARTA-DA-CARTEIRA.md);
2. [`../decisions/WALLET-FOUNDATION-001.md`](../decisions/WALLET-FOUNDATION-001.md);
3. [`../adr-0001-native-vault.md`](../adr-0001-native-vault.md);
4. [`../threat-model.md`](../threat-model.md);
5. a decisão específica do fluxo;
6. código e testes atuais;
7. este mapa.

Se este arquivo resumir algo de modo diferente de uma decisão normativa, a
decisão vence. Se dois registros normativos conflitarem, marque `BLOQUEADO` e
registre a reconciliação necessária; não escolha pela data ou conveniência.

## 3. Vocabulário que não pode ser confundido

| Termo | Significado neste projeto |
|---|---|
| Mnemonic | representação humana da entropia conforme BIP39; segredo crítico |
| Seed | resultado usado como raiz de derivação; segredo crítico |
| Chave privada | capacidade de produzir assinatura; nunca cruza a bridge |
| Chave pública/xpub | informação pública, mas sensível à privacidade |
| Descritor | política e origem necessárias para observar/recuperar a carteira |
| Endereço | destino público derivado; pode vazar atividade e clusterização |
| PSBT | pacote BIP174 para construir/revisar/assinar transação |
| Cofre nativo | domínio Kotlin/Swift que guarda/usa segredos fora do JS |
| Watch-only | observa/compõe sem possuir chave privada |
| Nó próprio | Bitcoin Core controlado pelo usuário, caminho preferido |
| Esplora público | terceiro que não recebe chave, mas aprende consultas/endereço |
| Signet | rede de teste; moedas não possuem valor econômico pretendido |
| Mainnet | rede econômica real; bloqueada nesta fase |

“Público” não significa “sem impacto”: xpub, descritor e endereço não gastam
fundos, mas podem destruir privacidade. “Criptografado” não significa
“autocustodiado”: quem controla a chave de descriptografia pode controlar o
segredo.

## 4. Invariantes permanentes

### I-1 — abertura

- Licença GPL-3.0-or-later.
- Dependências e primitivas avaliáveis.
- Build, testes, SBOM e decisões versionados.
- Nada de criptografia caseira para substituir implementações maduras.

### I-2 — autocustódia e recuperação

- Mnemonic/seed/chave permanecem no aparelho.
- JavaScript recebe estado público, handle opaco ou PSBT assinada, nunca segredo.
- O usuário vê e confirma a mnemonic no contexto nativo quando cria o perfil.
- A recuperação precisa funcionar sem empresa, conta ou servidor Divino.
- Mnemonic sozinha não é sempre o mapa completo: rede, path, origem, script e
  descritor precisam ser documentados/testados.

### I-3 — rede e privacidade

- Nenhum servidor do projeto como dependência padrão.
- Nó próprio é primeira classe.
- Terceiro só por escolha explícita, com explicação do dado revelado.
- Fallback nunca ocorre silenciosamente de modo a sustentar a frase falsa
  “nenhum terceiro vê nada”.

### I-4 — evidência antes de confiança

- Implementar em Signet é livre; afirmar segurança não é.
- Teste automatizado, demo e transação Signet não substituem auditoria externa.
- UI, README, vídeo e commit devem dizer “experimental e não auditado” enquanto
  isso permanecer verdadeiro.

## 5. Faixas de trabalho

### Faixa livre

As três condições precisam coexistir:

- `signet` ou `demo`;
- material gerado para teste e descartável;
- valor econômico zero.

Dentro dela, o agente pode implementar, quebrar, testar e refazer sem pedir nova
autorização para cada passo. Isso inclui gerar/importar mnemonic de laboratório
no nativo, derivar BIP84, consultar cadeia, construir PSBT, revisar, assinar,
transmitir e conectar nó próprio.

### Hard stop

Pare antes de:

- Mainnet ou satoshi real;
- seed/mnemonic real de usuário;
- segredo no JS, log, analytics, clipboard, nuvem ou backend;
- `getSeed`, `exportPrivateKey`, `readMnemonic` ou equivalente;
- envelope secreto em AsyncStorage, SharedPreferences ou expo-secure-store;
- servidor custodial ou chave Lightning em serviço do projeto;
- afirmar que a carteira é segura/pronta/confiável/auditada;
- afrouxar o guard de fronteira LAB;
- usar material cuja natureza descartável não foi confirmada.

## 6. Arquitetura mental

### Camadas

| Camada | Pode conhecer | Não pode conhecer |
|---|---|---|
| UI React Native | estado, endereço, saldo, destino, taxa, fingerprint, status | mnemonic, seed, chave privada |
| Bridge TypeScript | chamadas tipadas, handle opaco, descritor público, PSBT assinada | segredo descriptografado |
| Cofre Kotlin/Swift | segredo local, derivação, assinatura, política de autorização | backend externo por padrão |
| Watch-only/on-chain | xpub/descritor, endereços, UTXOs, PSBT sem assinatura | chave de gasto |
| Bitcoin Core próprio | consultas e broadcast do usuário | segredo de carteira do app |
| Esplora público opcional | endereços/txids consultados e IP/metadados | seed/chave, mas há perda de privacidade |

### API pública esperada do cofre

| Chamada | Resultado permitido |
|---|---|
| `provisionSignetProfile` | handle opaco + fingerprint público |
| `getPublicDescriptor` | descritor `wpkh(...)`/xpub público |
| `authorizeSigningIntent` | PSBT assinada, sem chave |
| `deleteProfile` | sucesso/erro sem devolver segredo |

Fail-closed: se o módulo nativo não consegue cumprir a política, ele recusa. Não
existe fallback para derivar/assinar no JavaScript.

## 7. Estado verificado no baseline recente

O estado abaixo foi extraído de `main` antes desta documentação, do README,
`docs/ALINHAMENTO-IA.md`, commits recentes e código presente. Ele deve ser
revalidado contra o HEAD a cada retomada.

| Capacidade | Estado | Evidência/local | Limite de afirmação |
|---|---|---|---|
| Geração BIP39 Android | `EM TESTE / IMPLEMENTADA` | módulo Kotlin e Activities de reveal/quiz | Signet, material descartável |
| Restauração BIP39 Android | `EM TESTE / IMPLEMENTADA` | Activity de importação e sessão nativa | não usar seed real |
| Seed fora do JS | `VERIFICADO NO DESENHO E TESTES DISPONÍVEIS` | API opaca + guard + módulo nativo | não equivale a auditoria total |
| Derivação BIP84 | `EM TESTE / IMPLEMENTADA` | `SignetVaultCrypto.kt`, descritor/watch | Signet |
| Watch-only | `IMPLEMENTADA` | descritor, endereços e UTXOs em `shared/` | xpub/endereço afetam privacidade |
| Saldo on-chain | `IMPLEMENTADA` | Bitcoin Core RPC ou Esplora | fallback público revela consultas |
| Construção de PSBT | `IMPLEMENTADA` | `shared/psbt-builder.ts` | revisar seleção/troco |
| Review nativo PSBT | `IMPLEMENTADA E EXERCITADA` | `SignetPsbtReviewActivity.kt`, FLAG_SECURE | não é auditoria |
| Assinatura Signet | `IMPLEMENTADA E EXERCITADA` | Kotlin `signPsbt`, tx registrada | sem Mainnet/fundos reais |
| Broadcast | `EXERCITADO EM SIGNET` | nó próprio e fluxo de transmissão | valor econômico zero |
| Recuperação Sparrow | `EVIDÊNCIA REGISTRADA` | decisões INTEROP/RECOVERY e descritor | revalidar versão/artefatos |
| iOS | `CÓDIGO PRESENTE, NÃO EQUIVALENTE AO XIAOMI` | arquivos Swift no módulo | não afirmar validação física |
| BOLT11 Signet | `LEITURA IMPLEMENTADA` | `shared/lightning.ts`/tela | só `lntbs`; pagar desligado |
| Lightning pago/canal | `BLOQUEADO/NÃO IMPLEMENTADO` | boundary do projeto | sem NWC/LNbits/custódia |

Fingerprint público de laboratório registrado: `4ad88255`. Uma transação Signet
de evidência foi registrada como `97ea03c8…deaf`. Não use a forma abreviada para
uma verificação técnica: encontre o registro completo na decisão/evidência do
HEAD e confira em fonte própria ou explorador escolhido.

## 8. Código que o próximo agente precisa localizar

### Cofre nativo

- `modules/divino-native-vault/android/src/main/java/expo/modules/divinonativevault/`
  — módulo, armazenamento, criptografia, sessões e Activities nativas.
- `modules/divino-native-vault/ios/` — implementação Swift que deve ser tratada
  como não validada em aparelho até evidência específica.
- `modules/divino-native-vault/src/` — contrato TypeScript e bridge pública.

### Fluxos de aplicativo

- `app/dev/signet-vault.tsx` — laboratório do cofre.
- `app/dev/signet-psbt.tsx` — composição/assinatura Signet.
- `app/dev/signet-node-balance.tsx` — leitura via nó/fonte on-chain.
- `app/dev/signet-watch.tsx` — perfil watch-only.
- `app/android-send.tsx`, `android-receive.tsx`, `payment-review.tsx` — fluxo UI.
- `app/scan-invoice.tsx` — leitura de fatura Lightning dentro da fronteira atual.

### Núcleo público/watch-only

- `shared/bitcoin-network.ts`
- `shared/signet-watch-profile.ts`
- `shared/signet-watch-descriptor.ts`
- `shared/signet-watch-addresses.ts`
- `shared/signet-vault-utxo.ts`
- `shared/coin-selection.ts`
- `shared/psbt-builder.ts`
- `shared/psbt-parser.ts`
- `shared/transaction-broadcast.ts`
- `shared/bitcoin-core-rpc-client.ts`
- `shared/esplora-client.ts`
- `shared/signet-onchain-source.ts`
- `shared/secret-exposure-guard.ts`
- `shared/lightning.ts`

### LAB permanente — não promover

Estes arquivos são vetores/ferramentas de laboratório e não podem entrar em um
caminho de produção que processe segredo:

- `shared/bip84-derivation.ts`
- `shared/mnemonic-recovery.ts`
- `shared/public-bip-vectors.ts`
- `shared/signet-derivation-policy.ts`

O script `scripts/verify-lab-boundary.mjs` fiscaliza essa separação. Não o edite
para permitir um atalho.

## 9. Decisões/evidências por assunto

| Assunto | Documento principal |
|---|---|
| Carta/invariantes | `docs/decisions/CARTA-001-CARTA-DA-CARTEIRA.md` |
| Fundação do produto | `docs/decisions/WALLET-FOUNDATION-001.md` |
| Cofre nativo | `docs/adr-0001-native-vault.md` |
| Modelo de ameaça | `docs/threat-model.md` |
| Faixa de laboratório | `docs/decisions/LAB-LANE-001.md` |
| Origem/derivação na PSBT | `docs/decisions/PSBT-DERIV-001-ORIGEM-DAS-CHAVES.md` |
| Revisão no cofre | `docs/decisions/P3-01-VERIFICACAO-COFRE-NATIVO.md` |
| Ciclo completo PSBT | `docs/decisions/CICLO-PSBT-001-PRIMEIRO-CICLO-PELA-INTERFACE.md` |
| Troco | `docs/decisions/RAMO-TROCO-001-RASTREIO-BIDIRECIONAL.md` |
| Recuperação independente | `docs/decisions/INTEROP-01-RECUPERACAO-INDEPENDENTE.md` |
| Kit de recuperação | `docs/decisions/KIT-MNEMONIC-001-RECUPERACAO-EM-CELULAR.md` |
| Saída/armazenamento | `docs/decisions/RECOVERY-EXIT-001-ARMAZENAMENTO-COFRE.md` |
| Nó próprio leitura | `docs/decisions/NODE-PROPRIO-LEITURA-001-PRIMEIRA-VERIFICACAO.md` |
| Nó próprio escrita | `docs/decisions/NODE-PROPRIO-ESCRITA-001-PRIMEIRA-TRANSMISSAO-VIA-NO.md` |
| Broadcast | `docs/decisions/BROADCAST-REAL-001-PRIMEIRA-TRANSMISSAO.md` |
| Autofill | `docs/decisions/AUTOFILL-LEAK-001-CAMPO-CAPTURADO-PELO-SISTEMA.md` |
| Pesquisa autocustódia | `docs/self-custody-research.md` |
| Cofre/plataformas | `docs/native-vault-research.md` |
| Bibliotecas | `docs/bitcoin-library-evaluation.md` |
| Auditoria aberta | `docs/open-source-audit-research.md` |
| Desenvolvimento Signet | `docs/signet-development.md` e `docs/signet-local-isolation.md` |
| Contrato da fonte on-chain | `docs/signet-onchain-source-contract.md` |

Leia a evidência, não apenas o nome do arquivo. Alguns documentos históricos
podem conter estados anteriores que foram superados por implementação posterior.

## 10. Fontes técnicas primárias

### Padrões Bitcoin

| Tema | Fonte | Uso no projeto |
|---|---|---|
| HD wallets | <https://bips.dev/32/> | árvore de derivação e origem de chaves |
| Mnemonic | <https://bips.dev/39/> | entropia, palavras e seed |
| Native SegWit P2WPKH | <https://bips.dev/84/> | conta/caminho `m/84'/1'/...` em test networks |
| PSBT | <https://bips.dev/174/> | transporte e metadados para assinatura |
| Descritores | <https://github.com/bitcoin/bitcoin/blob/master/doc/descriptors.md> | recuperação/watch-only e política |
| Bitcoin Core RPC | <https://bitcoincore.org/en/doc/> | nó próprio, consulta e broadcast |

Sempre confira a versão do Core/BIP e mudanças posteriores. Para questão
controversa, cite texto primário e registre a interpretação; não trate blog ou
resumo de IA como especificação.

### Plataforma e segurança móvel

| Tema | Fonte |
|---|---|
| Android Keystore | <https://developer.android.com/privacy-and-security/keystore> |
| Android key attestation | <https://developer.android.com/privacy-and-security/security-key-attestation> |
| Apple Secure Enclave | <https://developer.apple.com/documentation/security/protecting-keys-with-the-secure-enclave> |
| Apple Keychain data protection | <https://support.apple.com/guide/security/keychain-data-protection-secb0694df1a/web> |
| OWASP MASVS crypto | <https://mas.owasp.org/MASVS/controls/MASVS-CRYPTO-2/> |
| OWASP key management | <https://cheatsheetseries.owasp.org/cheatsheets/Key_Management_Cheat_Sheet.html> |
| Expo local modules | <https://docs.expo.dev/modules/get-started/> |
| Expo development builds | <https://docs.expo.dev/develop/development-builds/introduction/> |

Keystore/Secure Enclave ajudam a proteger uma chave de envelope, mas não tornam
um aparelho comprometido confiável e não resolvem sozinhos backup/recuperação.
Biometria autoriza uso; não deve ser a única chave de recuperação do Bitcoin.

### Bibliotecas candidatas

- Bitcoin Dev Kit: <https://bitcoindevkit.org/>
- Lightning Dev Kit: <https://lightningdevkit.org/>

Uma biblioteca aberta não entra apenas por reputação. Avalie manutenção,
licença, bindings móveis, modelo de persistência, fronteira de segredos, vetores,
reprodutibilidade, superfície de dependências e auditorias publicadas.

## 11. Método obrigatório para nova pesquisa

### Passo 1 — formular a pergunta

Escreva uma questão testável. Exemplo bom: “O descritor exportado contém origem
e checksum suficientes para reconstruir a carteira BIP84 Signet no Sparrow?”.
Exemplo ruim: “A recuperação está segura?”.

### Passo 2 — declarar impacto

Registre:

- segredo envolvido;
- rede;
- valor econômico;
- mudança de arquitetura;
- dado revelado a terceiro;
- reversibilidade;
- afirmação pública que poderia surgir.

### Passo 3 — reunir fontes

Use no mínimo a especificação primária e o código/versão real. Fontes secundárias
podem explicar, mas não substituir. Registre data de acesso e trechos relevantes
em paráfrase curta.

### Passo 4 — separar fatos de decisão

```text
VERIFICADO: o padrão/código diz ou faz X.
INFERÊNCIA: portanto, o risco provável é Y.
HIPÓTESE: Z ainda precisa de teste.
DECISÃO PROPOSTA: fazer W, com trade-off explícito.
EVIDÊNCIA NECESSÁRIA: comando/teste/aparelho/reprodução.
```

### Passo 5 — desenhar testes positivos e negativos

Não teste somente “assina”. Teste também:

- rede errada;
- path/origem errada;
- output desconhecido;
- troco adulterado;
- taxa anormal;
- PSBT truncada/malformada;
- fingerprint incompatível;
- app em background/screenshot/autofill;
- chave invalidada ou armazenamento corrompido;
- nó indisponível e fallback recusado;
- segredo/fragmento em logs, erros e bridge.

### Passo 6 — evidência física quando nativo

Teste de Node/Vitest não prova Hermes, bridge, Activity, Keystore nem tela real.
Mudança nativa precisa de development build e evidência no aparelho. Registre
modelo, sistema, build, rede e resultado sem expor identificador pessoal.

### Passo 7 — conclusão estreita

Conclua somente o que o teste demonstra. Liste limitações, risco residual e
próximo teste. Não use “seguro” como sinônimo de “não falhou desta vez”.

## 12. Pesquisa de recuperação

Uma recuperação completa precisa provar:

- frase BIP39 válida e ordem correta;
- rede correta;
- derivation path e coin type corretos;
- script type BIP84/P2WPKH correto;
- account/origin fingerprint;
- descritores externo e interno/troco, com checksum quando aplicável;
- gap limit/descoberta coerente;
- restauração em carteira independente;
- capacidade de identificar saldo/UTXO e gastar em Signet;
- ausência de dependência do app/servidor Divino.

Nunca peça que usuário envie a mnemonic para suporte. O kit deve ensinar o
usuário a guardar e verificar sem criar uma segunda cópia digital insegura.

## 13. Pesquisa de PSBT e revisão

Antes de assinar, o cofre precisa vincular a intenção humana à transação real:

- rede;
- inputs pertencentes ao perfil;
- destino externo;
- quantidade;
- taxa absoluta e, quando possível, taxa relativa;
- output de troco reconhecido por derivação;
- fingerprint/origem;
- ausência de outputs ocultos ou scripts inesperados.

O review no JS não basta porque o JS pode estar comprometido ou errado. A tela
nativa protegida deve exibir os campos obtidos da PSBT que será assinada, não
uma descrição enviada separadamente pela UI.

## 14. Nó próprio, fallback e privacidade

### Nó próprio

É o caminho coerente com soberania, mas ainda exige autenticação, disponibilidade,
TLS/túnel quando remoto, política de wallet/RPC e UX para falha de conexão.
Credencial RPC nunca entra no Git, screenshot, vídeo ou handoff.

### Esplora público

Pode manter o laboratório funcionando, mas o operador aprende endereços/txids,
IP e padrões de consulta. O app precisa:

- informar o usuário;
- permitir recusar;
- deixar claro quando ocorreu fallback;
- não afirmar “sem terceiros” nessa sessão;
- evitar misturar muitos endereços de um perfil de modo que amplifique
  clusterização sem necessidade.

## 15. Lightning — fronteira vigente

O projeto já lê fatura BOLT11 Signet `lntbs` e rejeita `lnbc`/`lntb` no fluxo de
laboratório. Isso é parsing/validação, não pagamento Lightning.

Continuam fora:

- pagar fatura;
- abrir/gerenciar canal;
- LSP escolhido;
- persistência de estado de canal;
- backup/monitoramento;
- chaves de nó/canal;
- NWC;
- LND/LNbits de terceiro com custódia ou autorização de gasto.

Quando essa pesquisa avançar, a implementação deve ser no aparelho (LDK/Breez
ou alternativa avaliada) e preservar autocustódia. Não use Lightning para pular
o fechamento do fluxo on-chain ou criar dependência custodial disfarçada.

## 16. Backlog de pesquisa — não é prioridade aprovada

O proprietário escolhe uma fatia. Estes são candidatos independentes:

1. validar classificação visual de destino versus troco no review nativo;
2. comprovar recuperação externa de cada variante de perfil;
3. reconciliar implementation parity Android/iOS;
4. mapear ciclo de vida/rotação/invalidação da chave de envelope;
5. medir vazamento de logs, crash reports, screenshots, clipboard e autofill;
6. testar política de taxa e coin selection adversarial;
7. tornar nó próprio a experiência padrão sem esconder falha;
8. revisar dependências nativas e gerar SBOM reproduzível;
9. preparar escopo e evidência para auditoria externa independente;
10. definir arquitetura Lightning autocustodiada sem ativar pagamento.

Não execute todos de uma vez. Uma sessão deve entregar uma fatia visível e sua
evidência, preferencialmente no aparelho.

## 17. Controles antes de commit

```sh
pnpm check && pnpm test && pnpm lint
pnpm guard:lab-boundary
```

Além disso:

- `git diff --check`;
- testes Kotlin/Swift relevantes quando a mudança toca o módulo;
- development build e aparelho para interface/comportamento nativo;
- nenhum segredo no diff (`rg` por padrões e revisão humana);
- README/UI continuam honestos sobre Signet e auditoria;
- handoff conforme [`HANDOFF-TEMPLATE.md`](HANDOFF-TEMPLATE.md).

## 18. Linguagem pública permitida e proibida

| Permitido quando verdadeiro | Proibido sem auditoria/evidência |
|---|---|
| “protótipo experimental em Signet” | “carteira segura” |
| “a seed não é devolvida ao JavaScript por esta API” | “a seed nunca pode vazar” |
| “a PSBT foi revisada e assinada no módulo Android neste teste” | “assinatura inviolável” |
| “o fluxo transmitiu uma transação Signet de valor não econômico” | “pronta para guardar Bitcoin” |
| “nó próprio é suportado; Esplora opcional reduz privacidade” | “sem terceiros” quando houve fallback |
| “não auditado” | “auditado pela comunidade” sem relatório independente |

## 19. Condição para um novo agente continuar

O agente deve conseguir responder antes de editar:

- Qual é o HEAD real?
- A tarefa usa Signet/demo, material descartável e valor zero?
- Qual decisão governa o fluxo?
- Onde o segredo existe e quais camadas não podem vê-lo?
- Qual afirmação estreita a evidência permitirá?
- Qual teste negativo pode refutar a implementação?
- O que precisa ser observado no aparelho?
- Que ação externa ou hard stop permanece fora do escopo?

Se não consegue responder, a próxima ação é leitura/pesquisa, não código de
segredo e não texto público de confiança.

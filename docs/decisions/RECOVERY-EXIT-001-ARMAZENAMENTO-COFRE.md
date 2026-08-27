# RECOVERY-EXIT-001 — Onde o envelope cifrado do cofre deve morar no Android

**Status:** `PROPOSTA — aguarda decisão do proprietário e revisão adversarial`
**Data:** 26 de agosto de 2026
**Impacto:** Alto. Define a fronteira de armazenamento que um dia guardará material de recuperação real.
**Resolve:** `VAULT-BACKUP-001`
**Toca:** `WF-F11` / `INV-006` (proibição de downgrade silencioso de armazenamento), `WF-F2` / `INV-003` (segredo não sai da fronteira aprovada), ameaça `T6` (backup copiado ou restaurado de forma enganosa)
**Não autoriza:** aceitar segredo real de usuário. Os gates da ADR-0001 seguem fechados.

> **Emendado em 27 de agosto de 2026.** A decisão do proprietário está registrada na
> **Emenda 1**, ao final deste documento. O status acima é o original de 26/08 e foi
> preservado: a Emenda 1 o substitui na parte de *política* e o mantém na parte de
> *evidência*.

---

## 1. O achado, corrigido pela evidência

`VAULT-BACKUP-001` foi registrado como: *"`allowBackup=true`; as regras do `expo-secure-store` incluem todo `sharedpref` e excluem só o arquivo literalmente chamado `SecureStore`. Qualquer segredo futuro fora desse nome vaza para cloud-backup e device-transfer."*

A leitura do XML real confirma a primeira parte e **refina** a segunda. As regras injetadas pela biblioteca são, em `node_modules/expo-secure-store/android/src/main/res/xml/`:

```xml
<!-- secure_store_data_extraction_rules.xml (Android 12+) -->
<data-extraction-rules>
  <cloud-backup>
    <include domain="sharedpref" path="."/>
    <exclude domain="sharedpref" path="SecureStore"/>
  </cloud-backup>
  <device-transfer>
    <include domain="sharedpref" path="."/>
    <exclude domain="sharedpref" path="SecureStore"/>
  </device-transfer>
</data-extraction-rules>
```

O detalhe que muda a análise: **`<include>` é restritivo, não aditivo.** A documentação oficial do Android é explícita — se você especifica um elemento `<include>`, o sistema deixa de incluir qualquer arquivo por padrão e faz backup somente do que foi especificado. [1]

Consequência prática: hoje, **somente `sharedpref` é copiado** (menos o arquivo `SecureStore`). Arquivos em `getFilesDir()`, bancos de dados e o resto **já não são** copiados.

Isso significa que o risco imediato é menor do que o achado sugeria. Mas não muda a conclusão, por três motivos:

1. **A proteção é acidental.** Ela vem de um recurso XML de uma biblioteca de terceiro. O projeto não a escolheu, não a controla e não é notificado se ela mudar.
2. **É frágil por construção.** `android:dataExtractionRules` é um atributo único apontando para um recurso único. Se outra biblioteca declarar o seu, o resultado depende de resolução de conflito do manifest merger — e o resultado efetivo pode mudar sem nenhuma linha do projeto ser alterada. Isso é exatamente o "downgrade silencioso" que `WF-F11` proíbe.
3. **O `targetSdkVersion` não está fixado** no projeto; ele herda o padrão do Expo SDK 55. Como o formato de regra que governa depende de `targetSdk` ser ≥ 31, a semântica de backup do app depende hoje de um valor que ninguém no projeto escolheu explicitamente.

**Reformulação honesta do achado:** o problema não é que existe um vazamento hoje. É que a ausência de vazamento hoje não é uma propriedade que o projeto possa afirmar, defender ou detectar se quebrar.

---

## 2. A solução intuitiva é mais fraca do que parece

O reflexo natural é `android:allowBackup="false"`. A evidência desaconselha, e esse é o achado mais importante deste documento.

A documentação de mudanças de comportamento do Android 12 registra que, em aparelhos de alguns fabricantes, definir `android:allowBackup="false"` desabilita o backup para o Google Drive mas **não** desabilita as transferências D2D do app. [2]

Ou seja: `allowBackup="false"` produziria uma afirmação de segurança que o projeto não poderia sustentar em todos os aparelhos — inclusive, possivelmente, no Xiaomi de teste. Isso colidiria diretamente com `WF-F10` (não alegar propriedade de segurança que a evidência não sustenta).

Um controle que falha silenciosamente em alguns fabricantes é pior que nenhum controle, porque encerra a investigação.

---

## 3. Proposta: `Context.getNoBackupFilesDir()`

A recomendação é que o envelope cifrado do cofre resida em `Context.getNoBackupFilesDir()`, e nunca em `SharedPreferences`, `getFilesDir()` ou banco de dados.

O que distingue esse diretório de uma regra XML:

| Propriedade | Evidência |
|---|---|
| Arquivos ali são sempre excluídos, mesmo se o app tentar incluí-los explicitamente | Documentação do AOSP sobre regras de backup [3] |
| A exclusão é aplicada também no lado da **restauração** — o sistema descarta os dados antes de entregá-los ao app | Commit original que introduziu a API no AOSP [4] |
| Excluído de D2D mesmo quando não existe seção `<device-transfer>` | Documentação de Auto Backup: se não há regras para um modo, ele vale para todo o conteúdo **exceto** diretórios no-backup e de cache [5] |

A diferença categórica: isto é aplicado **pela plataforma**, não por configuração. Nenhuma biblioteca de terceiro, nenhum merge de manifesto e nenhuma mudança de `targetSdk` pode reverter a propriedade sem que o código do projeto mude.

Isso é o que `WF-F11` pede: a garantia não pode depender de um mecanismo que alguém possa rebaixar em silêncio.

---

## 4. Por que ainda importa, se o envelope já é cifrado

Pergunta legítima: se a chave de envelope fica no Android Keystore e é não exportável, o ciphertext viajar para o Google Drive não seria inofensivo, já que a chave não vai junto?

Em primeira ordem, sim. Mas a proposta se mantém por três razões:

- **Fronteira de confiança.** O ciphertext passaria a existir na infraestrutura do Google, fora do dispositivo, fora do controle do usuário e fora do modelo de ameaça do projeto. O `threat-model.md` trata todo serviço remoto como não confiável; permitir que material de cofre se acumule lá contradiz isso sem decisão explícita.
- **Permanência.** Uma falha futura em derivação, algoritmo ou implementação transformaria cópias já distribuídas em exposição retroativa. O usuário não pode revogar um backup que já foi feito.
- **Honestidade da promessa.** A carteira pretende afirmar que material de segredo nunca sai do dispositivo. Se o ciphertext sai, a afirmação precisa de asterisco. É preferível a afirmação sem asterisco.

`getNoBackupFilesDir()` é **complementar** à cifragem por chave do Keystore, não substituta. A proteção real do segredo continua sendo a chave não exportável; o diretório impede que o material cifrado circule.

---

## 5. O que esta proposta NÃO resolve

Registrado explicitamente para não gerar confiança além da evidência:

- **Não protege contra root, extração física, malware com privilégio do app, ou `adb backup` em build de depuração.** O diretório controla a infraestrutura de backup, não o acesso local ao sistema de arquivos.
- **Não substitui a chave de envelope no Keystore.** Sem cifragem, um arquivo em `no_backup` continua legível por quem tiver acesso ao dispositivo.
- **Não decide o formato do envelope**, o algoritmo, a política de autenticação, a rotação nem o esquema de versionamento. São decisões separadas da ADR-0001.
- **Não vale para iOS.** O equivalente é a exclusão de backup do Keychain e o atributo `isExcludedFromBackup` em arquivos — decisão distinta, pendente, e sem aparelho para verificar.
- **Não foi verificada em aparelho.** Toda a evidência acima é documental. A verificação empírica está proposta na seção 7.

---

## 6. Alternativas consideradas

| Alternativa | Avaliação |
|---|---|
| `allowBackup="false"` | **Rejeitada.** Não desabilita D2D de forma confiável em todos os fabricantes [2]; produziria alegação de segurança insustentável. |
| Regras XML próprias do projeto, excluindo o caminho do cofre | **Insuficiente sozinha.** Corrige o conteúdo, mas mantém a garantia dependente de um atributo único sujeito a merge de manifesto — o mesmo modo de falha do estado atual. |
| Manter o envelope em `SharedPreferences` com nome diferente de `SecureStore` | **Rejeitada.** É precisamente o caso que `WF-F11` nomeia: um armazenamento de preferências não vira fronteira de segredo aprovada só porque o conteúdo está cifrado. |
| `getNoBackupFilesDir()` | **Recomendada.** Garantia da plataforma, aplicada nos dois sentidos, insensível a configuração de terceiros. |
| `getNoBackupFilesDir()` **mais** regras XML explícitas do projeto | **Recomendada como forma final.** As regras XML não adicionam garantia sobre o diretório, mas tornam a intenção legível e detectável em revisão, e cobrem o resto do app. Defesa em profundidade barata. |

---

## 7. Evidência exigida antes de aceitar esta decisão

Nenhum destes passos aceita segredo real; todos usam material descartável.

1. **Teste empírico em aparelho.** Gravar um arquivo sentinela sintético em `getNoBackupFilesDir()` e outro em `getFilesDir()`, forçar backup por `bmgr`, restaurar e verificar que o primeiro não retorna. O Xiaomi Note 11 está disponível e com `adb` funcionando desde 26/08.
2. **Teste equivalente para D2D**, se houver forma de exercitá-lo sem um segundo aparelho — caso não haja, registrar como limitação em vez de presumir.
3. **Fixar `targetSdkVersion` explicitamente** no `expo-build-properties`, para que a semântica de backup deixe de depender de um padrão herdado.
4. **Teste negativo automatizado** que falhe se algum caminho de código gravar material de cofre fora do diretório aprovado.
5. **Revisão adversarial (GPT).** Esta decisão toca `WF-F11` e a fronteira de armazenamento de segredo — gate objetivo, não convite.

---

## 8. Perguntas abertas para o revisor adversarial

Declaradas para que a revisão tenha alvo, e para que esta proposta possa ser refutada em pontos concretos:

1. A conclusão de que `<include>` é restritivo está correta na prática, ou existe comportamento divergente por fabricante que a documentação não cobre?
2. Existe algum caminho pelo qual o conteúdo de `no_backup` seja capturado — MIUI ou outra camada de fabricante, ferramenta de migração proprietária, `adb backup` com `allowBackup=true`?
3. A escolha de manter `allowBackup="true"` e confiar no diretório é preferível a `allowBackup="false"` combinado com o diretório? O argumento a favor de manter é não criar alegação falsa e preservar backup legítimo de preferências não sensíveis; existe contra-argumento mais forte?
4. Há risco de `getNoBackupFilesDir()` ter comportamento diferente sob perfis de trabalho, usuários secundários ou armazenamento adotável?

**Condição de refutação desta proposta:** demonstrar que existe um caminho realista pelo qual conteúdo de `no_backup` sai do aparelho sem root — o que reduziria a garantia ao mesmo nível de uma regra XML e reabriria a comparação com as alternativas.

---

## Emenda 1 — Decisão do proprietário: a fronteira é o aparelho

**Data:** 27 de agosto de 2026
**Natureza:** Emenda do proprietário ao documento normativo. Acrescenta e aponta; não altera nem apaga as seções 1 a 8 acima.
**Efeito:** Fecha a questão de *política*. Não fecha a questão de *evidência*.

### O que foi decidido

Nenhum material de cofre sai do aparelho. Por canal nenhum.

- **Backup em nuvem (Google Drive):** não.
- **Transferência aparelho-a-aparelho (D2D):** não.
- Sem exceção, sem modo de conveniência, sem opção que o usuário possa ligar.

Razão declarada pelo proprietário: *um canal de transferência que existe por conveniência é também um caminho de saída. Promessas que parecem seguras são portas, e portas abrem dos dois lados.*

### Esta emenda não cria política nova — ela aplica política existente

Registrado porque a distinção importa e porque evita que esta decisão seja lida como mudança de rumo.

A proibição já estava escrita, em nível de arquitetura, antes desta emenda:

| Onde | O que já dizia |
|---|---|
| `adr-0001-native-vault.md`, Alternativas rejeitadas | *"Seed em nuvem ou backup automático — Rejeitada — Incompatível com o modelo de autocustódia e amplia a superfície de exfiltração."* |
| `adr-0001-native-vault.md`, Recuperação | *"A mnemonic offline, não o aparelho, é a recuperação final."* |
| `threat-model.md`, T6 (Crítico) | Mitigação inclui *"proibição de backup em nuvem implícita"*. |
| `threat-model.md`, T3 (Alta) | Mitigação inclui *"recuperação fora do dispositivo"*. |

O que faltava não era a decisão. Era o **mecanismo de plataforma que a torna verdadeira no Android**, e a constatação de que a configuração vigente a deixava depender de um XML de biblioteca de terceiro.

Reformulação da pergunta que este documento responde: não *"podemos deixar sair?"* — isso já estava respondido — mas *"o que garante que não sai, sem depender de configuração que alguém possa rebaixar em silêncio?"*

A emenda acrescenta uma coisa ao que já existia: torna explícito que **D2D está incluído na proibição**. As fontes acima nomeiam nuvem e backup automático; nenhuma nomeia transferência aparelho-a-aparelho. Essa lacuna está agora fechada.

### O que isso muda no documento

A seção 3 deixa de ser recomendação técnica e passa a ser **o único caminho conhecido que satisfaz o requisito**. A tabela da seção 6 permanece como registro do raciocínio, mas as alternativas ali listadas estão agora descartadas por política, não apenas por análise comparativa:

| Alternativa | Situação após esta emenda |
|---|---|
| `allowBackup="false"` sozinho | Descartada. Não entrega o requisito — falha em D2D por fabricante, ref. [2]. |
| Regras XML próprias sozinhas | Descartada. Não entrega o requisito — garantia dependente de merge de manifesto. |
| Envelope em `SharedPreferences` | Descartada. Já vedado por `WF-F11`. |
| `getNoBackupFilesDir()` + regras XML explícitas | **Único candidato remanescente.** |

### O que esta emenda NÃO estabelece

Este é o ponto mais importante da emenda, e está aqui para que a decisão não seja lida como verificação.

O proprietário decidiu **o requisito**. A capacidade de cumprir o requisito **não foi verificada**:

- Que `getNoBackupFilesDir()` é excluído de backup em nuvem **e de D2D** é conclusão **documental** (refs. [3], [4], [5]). Nenhum aparelho foi testado.
- A camada MIUI do aparelho de teste **não foi avaliada** quanto a ferramenta de migração proprietária. A pergunta 2 da seção 8 segue aberta e passa a ser a mais importante das quatro.
- Existe precedente direto, neste mesmo documento, de garantia documental que falha por fabricante: é exatamente o que a seção 2 registra sobre `allowBackup="false"`.

Enquanto a seção 7 não for cumprida, a afirmação que o projeto pode sustentar é:

> *O requisito está definido e é normativo. O mecanismo escolhido é o mais forte disponível na plataforma. A conformidade não foi verificada em aparelho.*

Afirmar mais que isso viola `WF-F10`.

### Consequência de recuperação — já normatizada, reafirmada aqui

Se nada sai do aparelho, então aparelho perdido, roubado, quebrado ou formatado leva os fundos junto — a menos que o usuário tenha a mnemonic guardada fora dele, pelas próprias mãos.

Isso é a consequência **pretendida** da autocustódia, não um efeito colateral a mitigar. E já é gate obrigatório: `adr-0001-native-vault.md`, gate 4 — *"Recuperação: UX de backup offline, restauração em aparelho limpo e eliminação testada, sem passphrase na versão inicial."*

Nenhum achado novo é aberto por esta emenda. O gate 4 já cobre o requisito e permanece fechado. Registra-se apenas o reforço: uma carteira que aplique esta emenda e **não** force o usuário a registrar e conferir a mnemonic antes do primeiro recebimento constrói uma armadilha, não uma carteira. O gate 4 é o que impede isso.

### Status após esta emenda

| Dimensão | Estado |
|---|---|
| Política — o requisito | **DECIDIDO.** Proprietário, 27/08/2026. Normativo. |
| Mecanismo — `getNoBackupFilesDir()` | **PROPOSTO.** Sem verificação empírica. |
| Evidência — seção 7, itens 1 a 4 | **PENDENTE.** |
| Revisão adversarial — seção 7, item 5 | **PENDENTE.** |
| Gates da ADR-0001 | **INALTERADOS.** Nenhum segredo real autorizado. |

Esta emenda não libera gate algum, não autoriza provisionamento de segredo, não autoriza Mainnet e não substitui auditoria externa.

---

## Referências

[1] [Back up user data with Auto Backup — Android Developers](https://developer.android.com/identity/data/autobackup)
[2] [Behavior changes: Apps targeting Android 12 — Android Developers](https://developer.android.com/about/versions/12/behavior-changes-12)
[3] [Auto Backup — regras de include/exclude, AOSP](https://android.googlesource.com/platform/frameworks/base/+/f096805%5E!/)
[4] [Commit que introduziu `Context.getNoBackupFilesDir()` — AOSP](https://android.googlesource.com/platform/frameworks/base/+/a7835b6%5E!/)
[5] [Security recommendations for backups — Android Developers](https://developer.android.com/privacy-and-security/risks/backup-best-practices)

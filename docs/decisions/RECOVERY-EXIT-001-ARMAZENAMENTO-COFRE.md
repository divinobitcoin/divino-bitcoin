# RECOVERY-EXIT-001 — Onde o envelope cifrado do cofre deve morar no Android

**Status:** `PROPOSTA — aguarda decisão do proprietário e revisão adversarial`
**Data:** 26 de agosto de 2026
**Impacto:** Alto. Define a fronteira de armazenamento que um dia guardará material de recuperação real.
**Resolve:** `VAULT-BACKUP-001`
**Toca:** `WF-F11` / `INV-006` (proibição de downgrade silencioso de armazenamento), `WF-F2` / `INV-003` (segredo não sai da fronteira aprovada), ameaça `T6` (backup copiado ou restaurado de forma enganosa)
**Não autoriza:** aceitar segredo real de usuário. Os gates da ADR-0001 seguem fechados.

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

## Referências

[1] [Back up user data with Auto Backup — Android Developers](https://developer.android.com/identity/data/autobackup)
[2] [Behavior changes: Apps targeting Android 12 — Android Developers](https://developer.android.com/about/versions/12/behavior-changes-12)
[3] [Auto Backup — regras de include/exclude, AOSP](https://android.googlesource.com/platform/frameworks/base/+/f096805%5E!/)
[4] [Commit que introduziu `Context.getNoBackupFilesDir()` — AOSP](https://android.googlesource.com/platform/frameworks/base/+/a7835b6%5E!/)
[5] [Security recommendations for backups — Android Developers](https://developer.android.com/privacy-and-security/risks/backup-best-practices)

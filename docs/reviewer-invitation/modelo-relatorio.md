# Modelo de Relatório — Revisão Independente do Cofre Nativo

Preencha este modelo para a referência exata revisada. Não inclua credenciais, dados pessoais, seed, chave privada, backup, endereço em uso, invoice, token ou exploração ativa.

## 1. Identificação da revisão

| Campo | Preenchimento |
|---|---|
| Revisor ou organização | `[preencher]` |
| Data de início e conclusão | `[preencher]` |
| Referência revisada | `commit/checkpoint: [preencher]` |
| Conflitos de interesse | `[nenhum / descrever mitigação]` |
| Plataformas avaliadas | `[Android / iOS / TypeScript / build]` |
| Versões relevantes | `Expo, React Native, Kotlin, Swift, Gradle, Xcode: [preencher]` |

## 2. Declaração de escopo

Descreva os arquivos, módulos, configurações e testes examinados. Declare explicitamente que seed, chave, assinatura, Keystore/Keychain real, rede Bitcoin, Lightning e fundos ficaram fora de escopo e não foram introduzidos durante a análise.

## 3. Método e reprodutibilidade

| Atividade | Comando ou método | Resultado resumido | Evidência anexada |
|---|---|---|---|
| Instalação limpa | `[preencher]` | `[passou/falhou]` | `[arquivo ou hash]` |
| Testes automatizados | `[preencher]` | `[passou/falhou]` | `[arquivo ou hash]` |
| TypeScript e lint | `[preencher]` | `[passou/falhou]` | `[arquivo ou hash]` |
| Prebuild/autolinking | `[preencher]` | `[passou/falhou]` | `[arquivo ou hash]` |
| Build Android | `[preencher]` | `[passou/falhou/não executado]` | `[arquivo ou hash]` |
| Teste iOS | `[preencher]` | `[passou/falhou/não executado]` | `[arquivo ou hash]` |
| Busca estática de padrões proibidos | `[preencher]` | `[passou/falhou]` | `[arquivo ou hash]` |

## 4. Matriz de controles

| Controle | Resultado | Evidência | Observação |
|---|---|---|---|
| Inventário de APIs e exports | `[passou/falhou]` | `[referência]` | `[texto]` |
| Paridade Kotlin/Swift | `[passou/falhou/não aplicável]` | `[referência]` | `[texto]` |
| Rejeição controlada e tipagem | `[passou/falhou]` | `[referência]` | `[texto]` |
| Ausência de persistência e criptografia | `[passou/falhou]` | `[referência]` | `[texto]` |
| Ausência de logs, backup e clipboard | `[passou/falhou]` | `[referência]` | `[texto]` |
| Fallback seguro no Expo Go | `[passou/falhou]` | `[referência]` | `[texto]` |
| Reprodutibilidade de build | `[passou/falhou]` | `[referência]` | `[texto]` |
| Guardas negativas e inspeção de artefato | `[passou/falhou]` | `[referência]` | `[texto]` |

## 5. Achados

Registre um item por achado. Um resumo sanitizado basta; detalhes exploráveis devem seguir o canal privado indicado pela política de segurança.

| ID | Severidade | Componente | Pré-condição | Impacto | Reprodução não destrutiva | Recomendação | Estado |
|---|---|---|---|---|---|---|---|
| `DV-001` | `[observação/baixa/média/alta/crítica]` | `[preencher]` | `[preencher]` | `[preencher]` | `[preencher]` | `[preencher]` | `[aberto/corrigido/retestado]` |

Para cada achado médio, alto ou crítico, acrescente uma seção curta explicando a evidência, a condição de exploração, o impacto plausível e a razão da severidade. Não inclua segredo real nem execute ações contra terceiros.

## 6. Decisão e limitações

**Decisão:** `[Aprovado somente como esqueleto / Aprovado condicionalmente / Reprovado]`

**Justificativa:** `[preencher]`

**Condições pendentes e prazo sugerido:** `[preencher]`

> Esta revisão é limitada à referência informada e ao escopo declarado. Ela não constitui garantia de segurança geral e não aprova criação, importação, armazenamento, exportação, assinatura ou recuperação de segredo; também não aprova Signet conectado, Mainnet, Lightning ou qualquer operação com valor econômico.

**Assinatura ou identificação do revisor:** `[preencher]`  
**Data:** `[preencher]`

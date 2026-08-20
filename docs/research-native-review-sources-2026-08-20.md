# Fontes de Referência para Revisão Nativa

**Escopo:** fundamentos externos usados no checklist de revisão independente do cofre nativo.  
**Data:** 20 de agosto de 2026

| Fonte | Achado aplicável | Uso no checklist |
|---|---|---|
| OWASP MASVS-STORAGE | Dados sensíveis devem ser armazenados de forma segura e a aplicação deve prevenir seu vazamento, inclusive por capacidades de plataforma como backups e logs. [1] | Exigir provas negativas para logs, clipboard, backup, cache e persistência fora da fronteira nativa. |
| Android Keystore | Chaves no Keystore permanecem não exportáveis e podem ter uso restringido; porém, um processo comprometido ainda pode conseguir usar uma chave disponível ao app. [2] | Exigir propósito mínimo, autenticação de usuário quando aplicável, avaliação de hardware e não tratar Keystore como garantia absoluta. |
| Apple Keychain | O Keychain protege dados curtos e sensíveis por classes de proteção; acesso e compartilhamento dependem de atributos e entitlements do aplicativo. [3] | Exigir classe de acessibilidade explícita, ausência de sincronização não intencional e revisão dos grupos de acesso antes de persistir segredo. |

Estas referências não autorizam implementação de segredo neste marco. Elas qualificam os controles que deverão ser avaliados antes de qualquer API futura de provisionamento, recuperação ou assinatura.

## Referências

[1]: https://mas.owasp.org/MASVS/05-MASVS-STORAGE/ "OWASP MASVS-STORAGE"
[2]: https://developer.android.com/privacy-and-security/keystore "Android Developers — Android Keystore system"
[3]: https://support.apple.com/guide/security/keychain-data-protection-secb0694df1a/web "Apple Platform Security — Keychain data protection"

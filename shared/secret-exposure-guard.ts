export const SENSITIVE_VAULT_FIELD_NAMES = [
  "channelbackup",
  "mnemonic",
  "passphrase",
  "preimage",
  "privatekey",
  "seed",
  "secret",
  "signedpsbt",
] as const;

export type SecretExposureChannel = "backup" | "clipboard" | "log";

const normalizeFieldName = (fieldName: string) => fieldName.replace(/[-_\s]/g, "").toLowerCase();

function findSensitiveField(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    for (const item of value) {
      const sensitiveField = findSensitiveField(item);
      if (sensitiveField) return sensitiveField;
    }
    return undefined;
  }

  if (!value || typeof value !== "object") return undefined;

  for (const [fieldName, fieldValue] of Object.entries(value)) {
    if (SENSITIVE_VAULT_FIELD_NAMES.includes(normalizeFieldName(fieldName) as (typeof SENSITIVE_VAULT_FIELD_NAMES)[number])) {
      return fieldName;
    }

    const sensitiveField = findSensitiveField(fieldValue);
    if (sensitiveField) return sensitiveField;
  }

  return undefined;
}

/** Impede que um objeto com campos secretos alcance canais de saída não confiáveis. */
export function assertSafeForSecretExposureChannel(
  channel: SecretExposureChannel,
  value: unknown,
): void {
  const sensitiveField = findSensitiveField(value);
  if (sensitiveField) {
    throw new Error(`Dados sensíveis (${sensitiveField}) não podem alcançar ${channel}.`);
  }
}

/** Evento de auditoria propositalmente mínimo e sem dados de carteira. */
export function createPublicVaultAuditEvent(operation: "delete" | "provision" | "unlock", outcome: "blocked" | "unavailable") {
  return { operation, outcome } as const;
}

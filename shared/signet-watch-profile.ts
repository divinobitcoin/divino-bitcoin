import { assertSignetOnly } from "./bitcoin-network";
import {
  lerDescritorWatchOnly,
  SIGNET_ACCOUNT_PATH,
  type SignetWatchOnlyDescriptor,
} from "./signet-watch-descriptor";

const SCHEMA = "divino-watch-only-signet-v1";

export type SignetWatchOnlyProfile = SignetWatchOnlyDescriptor;

export function serializarWatchOnlyProfile(profile: SignetWatchOnlyProfile): string {
  assertSignetOnly(profile.network);
  if (profile.level !== "external-signer") {
    throw new Error("Só o perfil de assinador externo pode ser gravado aqui.");
  }
  return JSON.stringify({
    schema: SCHEMA,
    network: "signet",
    level: "external-signer",
    accountPath: SIGNET_ACCOUNT_PATH,
    masterFingerprint: profile.masterFingerprint,
    accountXpub: profile.accountXpub,
    receiveDescriptor: profile.receiveDescriptor,
    changeDescriptor: profile.changeDescriptor,
    receiveAddress0: profile.receiveAddress0,
  });
}

export function lerWatchOnlyProfileGravado(serialized: string): SignetWatchOnlyProfile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized) as unknown;
  } catch {
    throw new Error("Perfil watch-only ilegível.");
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Perfil watch-only ilegível.");
  }
  const record = parsed as Record<string, unknown>;
  if (record.schema !== SCHEMA) {
    throw new Error("Perfil watch-only de esquema desconhecido. Recusando.");
  }
  if (record.network !== "signet" || record.level !== "external-signer") {
    throw new Error("Perfil watch-only recusado: só Signet, assinador externo.");
  }
  if (typeof record.receiveDescriptor !== "string" || typeof record.masterFingerprint !== "string") {
    throw new Error("Perfil watch-only incompleto.");
  }
  if (typeof record.accountXpub === "string" && /prv/i.test(record.accountXpub)) {
    throw new Error("Perfil watch-only contém material privado. Recusando.");
  }
  const conferido = lerDescritorWatchOnly(
    record.receiveDescriptor,
    record.masterFingerprint,
  );
  if (typeof record.receiveAddress0 === "string" && record.receiveAddress0 !== conferido.receiveAddress0) {
    throw new Error("O endereço 0 gravado não confere com o descritor. Recusando.");
  }
  if (typeof record.accountXpub === "string" && record.accountXpub !== conferido.accountXpub) {
    throw new Error("O tpub gravado não confere com o descritor. Recusando.");
  }
  return conferido;
}

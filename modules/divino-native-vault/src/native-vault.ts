import DivinoNativeVaultModule from "./DivinoNativeVaultModule";
import type {
  AuthorizedSigningIntent,
  DeleteProfileResult,
  NativeVaultCapabilities,
  ProvisionMode,
  PublicDescriptor,
  SignetNetworkId,
  SignetProfileHandle,
} from "./DivinoNativeVault.types";

const VAULT_UNAVAILABLE =
  "Cofre nativo indisponível. Abra o development build; o Expo Go não inclui o módulo. Nenhuma seed foi lida.";

function requireVault() {
  if (!DivinoNativeVaultModule) {
    throw new Error(VAULT_UNAVAILABLE);
  }
  return DivinoNativeVaultModule;
}

function assertSignet(network: string): asserts network is SignetNetworkId {
  if (network !== "signet") {
    throw new Error("Este cofre aceita apenas Bitcoin Signet. Mainnet permanece recusada.");
  }
}

export async function getCapabilities(): Promise<NativeVaultCapabilities> {
  return requireVault().getCapabilitiesAsync();
}

export async function provisionSignetProfile(mode: ProvisionMode): Promise<SignetProfileHandle> {
  if (mode !== "generate" && mode !== "import") {
    throw new Error("Modo de provisionamento inválido. Use generate ou import.");
  }
  const handle = await requireVault().provisionSignetProfile(mode);
  assertSignet(handle.network);
  return handle;
}

export async function getPublicDescriptor(profileId: string): Promise<PublicDescriptor> {
  if (!profileId) {
    throw new Error("profileId ausente.");
  }
  const descriptor = await requireVault().getPublicDescriptor(profileId);
  assertSignet(descriptor.network);
  if (!descriptor.accountXpub.startsWith("tpub")) {
    throw new Error("O descritor público não é tpub. Recusando — este cofre não opera Mainnet.");
  }
  return descriptor;
}

export async function signPsbt(intent: {
  profileId: string;
  network: SignetNetworkId;
  psbtBase64: string;
}): Promise<AuthorizedSigningIntent> {
  assertSignet(intent.network);
  if (!intent.profileId) {
    throw new Error("profileId ausente.");
  }
  if (!intent.psbtBase64.trim()) {
    throw new Error("PSBT ausente.");
  }
  const authorized = await requireVault().signPsbt(intent.profileId, intent.network, intent.psbtBase64.trim());
  assertSignet(authorized.network);
  return authorized;
}

export async function authorizeSigningIntent(intent: {
  profileId: string;
  network: SignetNetworkId;
  psbtBase64: string;
}): Promise<AuthorizedSigningIntent> {
  return signPsbt(intent);
}

export async function deleteProfile(profileId: string): Promise<DeleteProfileResult> {
  if (!profileId) {
    throw new Error("profileId ausente.");
  }
  return requireVault().deleteProfile(profileId);
}

export async function assertSecretExportUnavailable(operation: string): Promise<void> {
  const vault = requireVault();
  try {
    await vault.assertOperationUnavailableAsync(operation);
    throw new Error(`A operação ${operation} deveria ter sido recusada e não foi.`);
  } catch (error) {
    if (error instanceof Error && error.message.includes("deveria ter sido recusada")) {
      throw error;
    }
  }
}

export function isNativeVaultAvailable(): boolean {
  return DivinoNativeVaultModule != null;
}

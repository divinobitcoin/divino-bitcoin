/**
 * Contrato opaco do cofre nativo Signet.
 *
 * O JavaScript só vê estado público. Nenhuma operação aqui devolve mnemonic,
 * seed, chave privada, preimage ou material de assinatura. Não existe
 * `getSeed`, `exportPrivateKey`, `decryptSecret`, `readMnemonic` nem equivalente.
 */

export type NativeVaultStatus = "unprovisioned" | "provisioned";

export type SignetNetworkId = "signet";

/** Somente informações públicas da fronteira nativa; nunca contém segredo. */
export interface NativeVaultCapabilities {
  status: NativeVaultStatus;
  network: SignetNetworkId;
  requiresDevelopmentBuild: true;
  usesNativeBoundary: true;
  supportsSecretProvisioning: true;
  supportsSigning: true;
  profileId: string | null;
  masterFingerprint: string | null;
}

export type ProvisionMode = "generate" | "import";

export type ProvisionSignetProfileRequest = {
  mode: ProvisionMode;
};

/** Handle opaco. Não é derivado do segredo e não gasta nada. */
export type SignetProfileHandle = {
  profileId: string;
  masterFingerprint: string;
  network: SignetNetworkId;
};

export type PublicDescriptor = {
  profileId: string;
  network: SignetNetworkId;
  accountPath: "m/84'/1'/0'";
  masterFingerprint: string;
  accountXpub: string;
  receiveDescriptor: string;
  changeDescriptor: string;
  receiveAddress0: string;
};

export type SigningIntent = {
  profileId: string;
  network: SignetNetworkId;
  psbtBase64: string;
};

/**
 * PSBT depois da assinatura nativa. Não carrega chave.
 * O campo não se chama `signedPsbt` de propósito — esse nome está na lista
 * de material que não pode ir a log, clipboard automático ou backup.
 */
export type AuthorizedSigningIntent = {
  profileId: string;
  network: SignetNetworkId;
  psbtBase64: string;
  signedInputCount: number;
};

export type DeleteProfileResult = {
  deleted: true;
  profileId: string;
};

export interface DivinoNativeVaultModuleInterface {
  getCapabilitiesAsync(): Promise<NativeVaultCapabilities>;
  provisionSignetProfile(mode: ProvisionMode): Promise<SignetProfileHandle>;
  getPublicDescriptor(profileId: string): Promise<PublicDescriptor>;
  signPsbt(profileId: string, network: SignetNetworkId, psbtBase64: string): Promise<AuthorizedSigningIntent>;
  authorizeSigningIntent(profileId: string, network: SignetNetworkId, psbtBase64: string): Promise<AuthorizedSigningIntent>;
  deleteProfile(profileId: string): Promise<DeleteProfileResult>;
  /**
   * Recusa operações que o cofre não oferece e nunca oferecerá nesta
   * fronteira: leitura de segredo, Mainnet, exportação de chave.
   */
  assertOperationUnavailableAsync(operation: string): Promise<never>;
}

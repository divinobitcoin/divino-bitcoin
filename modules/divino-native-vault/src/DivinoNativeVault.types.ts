export type NativeVaultStatus = "skeleton";

/** Somente informações públicas da fronteira nativa; nunca contém segredo. */
export interface NativeVaultCapabilities {
  status: NativeVaultStatus;
  requiresDevelopmentBuild: true;
  usesNativeBoundary: true;
  supportsSecretProvisioning: false;
  supportsSigning: false;
}

export interface DivinoNativeVaultModuleInterface {
  getCapabilitiesAsync(): Promise<NativeVaultCapabilities>;
  assertOperationUnavailableAsync(operation: string): Promise<never>;
}

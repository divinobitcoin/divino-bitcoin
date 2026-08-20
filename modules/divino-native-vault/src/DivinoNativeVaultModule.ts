import { requireOptionalNativeModule } from "expo-modules-core";

import type { DivinoNativeVaultModuleInterface } from "./DivinoNativeVault.types";

/**
 * O development build resolve este módulo local por autolinking. No Expo Go e
 * na web ele é explicitamente opcional, permitindo que o diagnóstico comunique
 * a ausência da fronteira nativa sem uma falha de inicialização.
 */
const DivinoNativeVaultModule = requireOptionalNativeModule<DivinoNativeVaultModuleInterface>("DivinoNativeVault");

export default DivinoNativeVaultModule;

package expo.modules.divinonativevault

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Contrato inicial do cofre nativo. Nenhuma chave, mnemonic ou ciphertext é
 * criado, lido ou persistido neste marco. A implementação futura deverá ficar
 * na fronteira nativa e obedecer à ADR-0001 antes de expor uma operação opaca.
 */
class DivinoNativeVaultModule : Module() {
  /**
   * Mantém o tipo de retorno da função Expo explícito como Unit. Sem essa
   * anotação, uma lambda que apenas lança exceção é inferida como Nothing, tipo
   * que o DSL reificado de AsyncFunction não aceita na compilação Kotlin.
   */
  private fun rejectUnavailableOperation(operation: String): Unit {
    throw IllegalStateException(
      "A operação de cofre '$operation' permanece indisponível até os gates da ADR-0001.",
    )
  }

  override fun definition() = ModuleDefinition {
    Name("DivinoNativeVault")

    AsyncFunction("getCapabilitiesAsync") {
      mapOf(
        "status" to "skeleton",
        "requiresDevelopmentBuild" to true,
        "usesNativeBoundary" to true,
        "supportsSecretProvisioning" to false,
        "supportsSigning" to false,
      )
    }

    AsyncFunction("assertOperationUnavailableAsync") { operation: String ->
      return@AsyncFunction rejectUnavailableOperation(operation)
    }
  }
}

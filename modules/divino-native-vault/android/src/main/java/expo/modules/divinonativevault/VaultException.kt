package expo.modules.divinonativevault

/**
 * Falha categorizada do cofre. A mensagem nunca inclui mnemonic, seed ou chave.
 */
class VaultException(val code: String, message: String) : IllegalStateException(message)

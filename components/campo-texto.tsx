import { TextInput, type TextInputProps } from "react-native";

/**
 * Campo de texto que **nunca** é oferecido ao preenchimento automático do
 * sistema.
 *
 * ## O vazamento que gerou este componente (`AUTOFILL-LEAK-001`)
 *
 * 03/09/2026. O gerenciador de senhas do Google ofereceu, no campo de senha do
 * RPC da tela de saldo, um valor que ele mesmo havia guardado de uma digitação
 * anterior. O proprietário confiou na sugestão; ela veio com um caractere em
 * caixa errada e o nó recusou a credencial com HTTP 401.
 *
 * O erro de digitação foi o sintoma. **O achado é que o valor estava lá.**
 *
 * `secureTextEntry` esconde o texto na tela. Ele **não** impede o Android de
 * expor o campo ao serviço de autofill. A credencial do nó saiu do aparelho e
 * foi parar na conta Google do usuário — numa carteira cujo princípio
 * inegociável é que material sensível não sai do dispositivo.
 *
 * ## Por que vale para TODO campo, e não só para o de senha
 *
 * A senha do RPC de um nó de Signet vale pouco. O resto da tela vale muito:
 *
 * - A **chave estendida da conta** revela todos os endereços da carteira,
 *   passados e futuros. Um xpub no gerenciador de senhas de terceiro é o
 *   histórico inteiro da carteira num servidor que não é do usuário.
 * - **Endereço de destino** e **valor** descrevem para quem o usuário paga e
 *   quanto.
 * - Uma **PSBT** carrega entradas, saídas e o troco.
 *
 * Nada disso tem motivo para ser sincronizado com nuvem nenhuma. Numa carteira
 * Bitcoin, o padrão correto é o oposto do padrão de um formulário de site: o
 * autofill é conveniência para quem digita e-mail o dia inteiro, e é
 * superfície de vazamento para quem digita material de carteira.
 *
 * ## Por que um componente, e não a propriedade em cada campo
 *
 * Porque "lembrar de pôr a propriedade" falha. É a mesma escolha do
 * `guard:lab-boundary` e do `tests/runtime-sem-buffer.test.ts`: quando a
 * propriedade de segurança depende de disciplina humana, ela se perde na
 * próxima tela nova. Aqui ela vem de graça, e `tests/campos-sem-autofill.test.ts`
 * reprova quem usar `<TextInput` cru dentro de `app/`.
 *
 * ## As três propriedades, e o que cada uma cobre
 *
 * As três foram conferidas na tipagem do React Native 0.83.10 deste
 * repositório, não escritas de memória:
 *
 * - `importantForAutofill="no"` — Android. É a que teria impedido o caso real.
 * - `autoComplete="off"` — a dica de conteúdo. Sem ela, o sistema adivinha o
 *   tipo do campo pela heurística e às vezes acerta "senha".
 * - `textContentType="none"` — iOS. O iOS nunca foi verificado neste projeto;
 *   a propriedade entra pelo mesmo motivo que o Android, e **sem** alegação de
 *   que funciona lá (`WF-F10`).
 *
 * ## O que este componente NÃO resolve
 *
 * Teclado de terceiro continua vendo o que é digitado — inclusive em campo de
 * senha. Captura de tela continua possível. Autofill é um caminho de saída,
 * não o único. A correção de fundo é **não digitar credencial no telefone**:
 * o computador mostra um QR, o celular lê. Ver `CRED-DIGITADA-001`.
 */
export function CampoTexto(props: TextInputProps) {
  return (
    <TextInput
      {...props}
      // Depois do spread, de propósito: nenhuma chamada consegue reativar o
      // autofill por engano passando a propriedade.
      autoComplete="off"
      importantForAutofill="no"
      textContentType="none"
    />
  );
}

import UIKit

final class SignetMnemonicViewController: UIViewController {
  var onFinish: ((Result<[String: String], Error>) -> Void)?
  private let store = SignetVaultStore()

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = UIColor(red: 0.03, green: 0.03, blue: 0.03, alpha: 1)
    isModalInPresentation = true
    buildImport()
  }

  private func buildImport() {
    let scroll = makeScroll()
    var y: CGFloat = 24
    func add(_ view: UIView, height: CGFloat) {
      view.frame = CGRect(x: 20, y: y, width: scroll.bounds.width - 40, height: height)
      view.autoresizingMask = [.flexibleWidth]
      scroll.addSubview(view)
      y += height + 10
    }
    add(label("SIGNET · MATERIAL DESCARTÁVEL", size: 11, color: UIColor(red: 0.95, green: 0.66, blue: 0, alpha: 1), bold: true), height: 18)
    add(label("Importar do papel", size: 28, color: UIColor(red: 0.98, green: 0.95, blue: 0.87, alpha: 1), bold: true), height: 36)
    add(label("Experimental, não auditado. Digite as 12 palavras na ordem, sem passphrase. Checksum BIP-39 inválido recusa e não guarda nada.", size: 14, color: UIColor(white: 0.66, alpha: 1), bold: false), height: 80)
    let fields = (0..<12).map { field("\($0 + 1)") }
    fields.forEach { add($0, height: 40) }
    let error = label("", size: 13, color: UIColor(red: 0.97, green: 0.44, blue: 0.44, alpha: 1), bold: false)
    add(error, height: 40)
    let save = button("Importar para o cofre")
    save.addAction(UIAction { [weak self] _ in
      guard let self else { return }
      error.text = ""
      let typed = fields.map { $0.text?.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() ?? "" }
      if typed.contains(where: \.isEmpty) {
        error.text = "Preencha as 12 palavras."
        return
      }
      do {
        try SignetVaultCrypto.validateMnemonic(typed)
        self.persist(typed, error: error, button: save)
      } catch {
        error.text = "Frase BIP-39 inválida."
      }
    }, for: .touchUpInside)
    add(save, height: 48)
    let cancel = button("Cancelar")
    cancel.backgroundColor = UIColor(white: 0.12, alpha: 1)
    cancel.setTitleColor(UIColor(red: 0.98, green: 0.95, blue: 0.87, alpha: 1), for: .normal)
    cancel.addAction(UIAction { [weak self] _ in
      self?.dismiss(animated: true) {
        self?.onFinish?(.failure(VaultException(code: "VAULT_CANCELLED", message: "Provisionamento cancelado.")))
      }
    }, for: .touchUpInside)
    add(cancel, height: 48)
    scroll.contentSize = CGSize(width: view.bounds.width, height: y + 40)
  }

  private func persist(_ words: [String], error: UILabel, button: UIButton) {
    button.isEnabled = false
    DispatchQueue.global(qos: .userInitiated).async {
      do {
        let stored = try self.store.persistNewProfile(words: words)
        DispatchQueue.main.async {
          self.dismiss(animated: true) {
            self.onFinish?(.success(stored))
          }
        }
      } catch {
        DispatchQueue.main.async {
          button.isEnabled = true
          error.text = "O cofre recusou o provisionamento."
        }
      }
    }
  }

  private func makeScroll() -> UIScrollView {
    let scroll = UIScrollView(frame: view.bounds)
    scroll.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    scroll.backgroundColor = view.backgroundColor
    view.addSubview(scroll)
    return scroll
  }

  private func label(_ text: String, size: CGFloat, color: UIColor, bold: Bool) -> UILabel {
    let view = UILabel()
    view.text = text
    view.textColor = color
    view.font = bold ? .boldSystemFont(ofSize: size) : .systemFont(ofSize: size)
    view.numberOfLines = 0
    return view
  }

  private func field(_ placeholder: String) -> UITextField {
    let field = UITextField()
    field.placeholder = placeholder
    field.textColor = UIColor(red: 0.98, green: 0.95, blue: 0.87, alpha: 1)
    field.backgroundColor = UIColor(white: 0.11, alpha: 1)
    field.autocorrectionType = .no
    field.autocapitalizationType = .none
    field.spellCheckingType = .no
    field.textContentType = .none
    field.isSecureTextEntry = false
    return field
  }

  private func button(_ title: String) -> UIButton {
    let button = UIButton(type: .system)
    button.setTitle(title, for: .normal)
    button.setTitleColor(UIColor(red: 0.03, green: 0.03, blue: 0.03, alpha: 1), for: .normal)
    button.backgroundColor = UIColor(red: 0.95, green: 0.66, blue: 0, alpha: 1)
    button.titleLabel?.font = .boldSystemFont(ofSize: 16)
    return button
  }
}

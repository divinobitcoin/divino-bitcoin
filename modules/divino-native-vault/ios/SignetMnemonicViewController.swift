import UIKit

final class SignetMnemonicViewController: UIViewController {
  enum Mode { case generate, importPhrase }

  var onFinish: ((Result<[String: String], Error>) -> Void)?

  private let mode: Mode
  private var words: [String] = []
  private let store = SignetVaultStore()
  private var confirmA = 0
  private var confirmB = 1

  init(mode: Mode) {
    self.mode = mode
    super.init(nibName: nil, bundle: nil)
    modalPresentationStyle = .fullScreen
  }

  required init?(coder: NSCoder) { nil }

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = UIColor(red: 0.03, green: 0.03, blue: 0.03, alpha: 1)
    if mode == .generate {
      do {
        words = try SignetVaultCrypto.generateMnemonic()
        confirmA = Int.random(in: 0..<words.count)
        confirmB = (confirmA + 7) % words.count
        buildGenerate()
      } catch {
        fail(error)
      }
    } else {
      buildImport()
    }
  }

  override var prefersStatusBarHidden: Bool { false }

  private func buildGenerate() {
    let scroll = makeScroll()
    var y: CGFloat = 24
    func add(_ view: UIView, height: CGFloat) {
      view.frame = CGRect(x: 20, y: y, width: scroll.bounds.width - 40, height: height)
      view.autoresizingMask = [.flexibleWidth]
      scroll.addSubview(view)
      y += height + 12
    }
    add(label("SIGNET · MATERIAL DESCARTÁVEL", size: 11, color: UIColor(red: 0.95, green: 0.66, blue: 0, alpha: 1), bold: true), height: 18)
    add(label("Anote estas palavras", size: 28, color: UIColor(red: 0.98, green: 0.95, blue: 0.87, alpha: 1), bold: true), height: 36)
    add(label("Experimental, não auditado. Escreva em papel. Não fotografe, não envie, não copie para a nuvem.", size: 14, color: UIColor(white: 0.66, alpha: 1), bold: false), height: 70)
    for (index, word) in words.enumerated() {
      add(label("\(index + 1)  \(word)", size: 16, color: UIColor(red: 0.98, green: 0.95, blue: 0.87, alpha: 1), bold: false), height: 24)
    }
    let checkbox = UISwitch()
    let checkRow = UIView()
    let checkLabel = label("Escrevi as 12 palavras em papel.", size: 14, color: UIColor(red: 0.98, green: 0.95, blue: 0.87, alpha: 1), bold: false)
    checkRow.addSubview(checkbox)
    checkRow.addSubview(checkLabel)
    checkbox.frame = CGRect(x: 0, y: 4, width: 51, height: 31)
    checkLabel.frame = CGRect(x: 60, y: 0, width: 260, height: 40)
    add(checkRow, height: 40)
    add(label("Confirme a palavra \(confirmA + 1) e a palavra \(confirmB + 1).", size: 14, color: UIColor(white: 0.66, alpha: 1), bold: false), height: 36)
    let fieldA = field("Palavra \(confirmA + 1)")
    let fieldB = field("Palavra \(confirmB + 1)")
    add(fieldA, height: 44)
    add(fieldB, height: 44)
    let error = label("", size: 13, color: UIColor(red: 0.97, green: 0.44, blue: 0.44, alpha: 1), bold: false)
    add(error, height: 40)
    let save = button("Guardar no cofre")
    save.addAction(UIAction { [weak self] _ in
      guard let self else { return }
      error.text = ""
      guard checkbox.isOn else {
        error.text = "Marque que anotou as palavras antes de guardar."
        return
      }
      guard fieldA.text?.trimmingCharacters(in: .whitespaces).lowercased() == self.words[self.confirmA],
            fieldB.text?.trimmingCharacters(in: .whitespaces).lowercased() == self.words[self.confirmB]
      else {
        error.text = "A confirmação não confere. As palavras não foram guardadas."
        return
      }
      self.persist(self.words, error: error, button: save)
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
    add(label("Importar frase de teste", size: 28, color: UIColor(red: 0.98, green: 0.95, blue: 0.87, alpha: 1), bold: true), height: 36)
    add(label("Experimental, não auditado. Digite uma frase descartável. Nunca importe uma seed com valor.", size: 14, color: UIColor(white: 0.66, alpha: 1), bold: false), height: 70)
    let fields = (0..<24).map { field("\($0 + 1)") }
    fields.forEach { add($0, height: 40) }
    let error = label("", size: 13, color: UIColor(red: 0.97, green: 0.44, blue: 0.44, alpha: 1), bold: false)
    add(error, height: 40)
    let save = button("Importar para o cofre")
    save.addAction(UIAction { [weak self] _ in
      guard let self else { return }
      let typed = fields.map { $0.text?.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() ?? "" }.filter { !$0.isEmpty }
      do {
        try SignetVaultCrypto.validateMnemonic(typed)
        self.persist(typed, error: error, button: save)
      } catch let failure {
        error.text = (failure as? VaultException)?.message ?? "Frase inválida."
      }
    }, for: .touchUpInside)
    add(save, height: 48)
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
          error.text = (error as? VaultException)?.message ?? "O cofre recusou o provisionamento."
        }
      }
    }
  }

  private func fail(_ error: Error) {
    let alert = UIAlertController(title: "Cofre recusado", message: error.localizedDescription, preferredStyle: .alert)
    alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in
      self.dismiss(animated: true) {
        self.onFinish?(.failure(error))
      }
    })
    present(alert, animated: true)
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
    if #available(iOS 12.0, *) {
      field.textContentType = .oneTimeCode
      field.textContentType = .none
    }
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

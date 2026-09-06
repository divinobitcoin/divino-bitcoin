import UIKit
import Security

final class SignetMnemonicQuizViewController: UIViewController {
  var onSuccess: (([String: String]) -> Void)?
  var onAbort: ((VaultException) -> Void)?
  private let store = SignetVaultStore()

  override var supportedInterfaceOrientations: UIInterfaceOrientationMask { .portrait }

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = UIColor(red: 0.03, green: 0.03, blue: 0.03, alpha: 1)
    isModalInPresentation = true
    guard let words = SignetProvisionSession.words(), words.count == 12,
          let pair = drawDistinctQuizIndices() else {
      let error = VaultException(code: "VAULT_CANCELLED", message: "A sessão em memória esvaziou. O envelope ainda não existe.")
      dismiss(animated: true) { [weak self] in
        self?.onAbort?(error)
      }
      return
    }
    buildQuiz(words: words, indexA: pair.0, indexB: pair.1)
  }

  private func drawDistinctQuizIndices() -> (Int, Int)? {
    let bound = 12
    guard let first = uniformQuizIndex(bound),
          var second = uniformQuizIndex(bound - 1) else {
      return nil
    }
    if second >= first {
      second += 1
    }
    return (first, second)
  }

  private func uniformQuizIndex(_ bound: Int) -> Int? {
    let limit = UInt32.max - (UInt32.max % UInt32(bound))
    var bytes = [UInt8](repeating: 0, count: 4)
    for _ in 0..<32 {
      let status = bytes.withUnsafeMutableBytes { raw in
        SecRandomCopyBytes(kSecRandomDefault, 4, raw.baseAddress!)
      }
      guard status == errSecSuccess else { return nil }
      let unsigned = bytes.reduce(UInt32(0)) { ($0 << 8) | UInt32($1) }
      if unsigned < limit {
        return Int(unsigned % UInt32(bound))
      }
    }
    return nil
  }

  private func buildQuiz(words: [String], indexA: Int, indexB: Int) {
    let scroll = makeScroll()
    var y: CGFloat = 24
    func add(_ view: UIView, height: CGFloat) {
      view.frame = CGRect(x: 20, y: y, width: scroll.bounds.width - 40, height: height)
      view.autoresizingMask = [.flexibleWidth]
      scroll.addSubview(view)
      y += height + 12
    }
    add(label("SIGNET · MATERIAL DESCARTÁVEL", size: 11, color: UIColor(red: 0.95, green: 0.66, blue: 0, alpha: 1), bold: true), height: 18)
    add(label("Confirme no papel", size: 28, color: UIColor(red: 0.98, green: 0.95, blue: 0.87, alpha: 1), bold: true), height: 36)
    add(label("A lista não está nesta tela de propósito. Digite a palavra \(indexA + 1) e a palavra \(indexB + 1). Se errar, volta à lista — o cofre ainda não guardou nada.", size: 14, color: UIColor(white: 0.66, alpha: 1), bold: false), height: 80)
    let fieldA = field("Palavra \(indexA + 1)")
    let fieldB = field("Palavra \(indexB + 1)")
    add(fieldA, height: 44)
    add(fieldB, height: 44)
    let error = label("", size: 13, color: UIColor(red: 0.97, green: 0.44, blue: 0.44, alpha: 1), bold: false)
    add(error, height: 40)
    let confirm = button("Confirmar e guardar")
    confirm.addAction(UIAction { [weak self] _ in
      guard let self else { return }
      let typedA = fieldA.text?.trimmingCharacters(in: .whitespaces).lowercased() ?? ""
      let typedB = fieldB.text?.trimmingCharacters(in: .whitespaces).lowercased() ?? ""
      if typedA != words[indexA] || typedB != words[indexB] {
        self.dismiss(animated: true)
        return
      }
      self.persistAfterQuiz(words, button: confirm)
    }, for: .touchUpInside)
    add(confirm, height: 48)
    let back = button("Voltar à lista")
    back.backgroundColor = UIColor(white: 0.12, alpha: 1)
    back.setTitleColor(UIColor(red: 0.98, green: 0.95, blue: 0.87, alpha: 1), for: .normal)
    back.addAction(UIAction { [weak self] _ in
      self?.dismiss(animated: true)
    }, for: .touchUpInside)
    add(back, height: 48)
    scroll.contentSize = CGSize(width: view.bounds.width, height: y + 40)
  }

  private func persistAfterQuiz(_ words: [String], button: UIButton) {
    button.isEnabled = false
    DispatchQueue.global(qos: .userInitiated).async {
      do {
        let stored = try self.store.persistNewProfile(words: words)
        SignetProvisionSession.clear()
        DispatchQueue.main.async {
          self.dismiss(animated: true) {
            self.onSuccess?(stored)
          }
        }
      } catch {
        DispatchQueue.main.async {
          let failure = VaultException(code: "VAULT_PERSIST", message: "O Keychain recusou gravar o envelope. Nada foi guardado.")
          self.dismiss(animated: true) {
            self.onAbort?(failure)
          }
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

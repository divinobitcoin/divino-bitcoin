import UIKit

final class SignetMnemonicRevealViewController: UIViewController {
  var onFinish: ((Result<[String: String], Error>) -> Void)?

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = UIColor(red: 0.03, green: 0.03, blue: 0.03, alpha: 1)
    isModalInPresentation = true
    if SignetProvisionSession.words() == nil {
      do {
        SignetProvisionSession.begin(try SignetVaultCrypto.generateMnemonic())
      } catch {
        fail(error)
        return
      }
    }
    guard let words = SignetProvisionSession.words() else {
      fail(VaultException(code: "VAULT_REFUSED", message: "Sem frase em curso."))
      return
    }
    buildReveal(words)
  }

  private func buildReveal(_ words: [String]) {
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
    add(label("Experimental, não auditado. Escreva em papel. Não fotografe, não envie, não copie. O cofre ainda não guardou nada — só depois do quiz.", size: 14, color: UIColor(white: 0.66, alpha: 1), bold: false), height: 80)
    for (index, word) in words.enumerated() {
      let chip = label("\(index + 1)  \(word)", size: 16, color: UIColor(red: 0.98, green: 0.95, blue: 0.87, alpha: 1), bold: false)
      chip.isUserInteractionEnabled = false
      add(chip, height: 24)
    }
    let wrote = button("Anotei no papel")
    wrote.addAction(UIAction { [weak self] _ in
      self?.openQuiz()
    }, for: .touchUpInside)
    add(wrote, height: 48)
    let cancel = button("Cancelar")
    cancel.backgroundColor = UIColor(white: 0.12, alpha: 1)
    cancel.setTitleColor(UIColor(red: 0.98, green: 0.95, blue: 0.87, alpha: 1), for: .normal)
    cancel.addAction(UIAction { [weak self] _ in
      SignetProvisionSession.clear()
      self?.dismiss(animated: true) {
        self?.onFinish?(.failure(VaultException(code: "VAULT_CANCELLED", message: "Provisionamento cancelado.")))
      }
    }, for: .touchUpInside)
    add(cancel, height: 48)
    scroll.contentSize = CGSize(width: view.bounds.width, height: y + 40)
  }

  private func openQuiz() {
    let quiz = SignetMnemonicQuizViewController()
    quiz.onSuccess = { [weak self] stored in
      self?.dismiss(animated: true) {
        self?.onFinish?(.success(stored))
      }
    }
    present(quiz, animated: true)
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

  private func button(_ title: String) -> UIButton {
    let button = UIButton(type: .system)
    button.setTitle(title, for: .normal)
    button.setTitleColor(UIColor(red: 0.03, green: 0.03, blue: 0.03, alpha: 1), for: .normal)
    button.backgroundColor = UIColor(red: 0.95, green: 0.66, blue: 0, alpha: 1)
    button.titleLabel?.font = .boldSystemFont(ofSize: 16)
    return button
  }
}

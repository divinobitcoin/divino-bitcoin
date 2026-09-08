import { describe, expect, it } from "vitest";

import { matrizQr } from "../shared/qr-matriz";

describe("matrizQr", () => {
  it("produz matriz quadrada com os três encontradores", () => {
    const matriz = matrizQr("HELLO");
    expect(matriz.length).toBeGreaterThanOrEqual(21);
    expect(matriz[0]).toHaveLength(matriz.length);
    const n = matriz.length;
    const finder = (x: number, y: number) => {
      expect(matriz[y]![x]).toBe(true);
      expect(matriz[y]![x + 6]).toBe(true);
      expect(matriz[y + 6]![x]).toBe(true);
      expect(matriz[y + 6]![x + 6]).toBe(true);
      expect(matriz[y + 1]![x + 1]).toBe(false);
      expect(matriz[y + 3]![x + 3]).toBe(true);
    };
    finder(0, 0);
    finder(n - 7, 0);
    finder(0, n - 7);
  });

  it("recusa payload maior que a versão 20", () => {
    expect(() => matrizQr("x".repeat(900))).toThrow(/grande demais|Base64/);
  });
});

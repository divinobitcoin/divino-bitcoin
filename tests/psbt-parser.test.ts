import { describe, expect, it } from "vitest";

import { parsePublicTestPsbt, type PsbtNetwork } from "../shared/psbt-parser";

/**
 * Todos os vetores abaixo vêm literalmente da especificação oficial do
 * BIP-174 (https://bips.dev/174/), seção "Test Vectors". São PSBTs
 * artificiais publicados para interoperabilidade — não têm relação com
 * fundos ou chaves de nenhum usuário.
 */

describe("parsePublicTestPsbt — vetores VÁLIDOS do BIP-174", () => {
  it("PSBT com um input P2PKH, outputs vazios", () => {
    const b64 =
      "cHNidP8BAHUCAAAAASaBcTce3/KF6Tet7qSze3gADAVmy7OtZGQXE8pCFxv2AAAAAAD+////AtPf9QUAAAAAGXapFNDFmQPFusKGh2DpD9UhpGZap2UgiKwA4fUFAAAAABepFDVF5uM7gyxHBQ8k0+65PJwDlIvHh7MuEwAAAQD9pQEBAAAAAAECiaPHHqtNIOA3G7ukzGmPopXJRjr6Ljl/hTPMti+VZ+UBAAAAFxYAFL4Y0VKpsBIDna89p95PUzSe7LmF/////4b4qkOnHf8USIk6UwpyN+9rRgi7st0tAXHmOuxqSJC0AQAAABcWABT+Pp7xp0XpdNkCxDVZQ6vLNL1TU/////8CAMLrCwAAAAAZdqkUhc/xCX/Z4Ai7NK9wnGIZeziXikiIrHL++E4sAAAAF6kUM5cluiHv1irHU6m80GfWx6ajnQWHAkcwRAIgJxK+IuAnDzlPVoMR3HyppolwuAJf3TskAinwf4pfOiQCIAGLONfc0xTnNMkna9b7QPZzMlvEuqFEyADS8vAtsnZcASED0uFWdJQbrUqZY3LLh+GFbTZSYG2YVi/jnF6efkE/IQUCSDBFAiEA0SuFLYXc2WHS9fSrZgZU327tzHlMDDPOXMMJ/7X85Y0CIGczio4OFyXBl/saiK9Z9R5E5CVbIBZ8hoQDHAXR8lkqASECI7cr7vCWXRC+B3jv7NYfysb3mk6haTkzgHNEZPhPKrMAAAAAAAAA";

    const result = parsePublicTestPsbt(b64, "mainnet");

    expect(result).toEqual({
      version: 2,
      inputCount: 1,
      outputCount: 2,
      outputs: [
        { address: "1L2tGENeoh4mSoiUZrSbs1J3jazSdJH9QS", amountSats: 99999699 },
        { address: "36YhUacEtcnkfhSbxwm11wDCexLGBLgJF6", amountSats: 100000000 },
      ],
    });

    const signetResult = parsePublicTestPsbt(b64, "signet");
    expect(signetResult.outputs[0]?.address).toMatch(/^[mn2]/);
  });

  it("PSBT com 0 inputs", () => {
    const b64 =
      "cHNidP8BAEwCAAAAAALT3/UFAAAAABl2qRTQxZkDxbrChodg6Q/VIaRmWqdlIIisAOH1BQAAAAAXqRQ1RebjO4MsRwUPJNPuuTycA5SLx4ezLhMAAAAA";

    const result = parsePublicTestPsbt(b64, "mainnet");

    expect(result).toEqual({
      version: 2,
      inputCount: 0,
      outputCount: 2,
      outputs: [
        { address: "1L2tGENeoh4mSoiUZrSbs1J3jazSdJH9QS", amountSats: 99999699 },
        { address: "36YhUacEtcnkfhSbxwm11wDCexLGBLgJF6", amountSats: 100000000 },
      ],
    });
  });

  it("PSBT com transação global de 0 inputs e 0 outputs", () => {
    const b64 = "cHNidP8BAAoAAAAAAAAAAAAAAA==";

    const result = parsePublicTestPsbt(b64, "mainnet");

    // A própria transação embutida no vetor tem version=0 (caso degenerado
    // deliberado do BIP, não um valor típico de transação real).
    expect(result).toEqual({ version: 0, inputCount: 0, outputCount: 0, outputs: [] });
  });

  it("PSBT com tipos desconhecidos nos inputs (deve aceitar e preservar)", () => {
    const b64 =
      "cHNidP8BAD8CAAAAAf//////////////////////////////////////////AAAAAAD/////AQAAAAAAAAAAA2oBAAAAAAAACvABAgMEBQYHCAkPAQIDBAUGBwgJCgsMDQ4PAAA=";

    const result = parsePublicTestPsbt(b64, "mainnet");

    // Output com script não padrão (não decodifica pra endereço) — vem
    // com address vazio em vez de lançar erro, já que o parsing em si
    // funcionou corretamente.
    expect(result).toEqual({
      version: 2,
      inputCount: 1,
      outputCount: 1,
      outputs: [{ address: "", amountSats: 0 }],
    });
  });
});

describe("parsePublicTestPsbt — vetores INVÁLIDOS do BIP-174 (devem ser recusados)", () => {
  it("rejeita uma transação de rede normal (não é PSBT)", () => {
    const b64 =
      "AgAAAAEmgXE3Ht/yhek3re6ks3t4AAwFZsuzrWRkFxPKQhcb9gAAAABqRzBEAiBwsiRRI+a/R01gxbUMBD1MaRpdJDXwmjSnZiqdwlF5CgIgATKcqdrPKAvfMHQOwDkEIkIsgctFg5RXrrdvwS7dlbMBIQJlfRGNM1e44PTCzUbbezn22cONmnCry5st5dyNv+TOMf7///8C09/1BQAAAAAZdqkU0MWZA8W6woaHYOkP1SGkZlqnZSCIrADh9QUAAAAAF6kUNUXm4zuDLEcFDyTT7rk8nAOUi8eHsy4TAA==";

    expect(() => parsePublicTestPsbt(b64, "mainnet")).toThrow();
  });

  it("rejeita PSBT com separador de outputs ausente", () => {
    const b64 =
      "cHNidP8BAHUCAAAAASaBcTce3/KF6Tet7qSze3gADAVmy7OtZGQXE8pCFxv2AAAAAAD+////AtPf9QUAAAAAGXapFNDFmQPFusKGh2DpD9UhpGZap2UgiKwA4fUFAAAAABepFDVF5uM7gyxHBQ8k0+65PJwDlIvHh7MuEwAAAQD9pQEBAAAAAAECiaPHHqtNIOA3G7ukzGmPopXJRjr6Ljl/hTPMti+VZ+UBAAAAFxYAFL4Y0VKpsBIDna89p95PUzSe7LmF/////4b4qkOnHf8USIk6UwpyN+9rRgi7st0tAXHmOuxqSJC0AQAAABcWABT+Pp7xp0XpdNkCxDVZQ6vLNL1TU/////8CAMLrCwAAAAAZdqkUhc/xCX/Z4Ai7NK9wnGIZeziXikiIrHL++E4sAAAAF6kUM5cluiHv1irHU6m80GfWx6ajnQWHAkcwRAIgJxK+IuAnDzlPVoMR3HyppolwuAJf3TskAinwf4pfOiQCIAGLONfc0xTnNMkna9b7QPZzMlvEuqFEyADS8vAtsnZcASED0uFWdJQbrUqZY3LLh+GFbTZSYG2YVi/jnF6efkE/IQUCSDBFAiEA0SuFLYXc2WHS9fSrZgZU327tzHlMDDPOXMMJ/7X85Y0CIGczio4OFyXBl/saiK9Z9R5E5CVbIBZ8hoQDHAXR8lkqASECI7cr7vCWXRC+B3jv7NYfysb3mk6haTkzgHNEZPhPKrMAAAAAAA==";

    expect(() => parsePublicTestPsbt(b64, "mainnet")).toThrow();
  });

  it("rejeita PSBT sem a transação não assinada global obrigatória", () => {
    const b64 =
      "cHNidP8AAQD9pQEBAAAAAAECiaPHHqtNIOA3G7ukzGmPopXJRjr6Ljl/hTPMti+VZ+UBAAAAFxYAFL4Y0VKpsBIDna89p95PUzSe7LmF/////4b4qkOnHf8USIk6UwpyN+9rRgi7st0tAXHmOuxqSJC0AQAAABcWABT+Pp7xp0XpdNkCxDVZQ6vLNL1TU/////8CAMLrCwAAAAAZdqkUhc/xCX/Z4Ai7NK9wnGIZeziXikiIrHL++E4sAAAAF6kUM5cluiHv1irHU6m80GfWx6ajnQWHAkcwRAIgJxK+IuAnDzlPVoMR3HyppolwuAJf3TskAinwf4pfOiQCIAGLONfc0xTnNMkna9b7QPZzMlvEuqFEyADS8vAtsnZcASED0uFWdJQbrUqZY3LLh+GFbTZSYG2YVi/jnF6efkE/IQUCSDBFAiEA0SuFLYXc2WHS9fSrZgZU327tzHlMDDPOXMMJ/7X85Y0CIGczio4OFyXBl/saiK9Z9R5E5CVbIBZ8hoQDHAXR8lkqASECI7cr7vCWXRC+B3jv7NYfysb3mk6haTkzgHNEZPhPKrMAAAAAAA==";

    expect(() => parsePublicTestPsbt(b64, "mainnet")).toThrow();
  });

  it("rejeita PSBT com chaves duplicadas em um input", () => {
    const b64 =
      "cHNidP8BAHUCAAAAASaBcTce3/KF6Tet7qSze3gADAVmy7OtZGQXE8pCFxv2AAAAAAD+////AtPf9QUAAAAAGXapFNDFmQPFusKGh2DpD9UhpGZap2UgiKwA4fUFAAAAABepFDVF5uM7gyxHBQ8k0+65PJwDlIvHh7MuEwAAAQD9pQEBAAAAAAECiaPHHqtNIOA3G7ukzGmPopXJRjr6Ljl/hTPMti+VZ+UBAAAAFxYAFL4Y0VKpsBIDna89p95PUzSe7LmF/////4b4qkOnHf8USIk6UwpyN+9rRgi7st0tAXHmOuxqSJC0AQAAABcWABT+Pp7xp0XpdNkCxDVZQ6vLNL1TU/////8CAMLrCwAAAAAZdqkUhc/xCX/Z4Ai7NK9wnGIZeziXikiIrHL++E4sAAAAF6kUM5cluiHv1irHU6m80GfWx6ajnQWHAkcwRAIgJxK+IuAnDzlPVoMR3HyppolwuAJf3TskAinwf4pfOiQCIAGLONfc0xTnNMkna9b7QPZzMlvEuqFEyADS8vAtsnZcASED0uFWdJQbrUqZY3LLh+GFbTZSYG2YVi/jnF6efkE/IQUCSDBFAiEA0SuFLYXc2WHS9fSrZgZU327tzHlMDDPOXMMJ/7X85Y0CIGczio4OFyXBl/saiK9Z9R5E5CVbIBZ8hoQDHAXR8lkqASECI7cr7vCWXRC+B3jv7NYfysb3mk6haTkzgHNEZPhPKrMAAAAAAQA/AgAAAAH//////////////////////////////////////////wAAAAAA/////wEAAAAAAAAAAANqAQAAAAAAAAAA";

    expect(() => parsePublicTestPsbt(b64, "mainnet")).toThrow();
  });
});


describe("parsePublicTestPsbt — contrato explícito de rede", () => {
  const emptyPsbt = "cHNidP8BAAoAAAAAAAAAAAAAAA==";

  it("rejeita rede ausente", () => {
    const parseWithoutNetwork = parsePublicTestPsbt as unknown as (
      psbt: string,
      network?: PsbtNetwork,
    ) => unknown;

    expect(() => parseWithoutNetwork(emptyPsbt)).toThrow(/network is required/i);
  });

  it("rejeita rede desconhecida", () => {
    expect(() => parsePublicTestPsbt(emptyPsbt, "testnet" as PsbtNetwork)).toThrow(
      /network is required/i,
    );
  });
});


describe("parsePublicTestPsbt — distinção SegWit por rede", () => {
  const p2wpkhPsbt =
    "cHNidP8BAgQCAAAAAQQBAAEFAQEB+wQCAAAAAAEDCOgDAAAAAAAAAQQWABTAzrzWw9PKjHXcXsYuvlUzDvkQ4gA=";

  it("codifica o mesmo witness output como bc1 em Mainnet e tb1 em Signet", () => {
    const mainnetResult = parsePublicTestPsbt(p2wpkhPsbt, "mainnet");
    const signetResult = parsePublicTestPsbt(p2wpkhPsbt, "signet");

    expect(mainnetResult.outputs[0]?.address).toBe("bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu");
    expect(signetResult.outputs[0]?.address).toBe("tb1qcr8te4kr609gcawutmrza0j4xv80jy8zmfp6l0");
  });
});

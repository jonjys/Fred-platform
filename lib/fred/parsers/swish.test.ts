import { describe, expect, it } from "vitest";
import { parseSwish } from "./swish";

describe("parseSwish", () => {
  it("extracts amount and phone from natural Swedish text", () => {
    expect(parseSwish("Skicka 250 kr till 070-123 45 67")).toEqual(
      expect.objectContaining({ amount: 250, phone: "0701234567" }),
    );
  });

  it("returns null when neither amount nor phone is present", () => {
    expect(parseSwish("bara lite text utan nagot")).toBeNull();
  });

  it("extracts OCR and message when present", () => {
    const result = parseSwish("500 kr, OCR: 123456789, meddelande: hyra augusti");
    expect(result?.ocr).toBe("123456789");
    expect(result?.message).toBe("hyra augusti");
  });
});

import { describe, expect, it } from "vitest";
import { applyTextModifiers, randomNumberToken } from "./modifiers";

function sequence(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

describe("randomNumberToken", () => {
  it("builds plain numbers, decimals and percentages", () => {
    expect(randomNumberToken(sequence([0, 0.99, 0.25]))).toBe("2500");
    expect(randomNumberToken(sequence([0.8, 0, 0, 0.5]))).toBe("0.50");
    expect(randomNumberToken(sequence([0.9, 0.99, 0.5]))).toBe("5000%");
  });
});

describe("applyTextModifiers", () => {
  it("leaves text untouched when both modifiers are off", () => {
    expect(applyTextModifiers("the cat sat", { punctuation: false, numbers: false, capitalizeFirst: true })).toBe(
      "the cat sat"
    );
  });

  it("capitalizes the first word only when starting a sentence", () => {
    expect(
      applyTextModifiers("the cat sat", {
        punctuation: true,
        numbers: false,
        capitalizeFirst: true,
        rand: sequence([0.99]),
      })
    ).toBe("The cat sat");
    expect(
      applyTextModifiers("the cat sat", {
        punctuation: true,
        numbers: false,
        capitalizeFirst: false,
        rand: sequence([0.99]),
      })
    ).toBe("the cat sat");
  });

  it("appends punctuation and capitalizes the next sentence", () => {
    expect(
      applyTextModifiers("the cat sat", {
        punctuation: true,
        numbers: false,
        capitalizeFirst: true,
        rand: sequence([0, 0.5, 0.99, 0.99]),
      })
    ).toBe("The. Cat sat");
  });

  it("replaces some words with numbers", () => {
    expect(
      applyTextModifiers("the cat sat", {
        punctuation: false,
        numbers: true,
        capitalizeFirst: true,
        rand: sequence([0, 0, 0.99, 0.5, 0.99, 0.99]),
      })
    ).toBe("5000 cat sat");
  });

  it("keeps non-cased scripts intact", () => {
    expect(
      applyTextModifiers("שלום עולם", {
        punctuation: true,
        numbers: false,
        capitalizeFirst: true,
        rand: sequence([0.99]),
      })
    ).toBe("שלום עולם");
  });
});

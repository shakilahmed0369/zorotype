import { describe, expect, it } from "vitest";
import { shortKeyLabel } from "./key-labels";

describe("shortKeyLabel", () => {
  it("shortens the long function key legends", () => {
    expect(shortKeyLabel("Backspace")).toBe("Back");
    expect(shortKeyLabel("BACKSPACE")).toBe("Back");
    expect(shortKeyLabel("BSPC")).toBe("Back");
    expect(shortKeyLabel("Delete")).toBe("Del");
    expect(shortKeyLabel("CAPSLOCK")).toBe("Caps");
    expect(shortKeyLabel("Escape")).toBe("Esc");
    expect(shortKeyLabel("PrintScreen")).toBe("PrtSc");
    expect(shortKeyLabel("PageDown")).toBe("PgDn");
  });

  it("names the modifiers the way keycaps do", () => {
    expect(shortKeyLabel("LSHFT")).toBe("Shift");
    expect(shortKeyLabel("RSHFT")).toBe("Shift");
    expect(shortKeyLabel("LCTRL")).toBe("Ctrl");
    expect(shortKeyLabel("LALT")).toBe("Alt");
    expect(shortKeyLabel("LGUI")).toBe("Win");
  });

  it("draws arrows as arrows", () => {
    expect(shortKeyLabel("UP_ARROW")).toBe("↑");
    expect(shortKeyLabel("LEFT")).toBe("←");
    expect(shortKeyLabel("RIGHT_ARROW")).toBe("→");
    expect(shortKeyLabel("DOWN")).toBe("↓");
  });

  it("shortens media and brightness keys", () => {
    expect(shortKeyLabel("C_VOL_UP")).toBe("Vol+");
    expect(shortKeyLabel("C_VOL_DN")).toBe("Vol-");
    expect(shortKeyLabel("C_MUTE")).toBe("Mute");
    expect(shortKeyLabel("BRI_UP")).toBe("Bri+");
  });

  it("leaves characters, symbols and short labels untouched", () => {
    expect(shortKeyLabel("Q")).toBe("Q");
    expect(shortKeyLabel("a")).toBe("a");
    expect(shortKeyLabel("(")).toBe("(");
    expect(shortKeyLabel("MO")).toBe("MO");
    expect(shortKeyLabel("BT")).toBe("BT");
    expect(shortKeyLabel("Enter")).toBe("Enter");
    expect(shortKeyLabel("F5")).toBe("F5");
  });
});

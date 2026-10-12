// Keycap legends are short — a 50px key cannot render "Backspace". Labels are drawn through this
// formatter, while the underlying label keeps its canonical spelling for matching and scoring.
const LEGEND_GROUPS: Array<[display: string, aliases: string[]]> = [
  ["Back", ["BSPC", "BACKSPACE", "BACK_SPACE"]],
  ["Shift", ["SHIFT", "LSHFT", "RSHFT", "LSHIFT", "RSHIFT", "LEFT_SHIFT", "RIGHT_SHIFT"]],
  ["Ctrl", ["CONTROL", "CTRL", "LCTRL", "RCTRL", "LCTL", "RCTL", "LEFT_CONTROL", "RIGHT_CONTROL"]],
  ["Alt", ["ALT", "LALT", "RALT", "LEFT_ALT", "RIGHT_ALT"]],
  ["Win", ["META", "GUI", "LGUI", "RGUI", "LWIN", "RWIN", "LEFT_GUI", "RIGHT_GUI", "LCMD", "RCMD", "LEFT_COMMAND", "RIGHT_COMMAND"]],
  ["Caps", ["CAPS", "CAPSLOCK", "C_LOCK", "CAPS_LOCK"]],
  ["Del", ["DEL", "DELETE"]],
  ["Esc", ["ESC", "ESCAPE"]],
  ["Enter", ["RET", "ENTER", "RETURN"]],
  ["Tab", ["TAB"]],
  ["Space", ["SPACE", "SPC"]],
  ["↑", ["UP", "UP_ARROW", "ARROWUP"]],
  ["↓", ["DOWN", "DOWN_ARROW", "ARROWDOWN"]],
  ["←", ["LEFT", "LEFT_ARROW", "ARROWLEFT"]],
  ["→", ["RIGHT", "RIGHT_ARROW", "ARROWRIGHT"]],
  ["PgUp", ["PG_UP", "PAGE_UP", "PAGEUP"]],
  ["PgDn", ["PG_DN", "PAGE_DOWN", "PAGEDOWN"]],
  ["Ins", ["INS", "INSERT"]],
  ["PrtSc", ["PRINTSCREEN", "PRINT_SCREEN"]],
  ["ScrLk", ["SLCK", "SCROLLLOCK", "SCROLL_LOCK"]],
  ["NumLk", ["NUMLOCK", "NUM_LOCK"]],
  ["Menu", ["K_CMENU", "K_APP", "CONTEXTMENU", "CONTEXT_MENU"]],
  ["Vol+", ["C_VOL_UP", "C_VOLUME_UP", "AUDIOVOLUMEUP"]],
  ["Vol-", ["C_VOL_DN", "C_VOLUME_DN", "AUDIOVOLUMEDOWN"]],
  ["Mute", ["C_MUTE", "MUTE", "AUDIOVOLUMEMUTE"]],
  ["Next", ["C_NEXT", "MEDIATRACKNEXT"]],
  ["Prev", ["C_PREV", "MEDIATRACKPREVIOUS"]],
  ["Play", ["C_PP", "C_PLAY_PAUSE", "MEDIAPLAYPAUSE"]],
  ["Stop", ["C_STOP", "MEDIASTOP"]],
  ["Bri+", ["BRI_UP"]],
  ["Bri-", ["BRI_DN", "BRI_DOWN"]],
];

function normalise(label: string): string {
  return label.trim().toUpperCase().replace(/[\s_-]+/g, "");
}

const LEGENDS = new Map<string, string>();
for (const [display, aliases] of LEGEND_GROUPS) {
  for (const alias of aliases) LEGENDS.set(normalise(alias), display);
}

export function shortKeyLabel(label: string): string {
  return LEGENDS.get(normalise(label)) ?? label;
}

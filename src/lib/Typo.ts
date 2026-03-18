export type TypoSupport = "none" | "tty" | "html" | "mock";

export type TypoText = {
  value: string;
  color?: keyof typeof colorCodes;
  bold?: boolean;
};

export function typoPrintableString(
  typoSupport: TypoSupport,
  typoText: TypoText,
): string {
  if (typoSupport === "none") {
    return typoText.value;
  }
  if (typoSupport === "tty") {
    const colorStartCode = typoText.color ? colorCodes[typoText.color] : "";
    const colorBoldCode = typoText.bold ? boldCode : "";
    return `${colorStartCode}${colorBoldCode}${typoText.value}${resetCode}`;
  }
  if (typoSupport === "html") {
    const colorStartTag = typoText.color
      ? `<span style="color: ${typoText.color}">`
      : "";
    const colorEndTag = typoText.color ? "</span>" : "";
    const boldStartTag = typoText.bold ? "<b>" : "";
    const boldEndTag = typoText.bold ? "</b>" : "";
    return `${colorStartTag}${boldStartTag}${typoText.value}${boldEndTag}${colorEndTag}`;
  }
  if (typoSupport === "mock") {
    if (typoText.color && typoText.bold) {
      return `{${typoText.value}}@${typoText.color}+`;
    }
    if (typoText.color) {
      return `{${typoText.value}}@${typoText.color}`;
    }
    if (typoText.bold) {
      return `{${typoText.value}}+`;
    }
    return `{${typoText.value}}`;
  }
  throw new Error(`Unknown typo support: ${typoSupport}`);
}

export function typoInferProcessSupport(): TypoSupport {
  if (!process) {
    return "none";
  }
  if (process.env) {
    if (process.env["FORCE_COLOR"] === "0") {
      return "none";
    }
    if (process.env["FORCE_COLOR"]) {
      return "tty";
    }
    if ("NO_COLOR" in process.env) {
      return "none";
    }
  }
  if (!process.stdout || !process.stdout.isTTY) {
    return "none";
  }
  return "tty";
}

const resetCode = "\x1b[0m";
const boldCode = "\x1b[1m";
const colorCodes = {
  darkBlack: "\x1b[30m",
  darkRed: "\x1b[31m",
  darkGreen: "\x1b[32m",
  darkYellow: "\x1b[33m",
  darkBlue: "\x1b[34m",
  darkMagenta: "\x1b[35m",
  darkCyan: "\x1b[36m",
  darkWhite: "\x1b[37m",
  brightBlack: "\x1b[90m",
  brightRed: "\x1b[91m",
  brightGreen: "\x1b[92m",
  brightYellow: "\x1b[93m",
  brightBlue: "\x1b[94m",
  brightMagenta: "\x1b[95m",
  brightCyan: "\x1b[96m",
  brightWhite: "\x1b[97m",
};

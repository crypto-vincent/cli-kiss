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

export function typoInferSupport(): TypoSupport {
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
  if (!process || !process.stdout || !process.stdout.isTTY) {
    return "none";
  }
  return "tty";
}

const resetCode = "\x1b[0m";
const boldCode = "\x1b[1m";
const colorCodes = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  grey: "\x1b[90m",
};

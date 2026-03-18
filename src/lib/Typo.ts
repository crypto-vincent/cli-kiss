export type TypoSupport = "none" | "tty" | "mock";
export type TypoColor =
  | "darkBlack"
  | "darkRed"
  | "darkGreen"
  | "darkYellow"
  | "darkBlue"
  | "darkMagenta"
  | "darkCyan"
  | "darkWhite"
  | "brightBlack"
  | "brightRed"
  | "brightGreen"
  | "brightYellow"
  | "brightBlue"
  | "brightMagenta"
  | "brightCyan"
  | "brightWhite";

export type TypoText = {
  value: string;
  foregroundColor?: TypoColor;
  backgroundColor?: TypoColor;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
};

export function typoPrintableString(
  typoSupport: TypoSupport,
  typoText: TypoText,
): string {
  if (typoSupport === "none") {
    return typoText.value;
  }
  if (typoSupport === "tty") {
    const foregroundColorCode = typoText.foregroundColor
      ? ttyCodeForegroundColors[typoText.foregroundColor]
      : "";
    const backgroundColorCode = typoText.backgroundColor
      ? ttyCodeBackgroundColors[typoText.backgroundColor]
      : "";
    const boldCode = typoText.bold ? ttyCodeBold : "";
    const italicCode = typoText.italic ? ttyCodeItalic : "";
    const underlineCode = typoText.underline ? ttyCodeUnderline : "";
    const strikethroughCode = typoText.strikethrough
      ? ttyCodeStrikethrough
      : "";
    return `${foregroundColorCode}${backgroundColorCode}${boldCode}${italicCode}${underlineCode}${strikethroughCode}${typoText.value}${ttyCodeReset}`;
  }
  if (typoSupport === "mock") {
    const foregroundColorPart = typoText.foregroundColor
      ? `{${typoText.value}}@${typoText.foregroundColor}`
      : typoText.value;
    const backgroundColorPart = typoText.backgroundColor
      ? `{${foregroundColorPart}}#${typoText.backgroundColor}`
      : foregroundColorPart;
    const boldPart = typoText.bold
      ? `{${backgroundColorPart}}+`
      : backgroundColorPart;
    const italicPart = typoText.italic ? `{${boldPart}}*` : boldPart;
    const underlinePart = typoText.underline ? `{${italicPart}}_` : italicPart;
    const strikethroughPart = typoText.strikethrough
      ? `{${underlinePart}}~`
      : underlinePart;
    return strikethroughPart;
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

const ttyCodeReset = "\x1b[0m";
const ttyCodeBold = "\x1b[1m";
const ttyCodeItalic = "\x1b[3m";
const ttyCodeUnderline = "\x1b[4m";
const ttyCodeStrikethrough = "\x1b[9m";
const ttyCodeForegroundColors: Record<TypoColor, string> = {
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
const ttyCodeBackgroundColors: Record<TypoColor, string> = {
  darkBlack: "\x1b[40m",
  darkRed: "\x1b[41m",
  darkGreen: "\x1b[42m",
  darkYellow: "\x1b[43m",
  darkBlue: "\x1b[44m",
  darkMagenta: "\x1b[45m",
  darkCyan: "\x1b[46m",
  darkWhite: "\x1b[47m",
  brightBlack: "\x1b[100m",
  brightRed: "\x1b[101m",
  brightGreen: "\x1b[102m",
  brightYellow: "\x1b[103m",
  brightBlue: "\x1b[104m",
  brightMagenta: "\x1b[105m",
  brightCyan: "\x1b[106m",
  brightWhite: "\x1b[107m",
};

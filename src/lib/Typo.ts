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

export type TypoStyle = {
  fgColor?: TypoColor;
  bgColor?: TypoColor;
  dim?: boolean;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
};

export const typoStyleConstants: TypoStyle = {
  fgColor: "darkCyan",
  bold: true,
};
export const typoStyleUserInput: TypoStyle = {
  fgColor: "darkBlue",
  bold: true,
};
export const typoStyleFailure: TypoStyle = {
  fgColor: "darkRed",
  bold: true,
};

export class TypoString {
  #value: string;
  #typoStyle: TypoStyle;
  constructor(value: string, typoStyle: TypoStyle = {}) {
    this.#value = value;
    this.#typoStyle = typoStyle;
  }
  getRawString(): string {
    return this.#value;
  }
  computeStyledString(typoSupport: TypoSupport): string {
    return typoSupport.computeStyledString(this.#value, this.#typoStyle);
  }
}

export class TypoText {
  #typoStrings: Array<TypoString>;
  constructor(...typoParts: Array<TypoText | TypoString | string>) {
    this.#typoStrings = [];
    for (const typoPart of typoParts) {
      if (typoPart instanceof TypoText) {
        this.pushText(typoPart);
      } else if (typoPart instanceof TypoString) {
        this.pushString(typoPart);
      } else if (typeof typoPart === "string") {
        this.pushString(new TypoString(typoPart));
      }
    }
  }
  pushString(typoString: TypoString) {
    this.#typoStrings.push(typoString);
  }
  pushText(typoText: TypoText) {
    for (const typoString of typoText.#typoStrings) {
      this.#typoStrings.push(typoString);
    }
  }
  computeStyledString(typoSupport: TypoSupport): string {
    return this.#typoStrings
      .map((t) => t.computeStyledString(typoSupport))
      .join("");
  }
  computeRawString(): string {
    return this.#typoStrings.map((t) => t.getRawString()).join("");
  }
  computeRawLength(): number {
    let length = 0;
    for (const typoString of this.#typoStrings) {
      length += typoString.getRawString().length;
    }
    return length;
  }
}

export class TypoGrid {
  #typoRows: Array<Array<TypoText>>;
  constructor() {
    this.#typoRows = [];
  }
  pushRow(cells: Array<TypoText>) {
    this.#typoRows.push(cells);
  }
  computeStyledGrid(typoSupport: TypoSupport): Array<Array<string>> {
    const widths = new Array<number>();
    const printableGrid = new Array<Array<string>>();
    for (const typoGridRow of this.#typoRows) {
      for (
        let typoGridColumnIndex = 0;
        typoGridColumnIndex < typoGridRow.length;
        typoGridColumnIndex++
      ) {
        const typoGridCell = typoGridRow[typoGridColumnIndex]!;
        const width = typoGridCell.computeRawLength();
        if (
          widths[typoGridColumnIndex] === undefined ||
          width > widths[typoGridColumnIndex]!
        ) {
          widths[typoGridColumnIndex] = width;
        }
      }
    }
    for (const typoGridRow of this.#typoRows) {
      const printableGridRow = new Array<string>();
      for (
        let typoGridColumnIndex = 0;
        typoGridColumnIndex < typoGridRow.length;
        typoGridColumnIndex++
      ) {
        const typoGridCell = typoGridRow[typoGridColumnIndex]!;
        const printableGridCell = typoGridCell.computeStyledString(typoSupport);
        printableGridRow.push(printableGridCell);
        if (typoGridColumnIndex < typoGridRow.length - 1) {
          const width = typoGridCell.computeRawLength();
          const padding = " ".repeat(widths[typoGridColumnIndex]! - width);
          printableGridRow.push(padding);
        }
      }
      printableGrid.push(printableGridRow);
    }
    return printableGrid;
  }
}

export class TypoError extends Error {
  #typoText: TypoText;
  constructor(currentTypoText: TypoText, source?: unknown) {
    const typoText = new TypoText();
    typoText.pushText(currentTypoText);
    if (source instanceof Error) {
      typoText.pushString(new TypoString(`: ${source.message}`));
    } else if (source instanceof TypoError) {
      typoText.pushString(new TypoString(": "));
      typoText.pushText(source.#typoText);
    } else if (source !== undefined) {
      typoText.pushString(new TypoString(`: ${String(source)}`));
    }
    super(typoText.computeRawString());
    this.#typoText = typoText;
  }
  computeStyledString(typoSupport: TypoSupport): string {
    return this.#typoText.computeStyledString(typoSupport);
  }
}

export class TypoSupport {
  #kind: "none" | "tty" | "mock";
  private constructor(kind: "none" | "tty" | "mock") {
    this.#kind = kind;
  }
  static none(): TypoSupport {
    return new TypoSupport("none");
  }
  static tty(): TypoSupport {
    return new TypoSupport("tty");
  }
  static mock(): TypoSupport {
    return new TypoSupport("mock");
  }
  static inferFromProcess(): TypoSupport {
    if (!process) {
      return TypoSupport.none();
    }
    if (process.env) {
      if (process.env["FORCE_COLOR"] === "0") {
        return TypoSupport.none();
      }
      if (process.env["FORCE_COLOR"]) {
        return TypoSupport.tty();
      }
      if ("NO_COLOR" in process.env) {
        return TypoSupport.none();
      }
    }
    if (!process.stdout || !process.stdout.isTTY) {
      return TypoSupport.none();
    }
    return TypoSupport.tty();
  }
  computeStyledString(value: string, typoStyle: TypoStyle): string {
    if (this.#kind === "none") {
      return value;
    }
    if (this.#kind === "tty") {
      const fgColorCode = typoStyle.fgColor
        ? ttyCodeFgColors[typoStyle.fgColor]
        : "";
      const bgColorCode = typoStyle.bgColor
        ? ttyCodeBgColors[typoStyle.bgColor]
        : "";
      const boldCode = typoStyle.bold ? ttyCodeBold : "";
      const dimCode = typoStyle.dim ? ttyCodeDim : "";
      const italicCode = typoStyle.italic ? ttyCodeItalic : "";
      const underlineCode = typoStyle.underline ? ttyCodeUnderline : "";
      const strikethroughCode = typoStyle.strikethrough
        ? ttyCodeStrikethrough
        : "";
      return `${fgColorCode}${bgColorCode}${boldCode}${dimCode}${italicCode}${underlineCode}${strikethroughCode}${value}${ttyCodeReset}`;
    }
    if (this.#kind === "mock") {
      const fgColorPart = typoStyle.fgColor
        ? `{${value}}@${typoStyle.fgColor}`
        : value;
      const bgColorPart = typoStyle.bgColor
        ? `{${fgColorPart}}#${typoStyle.bgColor}`
        : fgColorPart;
      const boldPart = typoStyle.bold ? `{${bgColorPart}}+` : bgColorPart;
      const dimPart = typoStyle.dim ? `{${boldPart}}-` : boldPart;
      const italicPart = typoStyle.italic ? `{${dimPart}}*` : dimPart;
      const underlinePart = typoStyle.underline
        ? `{${italicPart}}_`
        : italicPart;
      const strikethroughPart = typoStyle.strikethrough
        ? `{${underlinePart}}~`
        : underlinePart;
      return strikethroughPart;
    }
    throw new Error(`Unknown TypoSupport kind: ${this.#kind}`);
  }
  computeStyledErrorMessage(error: unknown): string {
    return [
      this.computeStyledString("Error:", typoStyleFailure),
      error instanceof TypoError
        ? error.computeStyledString(this)
        : error instanceof Error
          ? error.message
          : String(error),
    ].join(" ");
  }
}

const ttyCodeReset = "\x1b[0m";
const ttyCodeBold = "\x1b[1m";
const ttyCodeDim = "\x1b[2m";
const ttyCodeItalic = "\x1b[3m";
const ttyCodeUnderline = "\x1b[4m";
const ttyCodeStrikethrough = "\x1b[9m";
const ttyCodeFgColors: Record<TypoColor, string> = {
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
const ttyCodeBgColors: Record<TypoColor, string> = {
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

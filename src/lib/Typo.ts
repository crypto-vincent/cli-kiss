import { typeBooleanValuesFalse } from "./Type";

/**
 * Color names for terminal styling, used by {@link TypoStyle}.
 * `dark*` = standard ANSI (30–37); `bright*` = high-intensity (90–97).
 */
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

/**
 * Visual styling applied by a {@link TypoSupport} instance.
 * All fields are optional; ignored entirely in `"none"` mode.
 */
export type TypoStyle = {
  /**
   * Letter case.
   */
  case?: "upper" | "lower";
  /**
   * Foreground (text) color.
   */
  fgColor?: TypoColor;
  /**
   * Background color.
   */
  bgColor?: TypoColor;
  /**
   * Reduced intensity.
   */
  dim?: boolean;
  /**
   * Bold.
   */
  bold?: boolean;
  /**
   * Italic.
   */
  italic?: boolean;
  /**
   * Underline.
   */
  underline?: boolean;
  /**
   * Strikethrough.
   */
  strikethrough?: boolean;
};

/**
 * Section title style. Bold dark-green.
 */
export const typoStyleTitle: TypoStyle = {
  fgColor: "darkGreen",
  bold: true,
};
/**
 * Logic/type identifier style. Bold dark-magenta.
 */
export const typoStyleLogic: TypoStyle = {
  fgColor: "darkMagenta",
  bold: true,
};
/**
 * Quoted user-input style. Bold dark-yellow.
 */
export const typoStyleQuote: TypoStyle = {
  fgColor: "darkYellow",
  bold: true,
};

/**
 * Error label style. Bold dark-red.
 */
export const typoStyleFailure: TypoStyle = {
  fgColor: "darkRed",
  bold: true,
};

/**
 * Option/command name style. Bold dark-cyan.
 */
export const typoStyleConstants: TypoStyle = {
  fgColor: "darkCyan",
  bold: true,
};
/**
 * Positional/user-input label style. Bold dark-blue.
 */
export const typoStyleUserInput: TypoStyle = {
  fgColor: "darkBlue",
  bold: true,
};

/**
 * Strong text style. Bold.
 */
export const typoStyleRegularStrong: TypoStyle = {
  bold: true,
};
/**
 * Subtle text style. Italic and dim.
 */
export const typoStyleRegularWeaker: TypoStyle = {
  italic: true,
  dim: true,
};

/**
 * Immutable styled string segment. Compose into a {@link TypoText}.
 */
export class TypoString {
  #value: string;
  #typoStyle: TypoStyle | undefined;
  /**
   * @param value - Raw text content.
   * @param typoStyle - Style to apply when rendering. Defaults to `undefined` (no style).
   */
  constructor(value: string, typoStyle?: TypoStyle) {
    this.#value = value;
    this.#typoStyle = typoStyle;
  }
  /**
   * Returns the text styled by `typoSupport`.
   *
   * @param typoSupport - Rendering mode.
   */
  computeStyledString(typoSupport: TypoSupport): string {
    return typoSupport.computeStyledString(this.#value, this.#typoStyle);
  }
  /**
   * Returns the raw text.
   */
  getRawString(): string {
    return this.#value;
  }
  /**
   * Predefined ellipsis segment with subtle styling.
   */
  static elipsis = new TypoString("...", typoStyleRegularWeaker);
}

/**
 * A segment of styled text, a string, or an array of segments.
 */
export type TypoSegment = TypoText | TypoString | Array<TypoSegment>;

/**
 * Mutable sequence of {@link TypoString} segments.
 */
export class TypoText {
  #typoStrings: Array<TypoString>;
  /**
   * @param segments - Initial text segments
   */
  constructor(...segments: Array<TypoSegment>) {
    this.#typoStrings = [];
    for (const segment of segments) {
      this.push(segment);
    }
  }
  /**
   * Appends new text segment(s).
   */
  push(...segments: Array<TypoSegment>): void {
    for (const segment of segments) {
      if (typeof segment === "string") {
        this.#typoStrings.push(new TypoString(segment));
      } else if (segment instanceof TypoText) {
        this.#typoStrings.push(...segment.#typoStrings);
      } else if (Array.isArray(segment)) {
        for (const typoString of segment) {
          this.push(typoString);
        }
      } else {
        this.#typoStrings.push(segment);
      }
    }
  }
  /**
   * Appends separated segments, optionally truncating with an ellipsis.
   */
  pushJoined(
    segments: Array<TypoSegment>,
    separator: TypoSegment,
    ellipsisLimit: number,
  ): void {
    for (let index = 0; index < segments.length; index++) {
      if (index > 0) {
        this.push(separator);
      }
      if (ellipsisLimit !== undefined && index >= ellipsisLimit) {
        this.push(TypoString.elipsis);
        break;
      }
      this.push(segments[index]!);
    }
  }
  /**
   * Renders all segments into a single styled string.
   *
   * @param typoSupport - Rendering mode.
   * @returns Concatenated styled string.
   */
  computeStyledString(typoSupport: TypoSupport): string {
    return this.#typoStrings
      .map((t) => t.computeStyledString(typoSupport))
      .join("");
  }
  /**
   * Returns the concatenated raw text.
   */
  computeRawString(): string {
    return this.#typoStrings.map((t) => t.getRawString()).join("");
  }
  /**
   * Returns the total raw character count.
   */
  computeRawLength(): number {
    let length = 0;
    for (const typoString of this.#typoStrings) {
      length += typoString.getRawString().length;
    }
    return length;
  }
}

/**
 * Column-aligned grid of {@link TypoText} cells.
 * Each column is padded to the widest cell (raw chars); the last column is not padded.
 */
export class TypoGrid {
  #typoRows: Array<Array<TypoText>>;
  constructor() {
    this.#typoRows = [];
  }
  /**
   * Appends a row. All rows should have the same cell count.
   *
   * @param cells - Ordered {@link TypoText} cells.
   */
  pushRow(cells: Array<TypoText>) {
    this.#typoRows.push(cells);
  }
  /**
   * Renders as an array of styled, column-padded strings.
   *
   * @param typoSupport - Rendering mode.
   * @returns Array of styled strings.
   */
  computeStyledLines(typoSupport: TypoSupport): Array<string> {
    const widths = new Array<number>();
    const styledLines = new Array<string>();
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
      const styledGridRow = new Array<string>();
      for (
        let typoGridColumnIndex = 0;
        typoGridColumnIndex < typoGridRow.length;
        typoGridColumnIndex++
      ) {
        const typoGridCell = typoGridRow[typoGridColumnIndex]!;
        styledGridRow.push(typoGridCell.computeStyledString(typoSupport));
        if (typoGridColumnIndex < typoGridRow.length - 1) {
          const width = typoGridCell.computeRawLength();
          const padding = " ".repeat(widths[typoGridColumnIndex]! - width);
          styledGridRow.push(padding);
        }
      }
      styledLines.push(styledGridRow.join(""));
    }
    return styledLines;
  }
}

/**
 * `Error` subclass with a {@link TypoText} styled message for rich terminal output.
 * Chains `TypoError` sources after `": "`.
 */
export class TypoError extends Error {
  #typoText: TypoText;
  /**
   * @param currentTypoText - Styled message for this error.
   * @param source - Optional cause; `TypoError` chains styled text, `Error` appends `.message`, else `String()`.
   */
  constructor(currentTypoText: TypoText, source?: unknown) {
    const typoText = new TypoText();
    typoText.push(currentTypoText);
    if (source instanceof TypoError) {
      typoText.push(new TypoString(": "));
      typoText.push(source.#typoText);
    } else if (source instanceof Error) {
      typoText.push(new TypoString(`: ${source.message}`));
    } else if (source !== undefined) {
      typoText.push(new TypoString(`: ${String(source)}`));
    }
    super(typoText.computeRawString());
    this.#typoText = typoText;
  }
  /**
   * Renders the styled message (without `"Error:"` prefix).
   *
   * @param typoSupport - Rendering mode.
   * @returns Styled error string.
   */
  computeStyledString(typoSupport: TypoSupport): string {
    return this.#typoText.computeStyledString(typoSupport);
  }
  /**
   * Runs `thrower`; wraps any thrown error as a `TypoError` with `context()` prepended.
   *
   * @typeParam Value - Return type of `thrower`.
   * @param thrower - Function to execute; result passed through on success.
   * @param context - Produces the {@link TypoText} prepended to the caught error.
   * @returns Value from `thrower`.
   * @throws `TypoError` wrapping the original error with context prepended.
   */
  static tryWithContext<Value>(
    thrower: () => Value,
    context: () => TypoText,
  ): Value {
    try {
      return thrower();
    } catch (error) {
      throw new TypoError(context(), error);
    }
  }
}

/**
 * Controls ANSI terminal styling. Create via the static factory methods.
 */
export class TypoSupport {
  #kind: TypoSupportKind;
  private constructor(kind: TypoSupportKind) {
    this.#kind = kind;
  }
  /**
   * Plain text — no ANSI codes.
   */
  static none(): TypoSupport {
    return new TypoSupport("none");
  }
  /**
   * ANSI escape codes for color terminals.
   */
  static tty(): TypoSupport {
    return new TypoSupport("tty");
  }
  /**
   * Deterministic textual styling for snapshot tests.
   */
  static mock(): TypoSupport {
    return new TypoSupport("mock");
  }
  /**
   * Auto-detects styling mode from the process environment on best-effort basis.
   */
  static inferFromEnv(): TypoSupport {
    /*
    console.warn({
      no: readEnvVar("NO_COLOR"),
      force: readEnvVar("FORCE_COLOR"),
      mock: readEnvVar("MOCK_COLOR"),
      term: readEnvVar("TERM"),
      tty: process.stdout.isTTY,
    });
    */
    if (!process || !process.env || !process.stdout) {
      return TypoSupport.none();
    }
    if (readEnvVar("NO_COLOR")) {
      return TypoSupport.none();
    }
    const envForceColor = readEnvVar("FORCE_COLOR");
    if (envForceColor === "0") {
      return TypoSupport.none();
    }
    if (envForceColor !== undefined) {
      if (!typeBooleanValuesFalse.has(envForceColor.toLowerCase())) {
        return TypoSupport.tty();
      }
    }
    if (readEnvVar("MOCK_COLOR")) {
      return TypoSupport.mock();
    }
    if (!process.stdout.isTTY) {
      return TypoSupport.none();
    }
    if (readEnvVar("TERM")?.toLowerCase() === "dumb") {
      return TypoSupport.none();
    }
    return TypoSupport.tty();
  }
  /**
   * Applies `typoStyle` to `value` according to the current mode.
   *
   * @param value - Raw text.
   * @param typoStyle - Style to apply.
   * @returns Styled string.
   */
  computeStyledString(value: string, typoStyle: TypoStyle | undefined): string {
    if (typoStyle === undefined) {
      return value;
    }
    let styledValue = value;
    if (typoStyle.case === "upper") {
      styledValue = styledValue.toUpperCase();
    }
    if (typoStyle.case === "lower") {
      styledValue = styledValue.toLowerCase();
    }
    if (this.#kind === "none") {
      return styledValue;
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
      return `${fgColorCode}${bgColorCode}${boldCode}${dimCode}${italicCode}${underlineCode}${strikethroughCode}${styledValue}${ttyCodeReset}`;
    }
    if (this.#kind === "mock") {
      const fgColorPart = typoStyle.fgColor
        ? `{${styledValue}}@${typoStyle.fgColor}`
        : styledValue;
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
  /**
   * Formats any thrown value as `"Error: <message>"` with {@link typoStyleFailure} on the prefix.
   *
   * @param error - Any thrown value.
   * @returns Styled error string.
   */
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

function readEnvVar(name: string) {
  if (!(name in process.env)) {
    return undefined;
  }
  return process.env[name];
}

type TypoSupportKind = "none" | "tty" | "mock";

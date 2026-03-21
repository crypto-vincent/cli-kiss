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
   * Foreground (text) color.
   */
  fgColor?: TypoColor;
  /**
   * Background color.
   */
  bgColor?: TypoColor;
  /**
   * Render with reduced intensity.
   */
  dim?: boolean;
  /**
   * Render in bold.
   */
  bold?: boolean;
  /**
   * Render in italic.
   */
  italic?: boolean;
  /**
   * Render with an underline.
   */
  underline?: boolean;
  /**
   * Render with a strikethrough.
   */
  strikethrough?: boolean;
};

/**
 * Pre-defined style for section titles (e.g. `"Positionals:"`). Bold dark-green.
 */
export const typoStyleTitle: TypoStyle = {
  fgColor: "darkGreen",
  bold: true,
};
/**
 * Pre-defined style for logic/type identifiers in error messages. Bold dark-magenta.
 */
export const typoStyleLogic: TypoStyle = {
  fgColor: "darkMagenta",
  bold: true,
};
/**
 * Pre-defined style for quoted user-supplied values in error messages. Bold dark-yellow.
 */
export const typoStyleQuote: TypoStyle = {
  fgColor: "darkYellow",
  bold: true,
};

/**
 * Pre-defined style for failure/error labels (e.g. `"Error:"`). Bold dark-red.
 */
export const typoStyleFailure: TypoStyle = {
  fgColor: "darkRed",
  bold: true,
};

/**
 * Pre-defined style for CLI flag/option/command names. Bold dark-cyan.
 */
export const typoStyleConstants: TypoStyle = {
  fgColor: "darkCyan",
  bold: true,
};
/**
 * Pre-defined style for positional placeholders and user-input labels. Bold dark-blue.
 */
export const typoStyleUserInput: TypoStyle = {
  fgColor: "darkBlue",
  bold: true,
};

/**
 * Pre-defined style for strong regular text (e.g. command descriptions). Bold.
 */
export const typoStyleRegularStrong: TypoStyle = {
  bold: true,
};
/**
 * Pre-defined style for subtle supplementary text (e.g. hints). Italic and dim.
 */
export const typoStyleRegularWeaker: TypoStyle = {
  italic: true,
  dim: true,
};

/**
 * An immutable styled string segment: a raw text value paired with a {@link TypoStyle}.
 * Compose multiple segments into a {@link TypoText}; rendering is deferred to {@link TypoString.computeStyledString}.
 */
export class TypoString {
  #value: string;
  #typoStyle: TypoStyle;
  /**
   * @param value - Raw text content.
   * @param typoStyle - Style to apply when rendering. Defaults to `{}` (no style).
   */
  constructor(value: string, typoStyle: TypoStyle = {}) {
    this.#value = value;
    this.#typoStyle = typoStyle;
  }
  /**
   * Returns the unstyled raw text content.
   */
  getRawString(): string {
    return this.#value;
  }
  /**
   * Returns the text styled by `typoSupport`.
   *
   * @param typoSupport - Rendering mode.
   */
  computeStyledString(typoSupport: TypoSupport): string {
    return typoSupport.computeStyledString(this.#value, this.#typoStyle);
  }
}

/**
 * A mutable sequence of {@link TypoString} segments forming a styled multi-part message.
 * Rendering is deferred to {@link TypoText.computeStyledString}.
 */
export class TypoText {
  #typoStrings: Array<TypoString>;
  /**
   * @param typoParts - Initial segments; `TypoText` is flattened, `string` is wrapped unstyled.
   */
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
  /**
   * Appends a {@link TypoString} segment.
   *
   * @param typoString - Segment to append.
   */
  pushString(typoString: TypoString | string) {
    if (typeof typoString === "string") {
      this.#typoStrings.push(new TypoString(typoString));
    } else {
      this.#typoStrings.push(typoString);
    }
  }
  /**
   * Appends all segments from another {@link TypoText} (shallow copy).
   *
   * @param typoText - Source text.
   */
  pushText(typoText: TypoText | string) {
    if (typeof typoText === "string") {
      this.pushString(typoText);
    } else {
      for (const typoString of typoText.#typoStrings) {
        this.#typoStrings.push(typoString);
      }
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
   * Returns the concatenation of all segments' raw (unstyled) text.
   */
  computeRawString(): string {
    return this.#typoStrings.map((t) => t.getRawString()).join("");
  }
  /**
   * Returns the total character count of the raw (unstyled) text.
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
 * A column-aligned grid of {@link TypoText} cells.
 * Each column is padded to the widest cell (raw chars); the last column is not padded.
 * Used by {@link usageToStyledLines} to render `Positionals:`, `Subcommands:`, and `Options:`.
 */
export class TypoGrid {
  #typoRows: Array<Array<TypoText>>;
  constructor() {
    this.#typoRows = [];
  }
  /**
   * Appends a row. All rows should have the same cell count for alignment to be meaningful.
   *
   * @param cells - Ordered {@link TypoText} cells.
   */
  pushRow(cells: Array<TypoText>) {
    this.#typoRows.push(cells);
  }
  /**
   * Renders the grid as a 2-D array of styled (and column-padded) strings.
   * Join each inner array with `""` to get a line.
   *
   * @param typoSupport - Rendering mode.
   * @returns 2-D array of styled strings.
   */
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

/**
 * `Error` subclass with a {@link TypoText} styled message for rich terminal output.
 * Used throughout the library for parse failures (unknown option, type decode error, etc.).
 * If `source` is a `TypoError`, its styled text is chained after `": "`.
 */
export class TypoError extends Error {
  #typoText: TypoText;
  /**
   * @param currentTypoText - Styled message for this error.
   * @param source - Optional cause; `TypoError` chains styled text, `Error` appends `.message`, else `String()`.
   */
  constructor(currentTypoText: TypoText, source?: unknown) {
    const typoText = new TypoText();
    typoText.pushText(currentTypoText);
    if (source instanceof TypoError) {
      typoText.pushString(new TypoString(": "));
      typoText.pushText(source.#typoText);
    } else if (source instanceof Error) {
      typoText.pushString(new TypoString(`: ${source.message}`));
    } else if (source !== undefined) {
      typoText.pushString(new TypoString(`: ${String(source)}`));
    }
    super(typoText.computeRawString());
    this.#typoText = typoText;
  }
  /**
   * Renders the styled error message (without a `"Error:"` prefix).
   *
   * @param typoSupport - Rendering mode.
   * @returns Styled error string.
   */
  computeStyledString(typoSupport: TypoSupport): string {
    return this.#typoText.computeStyledString(typoSupport);
  }
  /**
   * Runs `thrower`; on any throw wraps it as a `TypoError` with `context()` prepended.
   * Useful for adding call-chain context (e.g. `"at 0: Number: ..."`).
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
 * Controls ANSI terminal styling for {@link TypoString}, {@link TypoText}, and error rendering.
 * Create via {@link TypoSupport.none}, {@link TypoSupport.tty}, {@link TypoSupport.mock},
 * or {@link TypoSupport.inferFromProcess}.
 */
export class TypoSupport {
  #kind: "none" | "tty" | "mock";
  private constructor(kind: "none" | "tty" | "mock") {
    this.#kind = kind;
  }
  /**
   * Returns a `TypoSupport` that strips all styling (plain text, no ANSI codes).
   */
  static none(): TypoSupport {
    return new TypoSupport("none");
  }
  /**
   * Returns a `TypoSupport` that applies ANSI escape codes (for color-capable terminals).
   */
  static tty(): TypoSupport {
    return new TypoSupport("tty");
  }
  /**
   * Returns a `TypoSupport` with deterministic textual styling for snapshot tests.
   * Style flags appear as suffixes: `{text}@color`, `{text}+` (bold), `{text}-` (dim),
   * `{text}*` (italic), `{text}_` (underline), `{text}~` (strikethrough).
   */
  static mock(): TypoSupport {
    return new TypoSupport("mock");
  }
  /**
   * Auto-detects styling mode from the process environment.
   * `FORCE_COLOR=0` / `NO_COLOR` → none; `FORCE_COLOR` (truthy) / `isTTY` → tty; else → none.
   * Falls back to none if `process` is unavailable.
   */
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
    if (process.stdout && process.stdout.isTTY) {
      return TypoSupport.tty();
    }
    return TypoSupport.none();
  }
  /**
   * Applies `typoStyle` to `value` according to the current mode.
   *
   * @param value - Raw text.
   * @param typoStyle - Style to apply.
   * @returns Styled string.
   */
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

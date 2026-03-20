/**
 * Available foreground and background color names for terminal styling.
 *
 * Colors are divided into two groups:
 * - **dark** variants correspond to standard ANSI colors (codes 30–37 / 40–47).
 * - **bright** variants correspond to high-intensity ANSI colors (codes 90–97 / 100–107).
 *
 * Used by {@link TypoStyle}'s `fgColor` and `bgColor` fields.
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
 * Describes the visual styling to apply to a text segment when rendered by a
 * {@link TypoSupport} instance.
 *
 * All fields are optional. When `TypoSupport` is in `"none"` mode, no styling is
 * applied and the raw text is returned unchanged. In `"tty"` mode the corresponding
 * ANSI escape codes are emitted. In `"mock"` mode a deterministic textual representation
 * is produced (useful for snapshot tests).
 */
export type TypoStyle = {
  /** Foreground (text) color. */
  fgColor?: TypoColor;
  /** Background color. */
  bgColor?: TypoColor;
  /** Render the text with reduced intensity. */
  dim?: boolean;
  /** Render the text in bold. */
  bold?: boolean;
  /** Render the text in italic. */
  italic?: boolean;
  /** Render the text with an underline. */
  underline?: boolean;
  /** Render the text with a strikethrough. */
  strikethrough?: boolean;
};

/**
 * Pre-defined {@link TypoStyle} for section titles in the usage output (e.g.
 * `"Positionals:"`, `"Options:"`).
 * Rendered in bold dark-green.
 */
export const typoStyleTitle: TypoStyle = {
  fgColor: "darkGreen",
  bold: true,
};
/** Pre-defined {@link TypoStyle} for logic/type identifiers in error messages. Rendered in bold dark-magenta. */
export const typoStyleLogic: TypoStyle = {
  fgColor: "darkMagenta",
  bold: true,
};
/** Pre-defined {@link TypoStyle} for quoted user-supplied values in error messages. Rendered in bold dark-yellow. */
export const typoStyleQuote: TypoStyle = {
  fgColor: "darkYellow",
  bold: true,
};

/** Pre-defined {@link TypoStyle} for failure/error labels (e.g. `"Error:"`). Rendered in bold dark-red. */
export const typoStyleFailure: TypoStyle = {
  fgColor: "darkRed",
  bold: true,
};

/** Pre-defined {@link TypoStyle} for CLI flag/option/command constant names. Rendered in bold dark-cyan. */
export const typoStyleConstants: TypoStyle = {
  fgColor: "darkCyan",
  bold: true,
};
/** Pre-defined {@link TypoStyle} for positional placeholders and user-input labels. Rendered in bold dark-blue. */
export const typoStyleUserInput: TypoStyle = {
  fgColor: "darkBlue",
  bold: true,
};

/** Pre-defined {@link TypoStyle} for strong regular text (e.g. command descriptions). Rendered in bold. */
export const typoStyleRegularStrong: TypoStyle = {
  bold: true,
};
/** Pre-defined {@link TypoStyle} for subtle supplementary text (e.g. hints). Rendered in italic and dim. */
export const typoStyleRegularWeaker: TypoStyle = {
  italic: true,
  dim: true,
};

/**
 * An immutable styled string segment consisting of a raw text value and an associated
 * {@link TypoStyle}.
 *
 * Multiple `TypoString`s are composed into a {@link TypoText} for multi-part messages.
 * Rendering is deferred until {@link TypoString.computeStyledString} is called with a
 * {@link TypoSupport} instance.
 */
export class TypoString {
  #value: string;
  #typoStyle: TypoStyle;
  /**
   * @param value - The raw text content.
   * @param typoStyle - The style to apply when rendering. Defaults to `{}` (no style).
   */
  constructor(value: string, typoStyle: TypoStyle = {}) {
    this.#value = value;
    this.#typoStyle = typoStyle;
  }
  /** Returns the unstyled raw text content. */
  getRawString(): string {
    return this.#value;
  }
  /**
   * Returns the text with ANSI escape codes (or mock markers) applied by `typoSupport`.
   *
   * @param typoSupport - Controls how styles are rendered (tty colors, mock, or none).
   */
  computeStyledString(typoSupport: TypoSupport): string {
    return typoSupport.computeStyledString(this.#value, this.#typoStyle);
  }
}

/**
 * A mutable sequence of {@link TypoString} segments that together form a styled
 * multi-part message.
 *
 * `TypoText` is used throughout the library to build error messages and usage output
 * that carry styling information without being coupled to a specific output mode.
 * Rendering is deferred to {@link TypoText.computeStyledString}.
 */
export class TypoText {
  #typoStrings: Array<TypoString>;
  /**
   * Creates a `TypoText` pre-populated with the provided parts. Each part can be a
   * `TypoText` (flattened by value), a `TypoString`, or a plain `string` (wrapped in an
   * unstyled `TypoString`).
   *
   * @param typoParts - Initial parts to append. Can be any mix of `TypoText`,
   *   `TypoString`, and `string`.
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
   * Appends a single {@link TypoString} segment to the end of this text.
   *
   * @param typoString - The segment to append.
   */
  pushString(typoString: TypoString) {
    this.#typoStrings.push(typoString);
  }
  /**
   * Appends all segments from another {@link TypoText} to the end of this text
   * (shallow copy of segments).
   *
   * @param typoText - The text whose segments are appended.
   */
  pushText(typoText: TypoText) {
    for (const typoString of typoText.#typoStrings) {
      this.#typoStrings.push(typoString);
    }
  }
  /**
   * Renders all segments into a single string, applying styles via `typoSupport`.
   *
   * @param typoSupport - Controls how styles are rendered.
   * @returns The concatenated, optionally styled string.
   */
  computeStyledString(typoSupport: TypoSupport): string {
    return this.#typoStrings
      .map((t) => t.computeStyledString(typoSupport))
      .join("");
  }
  /**
   * Returns the concatenation of all segments' raw (unstyled) text.
   * Equivalent to calling {@link TypoText.computeStyledString} with
   * {@link TypoSupport.none}.
   */
  computeRawString(): string {
    return this.#typoStrings.map((t) => t.getRawString()).join("");
  }
  /**
   * Returns the total character length of the raw (unstyled) text.
   * Used by {@link TypoGrid} to compute column widths for alignment.
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
 * A grid of {@link TypoText} cells that renders with column-aligned padding.
 *
 * Each row is an array of `TypoText` cells. When {@link TypoGrid.computeStyledGrid} is
 * called, each column is padded to the width of its widest cell (measured in raw
 * characters). The last column in each row is **not** padded.
 *
 * Used internally by {@link usageToStyledLines} to render the `Positionals:`,
 * `Subcommands:`, and `Options:` sections with neat alignment.
 */
export class TypoGrid {
  #typoRows: Array<Array<TypoText>>;
  constructor() {
    this.#typoRows = [];
  }
  /**
   * Appends a row of cells to the grid.
   *
   * @param cells - An ordered array of {@link TypoText} cells for this row. All rows
   *   should have the same number of cells for alignment to be meaningful.
   */
  pushRow(cells: Array<TypoText>) {
    this.#typoRows.push(cells);
  }
  /**
   * Renders the grid into a 2-D array of styled strings, with space padding added
   * between columns (except after the last column).
   *
   * @param typoSupport - Controls how styles are rendered.
   * @returns A 2-D array where each inner array is the styled (and padded) cells of
   *   one row. Join the inner arrays with `""` to get a single line string.
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
 * An `Error` subclass that carries a {@link TypoText} styled message in addition to
 * the plain-text `Error.message` used by the standard JS error chain.
 *
 * `TypoError` is used throughout `cli-kiss` to report parsing failures (unknown option,
 * type decoding error, missing required argument, etc.). Its styled representation is
 * rendered by {@link TypoSupport.computeStyledErrorMessage} when outputting errors to
 * the terminal.
 *
 * Errors can be chained: if `source` is a `TypoError`, its styled text is appended
 * after `": "` to form the full message context chain.
 */
export class TypoError extends Error {
  #typoText: TypoText;
  /**
   * @param currentTypoText - The styled message for this error level.
   * @param source - An optional cause. If it is a `TypoError`, its styled text is
   *   appended (chained context). If it is a plain `Error`, its `.message` is appended
   *   as a plain string. Any other value is stringified with `String()`.
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
   * Renders this error's styled message as a string.
   *
   * @param typoSupport - Controls how ANSI styles are applied.
   * @returns The full styled error message (without a leading `"Error:"` prefix).
   */
  computeStyledString(typoSupport: TypoSupport): string {
    return this.#typoText.computeStyledString(typoSupport);
  }
  /**
   * Executes `thrower` and returns its result. If `thrower` throws any error, the error
   * is re-thrown as a new `TypoError` whose message is `context()` with the original
   * error chained as the source.
   *
   * This is a convenience helper for adding contextual information to errors that arise
   * deep in a call chain (e.g. "at 0: Number: Unable to parse: ...").
   *
   * @typeParam Value - The return type of `thrower`.
   * @param thrower - A zero-argument function whose return value is passed through on
   *   success.
   * @param context - A zero-argument factory that produces the {@link TypoText} context
   *   prepended to the caught error. Called only when `thrower` throws.
   * @returns The value returned by `thrower`.
   * @throws `TypoError` wrapping the original error with the provided context prepended.
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
 * Controls whether and how ANSI terminal styling is applied when rendering
 * {@link TypoString}, {@link TypoText}, and error messages.
 *
 * Instances are created via the static factory methods:
 * - {@link TypoSupport.none} — strips all styling (plain text).
 * - {@link TypoSupport.tty} — applies ANSI escape codes for color terminals.
 * - {@link TypoSupport.mock} — applies a deterministic textual representation useful
 *   for snapshot tests.
 * - {@link TypoSupport.inferFromProcess} — auto-detects based on `process.stdout.isTTY`
 *   and the `FORCE_COLOR` / `NO_COLOR` environment variables.
 *
 * `TypoSupport` is consumed by {@link runAsCliAndExit} (via the `useTtyColors` option)
 * and can also be used directly when building custom usage renderers with
 * {@link usageToStyledLines}.
 */
export class TypoSupport {
  #kind: "none" | "tty" | "mock";
  private constructor(kind: "none" | "tty" | "mock") {
    this.#kind = kind;
  }
  /**
   * Returns a `TypoSupport` that strips all styling — every styled string is returned
   * as-is (plain text, no ANSI codes).
   */
  static none(): TypoSupport {
    return new TypoSupport("none");
  }
  /**
   * Returns a `TypoSupport` that applies ANSI escape codes.
   * Use this when writing to a color-capable terminal (`stdout.isTTY === true`).
   */
  static tty(): TypoSupport {
    return new TypoSupport("tty");
  }
  /**
   * Returns a `TypoSupport` that applies a deterministic mock styling representation.
   *
   * Instead of real ANSI codes, each style flag is expressed as a readable suffix:
   * `{text}@color`, `{text}+` (bold), `{text}-` (dim), `{text}*` (italic),
   * `{text}_` (underline), `{text}~` (strikethrough). Useful for snapshot testing.
   */
  static mock(): TypoSupport {
    return new TypoSupport("mock");
  }
  /**
   * Selects a `TypoSupport` mode automatically based on the current process environment:
   *
   * 1. `FORCE_COLOR=0` or `NO_COLOR` env var set → {@link TypoSupport.none}.
   * 2. `FORCE_COLOR` env var set (any truthy value) → {@link TypoSupport.tty}.
   * 3. `process.stdout.isTTY === true` → {@link TypoSupport.tty}.
   * 4. Otherwise → {@link TypoSupport.none}.
   *
   * Falls back to {@link TypoSupport.none} if `process` is not available (e.g. in a
   * non-Node environment).
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
   * Applies the given {@link TypoStyle} to `value` and returns the styled string.
   *
   * - In `"none"` mode: returns `value` unchanged.
   * - In `"tty"` mode: wraps `value` in ANSI escape codes and appends a reset code.
   * - In `"mock"` mode: wraps `value` in a deterministic textual representation.
   *
   * @param value - The raw text to style.
   * @param typoStyle - The style to apply.
   * @returns The styled string.
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
   * Formats an error value as a styled `"Error: <message>"` string.
   *
   * - If `error` is a {@link TypoError}, its styled text is used for the message part.
   * - If `error` is a plain `Error`, its `.message` property is used.
   * - Otherwise `String(error)` is used.
   *
   * The `"Error:"` prefix is always styled with {@link typoStyleFailure}.
   *
   * @param error - The error to format (any value thrown by a handler).
   * @returns A styled error string ready to print to stderr.
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

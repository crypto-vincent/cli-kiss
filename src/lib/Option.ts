import { ReaderArgs as ReaderOptions } from "./Reader";
import { Type, typeBoolean } from "./Type";
import {
  TypoError,
  TypoString,
  typoStyleConstants,
  typoStyleLogic,
  typoStyleUserInput,
  TypoText,
} from "./Typo";

/**
 * Describes a single CLI option (a flag or a valued option) together with its parsing
 * and usage-generation logic.
 *
 * Options are created with {@link optionFlag}, {@link optionSingleValue}, or
 * {@link optionRepeatable} and are passed via the `options` map of {@link operation}.
 *
 * @typeParam Value - The TypeScript type of the parsed option value.
 *   - `boolean` for flags created with {@link optionFlag}.
 *   - `T` for single-value options created with {@link optionSingleValue}.
 *   - `Array<T>` for repeatable options created with {@link optionRepeatable}.
 */
export type Option<Value> = {
  /** Returns human-readable metadata used to render the `Options:` section of help. */
  generateUsage(): OptionUsage;
  /**
   * Registers the option on `readerOptions` so the argument reader recognises it, and
   * returns an {@link OptionGetter} that can later retrieve the parsed value(s).
   *
   * @param readerOptions - The shared {@link ReaderArgs} that will parse the raw
   *   command-line tokens.
   */
  createGetter(readerOptions: ReaderOptions): OptionGetter<Value>;
};

/**
 * Human-readable metadata for a single CLI option, used to render the `Options:` section
 * of the help output produced by {@link usageToStyledLines}.
 */
export type OptionUsage = {
  /** Short description of what the option does. */
  description: string | undefined;
  /**
   * Optional supplementary note shown in parentheses next to the description.
   * Suitable for short caveats such as `"required"` or `"defaults to 42"`.
   */
  hint: string | undefined;
  /**
   * The primary long-form name of the option, without the `--` prefix (e.g. `"verbose"`).
   * The user passes this as `--verbose` on the command line.
   */
  long: Lowercase<string>; // TODO - better type for long option names ?
  /**
   * The optional short-form name of the option, without the `-` prefix (e.g. `"v"`).
   * The user passes this as `-v` on the command line.
   */
  short: string | undefined;
  /**
   * The value placeholder label shown after the long option name in the help output
   * (e.g. `"<FILE>"`). `undefined` for flags that take no value.
   */
  label: Uppercase<string> | undefined;
};

/**
 * Retrieves the parsed value for a registered option after argument parsing is complete.
 *
 * Returned by {@link Option.createGetter} and called by {@link OperationFactory.createInstance}.
 *
 * @typeParam Value - The TypeScript type of the parsed value.
 */
export type OptionGetter<Value> = {
  /**
   * Returns the fully decoded and validated value for the option.
   *
   * @throws {@link TypoError} if the option appeared more times than allowed, the value
   *   failed type decoding, or a required default could not be computed.
   */
  getValue(): Value;
};

/**
 * Creates a boolean flag option — an option that the user passes without a value (e.g.
 * `--verbose`) to signal `true`, or can explicitly set with `--flag=true` / `--flag=no`.
 *
 * **Parsing rules:**
 * - Absent → `false` (or the return value of `default()` when provided).
 * - `--flag` / `--flag=true` / `--flag=yes` → `true`.
 * - `--flag=false` / `--flag=no` → `false`.
 * - Specified more than once → {@link TypoError} ("Must not be set multiple times").
 *
 * @param definition - Configuration for the flag.
 * @param definition.long - Primary long-form name (without `--`). Must be lowercase.
 * @param definition.short - Optional short-form name (without `-`).
 * @param definition.description - Human-readable description for the help output.
 * @param definition.hint - Optional supplementary note shown in parentheses.
 * @param definition.aliases - Additional long/short names that the parser also
 *   recognises as this flag.
 * @param definition.default - Factory for the default value when the flag is absent.
 *   Defaults to `() => false` when omitted.
 * @returns An {@link Option}`<boolean>`.
 *
 * @example
 * ```ts
 * const verboseFlag = optionFlag({
 *   long: "verbose",
 *   short: "v",
 *   description: "Enable verbose output",
 * });
 * ```
 */
export function optionFlag(definition: {
  long: Lowercase<string>;
  short?: string;
  description?: string;
  hint?: string;
  aliases?: { longs?: Array<Lowercase<string>>; shorts?: Array<string> };
  default?: () => boolean;
}): Option<boolean> {
  const label = `<${typeBoolean.content.toUpperCase()}>`;
  return {
    generateUsage() {
      return {
        description: definition.description,
        hint: definition.hint,
        long: definition.long,
        short: definition.short,
        label: undefined,
      };
    },
    createGetter(readerOptions: ReaderOptions) {
      const key = registerOption(readerOptions, {
        ...definition,
        valued: false,
      });
      return {
        getValue() {
          const optionValues = readerOptions.getOptionValues(key);
          if (optionValues.length > 1) {
            throw new TypoError(
              new TypoText(
                new TypoString(`--${definition.long}`, typoStyleConstants),
                new TypoString(`: Must not be set multiple times`),
              ),
            );
          }
          const optionValue = optionValues[0];
          if (optionValue === undefined) {
            try {
              return definition.default ? definition.default() : false;
            } catch (error) {
              throw new TypoError(
                new TypoText(
                  new TypoString(`--${definition.long}`, typoStyleConstants),
                  new TypoString(`: Failed to get default value`),
                ),
                error,
              );
            }
          }
          return decodeValue(definition.long, label, typeBoolean, optionValue);
        },
      };
    },
  };
}

/**
 * Creates an option that accepts exactly one value (e.g. `--output dist/` or
 * `--output=dist/`).
 *
 * **Parsing rules:**
 * - Absent → `definition.default()` is called. If the default factory throws, a
 *   {@link TypoError} is produced.
 * - Specified once → the value is decoded with `definition.type`.
 * - Specified more than once → {@link TypoError} ("Requires a single value, but got
 *   multiple").
 *
 * **Value syntax:** `--long value`, `--long=value`, or (if `short` is set) `-s value`,
 * `-s=value`, or `-svalue`.
 *
 * @typeParam Value - The TypeScript type produced by the type decoder.
 *
 * @param definition - Configuration for the option.
 * @param definition.long - Primary long-form name (without `--`). Must be lowercase.
 * @param definition.short - Optional short-form name (without `-`).
 * @param definition.description - Human-readable description for the help output.
 * @param definition.hint - Optional supplementary note shown in parentheses.
 * @param definition.aliases - Additional long/short names the parser also recognises.
 * @param definition.label - Custom label shown in the help output (e.g. `"FILE"`).
 *   Defaults to the uppercased `type.content`.
 * @param definition.type - The {@link Type} used to decode the raw string value.
 * @param definition.default - Factory for the default value when the option is absent.
 *   Throw an error from this factory to make the option effectively required.
 * @returns An {@link Option}`<Value>`.
 *
 * @example
 * ```ts
 * const outputOption = optionSingleValue({
 *   long: "output",
 *   short: "o",
 *   type: typeString,
 *   label: "PATH",
 *   description: "Output directory",
 *   default: () => "dist/",
 * });
 * ```
 */
export function optionSingleValue<Value>(definition: {
  long: Lowercase<string>;
  short?: string;
  description?: string;
  hint?: string;
  aliases?: { longs?: Array<Lowercase<string>>; shorts?: Array<string> };
  label?: Uppercase<string>;
  type: Type<Value>;
  default: () => Value;
}): Option<Value> {
  const label = `<${definition.label ?? definition.type.content.toUpperCase()}>`;
  return {
    generateUsage() {
      return {
        description: definition.description,
        hint: definition.hint,
        long: definition.long,
        short: definition.short,
        label: label as Uppercase<string>,
      };
    },
    createGetter(readerOptions: ReaderOptions) {
      const key = registerOption(readerOptions, {
        ...definition,
        valued: true,
      });
      return {
        getValue() {
          const optionValues = readerOptions.getOptionValues(key);
          if (optionValues.length > 1) {
            throw new TypoError(
              new TypoText(
                new TypoString(`--${definition.long}`, typoStyleConstants),
                new TypoString(`: Requires a single value, but got multiple`),
              ),
            );
          }
          const optionValue = optionValues[0];
          if (optionValue === undefined) {
            try {
              return definition.default();
            } catch (error) {
              throw new TypoError(
                new TypoText(
                  new TypoString(`--${definition.long}`, typoStyleConstants),
                  new TypoString(`: Failed to get default value`),
                ),
                error,
              );
            }
          }
          return decodeValue(
            definition.long,
            label,
            definition.type,
            optionValue,
          );
        },
      };
    },
  };
}

/**
 * Creates an option that can be specified any number of times, collecting all provided
 * values into an array (e.g. `--file a.ts --file b.ts`).
 *
 * **Parsing rules:**
 * - Absent → empty array `[]`.
 * - Specified N times → array of N decoded values, in the order they appear on the
 *   command line.
 * - Each occurrence is decoded independently with `definition.type`.
 *
 * **Value syntax:** `--long value`, `--long=value`, or (if `short` is set) `-s value`,
 * `-s=value`, or `-svalue`.
 *
 * @typeParam Value - The TypeScript type produced by the type decoder for each
 *   occurrence.
 *
 * @param definition - Configuration for the option.
 * @param definition.long - Primary long-form name (without `--`). Must be lowercase.
 * @param definition.short - Optional short-form name (without `-`).
 * @param definition.description - Human-readable description for the help output.
 * @param definition.hint - Optional supplementary note shown in parentheses.
 * @param definition.aliases - Additional long/short names the parser also recognises.
 * @param definition.label - Custom label shown in the help output (e.g. `"FILE"`).
 *   Defaults to the uppercased `type.content`.
 * @param definition.type - The {@link Type} used to decode each raw string value.
 * @returns An {@link Option}`<Array<Value>>`.
 *
 * @example
 * ```ts
 * const filesOption = optionRepeatable({
 *   long: "file",
 *   short: "f",
 *   type: typeString,
 *   label: "PATH",
 *   description: "Input file (may be repeated)",
 * });
 * // Usage: my-cli --file a.ts --file b.ts  →  ["a.ts", "b.ts"]
 * ```
 */
export function optionRepeatable<Value>(definition: {
  long: Lowercase<string>;
  short?: string;
  description?: string;
  hint?: string;
  aliases?: { longs?: Array<Lowercase<string>>; shorts?: Array<string> };
  label?: Uppercase<string>;
  type: Type<Value>;
}): Option<Array<Value>> {
  const label = `<${definition.label ?? definition.type.content.toUpperCase()}>`;
  return {
    generateUsage() {
      // TODO - showcase that it can be repeated ?
      return {
        description: definition.description,
        hint: definition.hint,
        long: definition.long,
        short: definition.short,
        label: label as Uppercase<string>,
      };
    },
    createGetter(readerOptions: ReaderOptions) {
      const key = registerOption(readerOptions, {
        ...definition,
        valued: true,
      });
      return {
        getValue() {
          const optionValues = readerOptions.getOptionValues(key);
          return optionValues.map((optionValue) =>
            decodeValue(definition.long, label, definition.type, optionValue),
          );
        },
      };
    },
  };
}

function decodeValue<Value>(
  long: string,
  label: string,
  type: Type<Value>,
  value: string,
): Value {
  return TypoError.tryWithContext(
    () => type.decoder(value),
    () =>
      new TypoText(
        new TypoString(`--${long}`, typoStyleConstants),
        new TypoString(`: `),
        new TypoString(label, typoStyleUserInput),
        new TypoString(`: `),
        new TypoString(type.content, typoStyleLogic),
      ),
  );
}

function registerOption(
  readerOptions: ReaderOptions,
  definition: {
    long: Lowercase<string>;
    short?: string;
    aliases?: { longs?: Array<Lowercase<string>>; shorts?: Array<string> };
    valued: boolean;
  },
) {
  const { long, short, aliases, valued } = definition;
  const longs = long ? [long] : [];
  if (aliases?.longs) {
    longs.push(...aliases?.longs);
  }
  const shorts = short ? [short] : [];
  if (aliases?.shorts) {
    shorts.push(...aliases?.shorts);
  }
  return readerOptions.registerOption({ longs, shorts, valued });
}

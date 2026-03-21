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
 * A CLI option (flag or valued) with its parsing and usage-generation logic.
 *
 * Created with {@link optionFlag}, {@link optionSingleValue}, or
 * {@link optionRepeatable} and passed via the `options` map of {@link operation}.
 *
 * @typeParam Value - Decoded value type.
 */
export type Option<Value> = {
  /**
   * Returns metadata used to render the `Options:` section of help.
   */
  generateUsage(): OptionUsage;
  /**
   * Registers the option on `readerOptions` and returns an {@link OptionDecoder}.
   */
  registerAndMakeDecoder(readerOptions: ReaderOptions): OptionDecoder<Value>;
};

/**
 * Produced by {@link Option.registerAndMakeDecoder}.
 *
 * @typeParam Value - Decoded value type.
 */
export type OptionDecoder<Value> = {
  /**
   * Returns the decoded option value.
   *
   * @throws {@link TypoError} if decoding failed.
   */
  getAndDecodeValue(): Value;
};

/**
 * Human-readable metadata for a single option, used to render the `Options:` section
 * of the help output produced by {@link usageToStyledLines}.
 */
export type OptionUsage = {
  /**
   * Long-form name without `--` (e.g. `"verbose"`).
   */
  long: Lowercase<string>;
  /**
   * Short-form name without `-` (e.g. `"v"`).
   */
  short: string | undefined;
  /**
   * Help text in usage.
   */
  description: string | undefined;
  /**
   * Short note shown in parentheses.
   */
  hint: string | undefined;
  /**
   * Value placeholder in help (e.g. `"<FILE>"`). `undefined` for flags.
   */
  label: Uppercase<string> | undefined;
};

/**
 * Creates a boolean flag option (`--verbose`, optionally `--flag=no`).
 *
 * Parsing: absent → `false`; `--flag` / `--flag=yes` → `true`; `--flag=no` → `false`;
 * specified more than once → {@link TypoError}.
 *
 * @param definition - Flag configuration.
 * @param definition.long - Long-form name (without `--`).
 * @param definition.short - Short-form name (without `-`).
 * @param definition.description - Help text.
 * @param definition.hint - Short note shown in parentheses.
 * @param definition.aliases - Additional names.
 * @param definition.default - Default when absent. Defaults to `() => false`.
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
    registerAndMakeDecoder(readerOptions: ReaderOptions) {
      const key = registerOption(readerOptions, {
        ...definition,
        valued: false,
      });
      return {
        getAndDecodeValue() {
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
          return decodeValue({
            long: definition.long,
            short: definition.short,
            label,
            type: typeBoolean,
            input: optionValue,
          });
        },
      };
    },
  };
}

/**
 * Creates an option that accepts exactly one value (e.g. `--output dist/`).
 *
 * Parsing: absent → `default()`; once → decoded with `type`; more than once → {@link TypoError}.
 * Value syntax: `--long value`, `--long=value`, `-s value`, `-s=value`, `-svalue`.
 *
 * @typeParam Value - Type produced by the decoder.
 *
 * @param definition - Option configuration.
 * @param definition.long - Long-form name (without `--`).
 * @param definition.short - Short-form name (without `-`).
 * @param definition.description - Help text.
 * @param definition.hint - Short note shown in parentheses.
 * @param definition.aliases - Additional names.
 * @param definition.label - Value placeholder in help. Defaults to uppercased `type.content`.
 * @param definition.type - Decoder for the raw string value.
 * @param definition.default - Default when absent. Throw to make the option required.
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
    registerAndMakeDecoder(readerOptions: ReaderOptions) {
      const key = registerOption(readerOptions, {
        ...definition,
        valued: true,
      });
      return {
        getAndDecodeValue() {
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
          return decodeValue({
            long: definition.long,
            short: definition.short,
            label,
            type: definition.type,
            input: optionValue,
          });
        },
      };
    },
  };
}

/**
 * Creates an option that collects every occurrence into an array (e.g. `--file a.ts --file b.ts`).
 *
 * Parsing: absent → `[]`; N occurrences → array of N decoded values in order.
 * Value syntax: `--long value`, `--long=value`, `-s value`, `-s=value`, `-svalue`.
 *
 * @typeParam Value - Type produced by the decoder for each occurrence.
 *
 * @param definition - Option configuration.
 * @param definition.long - Long-form name (without `--`).
 * @param definition.short - Short-form name (without `-`).
 * @param definition.description - Help text.
 * @param definition.hint - Short note shown in parentheses.
 * @param definition.aliases - Additional names.
 * @param definition.label - Value placeholder in help. Defaults to uppercased `type.content`.
 * @param definition.type - Decoder applied to each raw string value.
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
    registerAndMakeDecoder(readerOptions: ReaderOptions) {
      const key = registerOption(readerOptions, {
        ...definition,
        valued: true,
      });
      return {
        getAndDecodeValue() {
          const optionValues = readerOptions.getOptionValues(key);
          return optionValues.map((optionValue) =>
            decodeValue({
              long: definition.long,
              short: definition.short,
              label,
              type: definition.type,
              input: optionValue,
            }),
          );
        },
      };
    },
  };
}

function decodeValue<Value>(params: {
  long: string;
  short: string | undefined;
  label: string;
  type: Type<Value>;
  input: string;
}): Value {
  return TypoError.tryWithContext(
    () => params.type.decoder(params.input),
    () => {
      const text = new TypoText();
      if (params.short) {
        text.pushString(new TypoString(`-${params.short}`, typoStyleConstants));
        text.pushString(new TypoString(`, `));
      }
      text.pushString(new TypoString(`--${params.long}`, typoStyleConstants));
      text.pushString(new TypoString(`: `));
      text.pushString(new TypoString(params.label, typoStyleUserInput));
      text.pushString(new TypoString(`: `));
      text.pushString(new TypoString(params.type.content, typoStyleLogic));
      return text;
    },
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

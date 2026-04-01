import { ReaderOptionParsing, ReaderArgs as ReaderOptions } from "./Reader";
import { Type, typeBoolean, typeOneOf } from "./Type";
import {
  TypoError,
  TypoString,
  typoStyleConstants,
  typoStyleLogic,
  typoStyleUserInput,
  TypoText,
} from "./Typo";
import { UsageOption } from "./Usage";
// TODO - one of, or many of combinatorial options.

/**
 * A CLI option. Created with {@link optionFlag}, {@link optionSingleValue},
 * or {@link optionRepeatable}.
 *
 * @typeParam Value - Decoded value type.
 */
export type Option<Value> = {
  /**
   * Returns metadata for the `Options:` section.
   */
  generateUsage(): UsageOption;
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
 * Creates a boolean flag option (`--verbose`, optionally `--flag=no`).
 *
 * Parsing: absent → default value; `--flag` / `--flag=yes` → `true`; `--flag=no` → `false`;
 * specified more than once → throws {@link TypoError}.
 *
 * @param definition.long - Long-form name (without `--`).
 * @param definition.short - Short-form name (without `-`).
 * @param definition.description - Help text.
 * @param definition.hint - Short note shown in parentheses.
 * @param definition.aliases - Additional names.
 * @param definition.default - Default value when absent.
 * @returns An {@link Option}`<boolean>`.
 *
 * @example
 * ```ts
 * const verboseFlag = optionFlag({
 *   long: "verbose",
 *   short: "v",
 *   description: "Enable verbose output",
 * });
 * // Usage:
 * //   my-cli  →  false
 * //   my-cli --verbose  →  true
 * //   my-cli --verbose=yes  →  true
 * //   my-cli -v=no  →  false
 * ```
 */
export function optionFlag(definition: {
  long: string;
  short?: string;
  description?: string;
  hint?: string;
  aliases?: { longs?: Array<string>; shorts?: Array<string> };
  default?: boolean;
}): Option<boolean> {
  const type = typeBoolean("=");
  const { long, short, description, hint, aliases } = definition;
  return {
    generateUsage() {
      return { short, long, annotation: "[=no]", description, hint };
    },
    registerAndMakeDecoder(readerOptions: ReaderOptions) {
      const longNegative = `no-${long}`;
      const aliasesLongsNegatives = aliases?.longs?.map(
        (aliasLong) => `no-${aliasLong}`,
      );
      const keyNegative = registerOption(readerOptions, {
        long: longNegative,
        short: undefined,
        aliasesShorts: undefined,
        aliasesLongs: aliasesLongsNegatives,
        parsing: { consumeShortGroup: false, consumeNextArg: () => false },
      });
      const keyPositive = registerOption(readerOptions, {
        long,
        short,
        aliasesLongs: aliases?.longs,
        aliasesShorts: aliases?.shorts,
        parsing: { consumeShortGroup: false, consumeNextArg: () => false },
      });
      return {
        getAndDecodeValue() {
          const negativeResults = readerOptions.getOptionValues(keyNegative);
          const positiveResults = readerOptions.getOptionValues(keyPositive);
          if (positiveResults.length > 1) {
            throwSetMultipleTimesError(long);
          }
          if (negativeResults.length > 1) {
            throwSetMultipleTimesError(longNegative);
          }
          if (negativeResults.length > 0 && positiveResults.length > 0) {
            throw new TypoError(
              new TypoText(
                new TypoString(`--${long}`, typoStyleConstants),
                new TypoString(`: Must not be set in combination with: `),
                new TypoString(`--${longNegative}`, typoStyleConstants),
              ),
            );
          }
          if (negativeResults.length > 0) {
            const negativeResult = negativeResults[0]!;
            if (negativeResult.inlined) {
              throw new TypoError(
                new TypoText(
                  new TypoString(`--${longNegative}`, typoStyleConstants),
                  new TypoString(`: Must not have a value`),
                ),
              );
            }
            return false;
          }
          if (positiveResults.length === 0) {
            return definition.default === undefined
              ? false
              : definition.default;
          }
          const positiveResult = positiveResults[0]!;
          const input =
            positiveResult.inlined === null ? "true" : positiveResult.inlined;
          return decodeValue({ long, short, type, input });
        },
      };
    },
  };
}

/**
 * Creates an option that accepts one value from a predefined set of strings (e.g. `--color=auto`).
 *
 * Parsing: absent → `defaultUnset()`; present with no value → `defaultEmpty()`; present with value → decoded with `typeOneOf`.
 * Value syntax: `--choice=value`, `-c=value`, `-cvalue`, `--choice`, `-c`.
 * Note: `--choice` and `-c` are treated as present with no value, not with an empty string value.
 *
 * @param definition
 * @param definition.long - Long-form name (without `--`).
 * @param definition.short - Short-form name (without `-`).
 * @param definition.description - Help text.
 * @param definition.hint - Short note shown in parentheses.
 * @param definition.aliases - Additional names.
 * @param definition.content - Value placeholder in help.
 * @param definition.choices - Allowed values.
 * @param definition.defaultUnset - Default when the option is absent. Throw to make the option required.
 * @param definition.defaultEmpty - Default when the option is present with no value. Throw to disallow this syntax.
 * @returns An {@link Option}`<Value>`.
 *
 * @example
 * ```ts
 * const colorOption = optionChoice({
 *   long: "color",
 *   content: "color-mode",
 *   choices: ["auto", "always", "never"],
 *   defaultUnset: () => "auto",
 *   defaultEmpty: () => "always",
 * });
 * // Usage:
 * //   my-cli  →  "auto"
 * //   my-cli --color  →  "always"
 * //   my-cli --color=never  →  "never"
 * ```
 */
export function optionChoice<const Value extends string>(definition: {
  long: string;
  short?: string;
  description?: string;
  hint?: string;
  aliases?: { longs?: Array<string>; shorts?: Array<string> };
  content: string;
  choices: Array<Value>;
  defaultUnset: () => Value;
  defaultEmpty: () => Value;
}): Option<Value> {
  const type = typeOneOf(definition.content, definition.choices);
  const { long, short, description, hint, aliases } = definition;
  const label = `<${type.content}>`;
  return {
    generateUsage() {
      return { short, long, label, description, hint };
    },
    registerAndMakeDecoder(readerOptions: ReaderOptions) {
      const key = registerOption(readerOptions, {
        long,
        short,
        aliasesLongs: aliases?.longs,
        aliasesShorts: aliases?.shorts,
        parsing: { consumeShortGroup: false, consumeNextArg: () => false },
      });
      return {
        getAndDecodeValue() {
          const optionResults = readerOptions.getOptionValues(key);
          if (optionResults.length > 1) {
            throwSetMultipleTimesError(long);
          }
          if (optionResults.length === 0) {
            return definition.defaultUnset();
          }
          if (optionResults[0]!.inlined === null) {
            return definition.defaultEmpty();
          }
          const input = optionResults[0]!.inlined!;
          return decodeValue({ long, short, label, type, input });
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
 * @param definition.long - Long-form name (without `--`).
 * @param definition.short - Short-form name (without `-`).
 * @param definition.description - Help text.
 * @param definition.hint - Short note shown in parentheses.
 * @param definition.aliases - Additional names.
 * @param definition.type - Decoder for the raw string value.
 * @param definition.default - Default when absent. Throw to make the option required.
 * @returns An {@link Option}`<Value>`.
 *
 * @example
 * ```ts
 * const outputOption = optionSingleValue({
 *   long: "output",
 *   short: "o",
 *   type: typePath(),
 *   description: "Output directory",
 *   default: () => "dist",
 * });
 * // Usage:
 * //   my-cli  →  "dist"
 * //   my-cli --output folder  →  "folder"
 * //   my-cli -o folder  →  "folder"
 * ```
 */
export function optionSingleValue<Value>(definition: {
  long: string;
  short?: string;
  description?: string;
  hint?: string;
  aliases?: { longs?: Array<string>; shorts?: Array<string> };
  type: Type<Value>;
  default: () => Value;
}): Option<Value> {
  const { long, short, description, hint, aliases, type } = definition;
  const label = `<${type.content}>`;
  return {
    generateUsage() {
      return { short, long, label, description, hint };
    },
    registerAndMakeDecoder(readerOptions: ReaderOptions) {
      const key = registerOption(readerOptions, {
        long,
        short,
        aliasesLongs: aliases?.longs,
        aliasesShorts: aliases?.shorts,
        parsing: {
          consumeShortGroup: true,
          consumeNextArg: (inlined, separated) =>
            inlined === null && separated.length === 0,
        },
      });
      return {
        getAndDecodeValue() {
          const optionResults = readerOptions.getOptionValues(key);
          if (optionResults.length > 1) {
            throw new TypoError(
              new TypoText(
                new TypoString(`--${long}`, typoStyleConstants),
                new TypoString(`: Requires a single value, but got multiple`),
              ),
            );
          }
          const optionResult = optionResults[0];
          if (optionResult === undefined) {
            try {
              return definition.default();
            } catch (error) {
              throw new TypoError(
                new TypoText(
                  new TypoString(`--${long}`, typoStyleConstants),
                  new TypoString(`: Failed to get default value`),
                ),
                error,
              );
            }
          }
          const input = optionResult.inlined ?? optionResult.separated[0]!;
          return decodeValue({ long, short, label, type, input });
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
 * @param definition.long - Long-form name (without `--`).
 * @param definition.short - Short-form name (without `-`).
 * @param definition.description - Help text.
 * @param definition.hint - Short note shown in parentheses.
 * @param definition.aliases - Additional names.
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
  long: string;
  short?: string;
  description?: string;
  hint?: string;
  aliases?: { longs?: Array<string>; shorts?: Array<string> };
  type: Type<Value>;
}): Option<Array<Value>> {
  const { long, short, description, hint, aliases, type } = definition;
  const label = `<${type.content}>`;
  return {
    generateUsage() {
      return { short, long, label, annotation: " [*]", description, hint };
    },
    registerAndMakeDecoder(readerOptions: ReaderOptions) {
      const key = registerOption(readerOptions, {
        long,
        short,
        aliasesLongs: aliases?.longs,
        aliasesShorts: aliases?.shorts,
        parsing: {
          consumeShortGroup: true,
          consumeNextArg: (inlined, separated) =>
            inlined === null && separated.length === 0,
        },
      });
      return {
        getAndDecodeValue() {
          const optionResults = readerOptions.getOptionValues(key);
          return optionResults.map((optionResult) => {
            const input = optionResult.inlined ?? optionResult.separated[0]!;
            return decodeValue({ long, short, label, type, input });
          });
        },
      };
    },
  };
}

function decodeValue<Value>(params: {
  long: string;
  short?: string | undefined;
  label?: string | undefined;
  type: Type<Value>;
  input: string;
}): Value {
  return TypoError.tryWithContext(
    () => params.type.decoder(params.input),
    () => {
      const text = new TypoText();
      if (params.short) {
        text.push(new TypoString(`-${params.short}`, typoStyleConstants));
        text.push(new TypoString(`, `));
      }
      text.push(new TypoString(`--${params.long}`, typoStyleConstants));
      if (params.label) {
        text.push(new TypoString(`: `));
        text.push(new TypoString(params.label, typoStyleUserInput));
      } else {
        text.push(new TypoString(`: `));
        text.push(new TypoString(params.type.content, typoStyleLogic));
      }
      return text;
    },
  );
}

function registerOption(
  readerOptions: ReaderOptions,
  definition: {
    long: string;
    short: undefined | string;
    aliasesLongs: undefined | Array<string>;
    aliasesShorts: undefined | Array<string>;
    parsing: ReaderOptionParsing;
  },
) {
  const { long, short, aliasesLongs, aliasesShorts, parsing } = definition;
  const longs = long ? [long] : [];
  if (aliasesLongs) {
    longs.push(...aliasesLongs);
  }
  const shorts = short ? [short] : [];
  if (aliasesShorts) {
    shorts.push(...aliasesShorts);
  }
  return readerOptions.registerOption({ longs, shorts, parsing });
}

function throwSetMultipleTimesError(long: string): never {
  throw new TypoError(
    new TypoText(
      new TypoString(`--${long}`, typoStyleConstants),
      new TypoString(`: Must not be set multiple times`),
    ),
  );
}

import { ReaderOptionParsing, ReaderArgs as ReaderOptions } from "./Reader";
import { Type, typeBoolean } from "./Type";
import {
  TypoError,
  TypoString,
  typoStyleConstants,
  typoStyleLogic,
  typoStyleUserInput,
  TypoText,
} from "./Typo";
import { UsageOption } from "./Usage";

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
 * Parsing: absent → `false`; `--flag` / `--flag=yes` → `true`; `--flag=no` → `false`;
 * specified more than once → {@link TypoError}.
 *
 * @param definition.long - Long-form name (without `--`).
 * @param definition.short - Short-form name (without `-`).
 * @param definition.description - Help text.
 * @param definition.hint - Short note shown in parentheses.
 * @param definition.aliases - Additional names.
 * @param definition.default - Default when absent. Defaults to `false`.
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
  default?: boolean;
}): Option<boolean> {
  const label = `<${typeBoolean.content.toUpperCase()}>`;
  return {
    generateUsage() {
      return {
        short: definition.short,
        long: definition.long,
        label: undefined,
        annotation: "[=no]",
        description: definition.description,
        hint: definition.hint,
      };
    },
    registerAndMakeDecoder(readerOptions: ReaderOptions) {
      const longNegative = `no-${definition.long}` as Lowercase<string>;
      const aliasesLongsNegatives = definition.aliases?.longs?.map(
        (aliasLong) => `no-${aliasLong}` as Lowercase<string>,
      );
      const keyNegative = registerOption(readerOptions, {
        long: longNegative,
        short: undefined,
        aliasesShorts: undefined,
        aliasesLongs: aliasesLongsNegatives,
        parsing: { consumeShortGroup: false, consumeNextArg: () => false },
      });
      const keyPositive = registerOption(readerOptions, {
        long: definition.long,
        short: definition.short,
        aliasesLongs: definition.aliases?.longs,
        aliasesShorts: definition.aliases?.shorts,
        parsing: { consumeShortGroup: false, consumeNextArg: () => false },
      });
      return {
        getAndDecodeValue() {
          const negativeResults = readerOptions.getOptionValues(keyNegative);
          const positiveResults = readerOptions.getOptionValues(keyPositive);
          if (positiveResults.length > 1) {
            throw new TypoError(
              new TypoText(
                new TypoString(`--${definition.long}`, typoStyleConstants),
                new TypoString(`: Must not be set multiple times`),
              ),
            );
          }
          if (negativeResults.length > 1) {
            throw new TypoError(
              new TypoText(
                new TypoString(`--${longNegative}`, typoStyleConstants),
                new TypoString(`: Must not be set multiple times`),
              ),
            );
          }
          if (negativeResults.length > 0 && positiveResults.length > 0) {
            throw new TypoError(
              new TypoText(
                new TypoString(`--${definition.long}`, typoStyleConstants),
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
          if (positiveResults.length > 0) {
            const positiveResult = positiveResults[0]!;
            return decodeValue({
              long: definition.long,
              short: definition.short,
              label,
              type: typeBoolean,
              input:
                positiveResult.inlined === null
                  ? "true"
                  : positiveResult.inlined,
            });
          }
          return definition.default ?? false;
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
        short: definition.short,
        long: definition.long,
        label: label as Uppercase<string>,
        annotation: undefined,
        description: definition.description,
        hint: definition.hint,
      };
    },
    registerAndMakeDecoder(readerOptions: ReaderOptions) {
      const key = registerOption(readerOptions, {
        long: definition.long,
        short: definition.short,
        aliasesLongs: definition.aliases?.longs,
        aliasesShorts: definition.aliases?.shorts,
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
                new TypoString(`--${definition.long}`, typoStyleConstants),
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
            input: optionResult.inlined ?? optionResult.separated[0]!,
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
        short: definition.short,
        long: definition.long,
        label: label as Uppercase<string>,
        annotation: " [*]",
        description: definition.description,
        hint: definition.hint,
      };
    },
    registerAndMakeDecoder(readerOptions: ReaderOptions) {
      const key = registerOption(readerOptions, {
        long: definition.long,
        short: definition.short,
        aliasesLongs: definition.aliases?.longs,
        aliasesShorts: definition.aliases?.shorts,
        parsing: {
          consumeShortGroup: true,
          consumeNextArg: (inlined, separated) =>
            inlined === null && separated.length === 0,
        },
      });
      return {
        getAndDecodeValue() {
          const optionResults = readerOptions.getOptionValues(key);
          return optionResults.map((optionResult) =>
            decodeValue({
              long: definition.long,
              short: definition.short,
              label,
              type: definition.type,
              input: optionResult.inlined ?? optionResult.separated[0]!,
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
        text.push(new TypoString(`-${params.short}`, typoStyleConstants));
        text.push(new TypoString(`, `));
      }
      text.push(new TypoString(`--${params.long}`, typoStyleConstants));
      text.push(new TypoString(`: `));
      text.push(new TypoString(params.label, typoStyleUserInput));
      text.push(new TypoString(`: `));
      text.push(new TypoString(params.type.content, typoStyleLogic));
      return text;
    },
  );
}

function registerOption(
  readerOptions: ReaderOptions,
  definition: {
    long: Lowercase<string>;
    short: undefined | string;
    aliasesLongs: undefined | Array<Lowercase<string>>;
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

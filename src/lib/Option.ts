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
   * @throws if decoding failed.
   */
  getAndDecodeValue(): Value;
};

/**
 * Creates a boolean flag option (`--verbose`, optionally `--flag=no`).
 *
 * Syntax: `--long`, `--long=no`, `-s`, `-s=no`.
 * Parsing logic:
 * - absent → default value
 * - `--flag` / `--flag=yes` → `true`
 * - `--flag=no` → `false`
 * - specified more than once → throws.
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
  const typeBool = typeBoolean("value");
  const { long, short, description, hint, aliases } = definition;
  return {
    generateUsage() {
      return { short, long, annotation: "[=no]", description, hint };
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
            return definition.default === undefined
              ? false
              : definition.default;
          }
          const positiveResult = optionResults[0]!;
          const value =
            positiveResult.inlined === null ? "true" : positiveResult.inlined;
          return decodeValue({ long, type: typeBool, input: value });
        },
      };
    },
  };
}

/**
 * Creates an option that accepts exactly one value (e.g. `--output dist/`).
 *
 * Syntax: `--long value`, `--long=value`, `-s value`, `-s=value`, `-svalue`.
 * Parsing logic:
 * - absent → `defaultIfNotSpecified()`
 * - once → decoded with `type`
 * - more than once → throws
 *
 * @typeParam Value - Type produced by the decoder.
 *
 * @param definition.long - Long-form name (without `--`).
 * @param definition.short - Short-form name (without `-`).
 * @param definition.description - Help text.
 * @param definition.hint - Short note shown in parentheses.
 * @param definition.aliases - Additional names.
 * @param definition.type - Decoder for the raw string value.
 * @param definition.defaultIfNotSpecified - Default value when the option is not specified at all.
 * @param definition.valueIfNothingInlined - Default value when the option is specified without an inline value (e.g. `--option` or `-o`).
 * @returns An {@link Option}`<Value>`.
 *
 * @example
 * ```ts
 * const outputOption = optionSingleValue({
 *   long: "output",
 *   short: "o",
 *   type: typePath(),
 *   description: "Output directory",
 *   defaultIfNotSpecified: () => "dist",
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
  defaultIfNotSpecified: () => Value;
  valueIfNothingInlined?: () => Value;
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
          consumeNextArg(inlined, separated) {
            if (definition.valueIfNothingInlined !== undefined) {
              return false;
            }
            return inlined === null && separated.length === 0;
          },
        },
      });
      return {
        getAndDecodeValue() {
          const optionResults = readerOptions.getOptionValues(key);
          if (optionResults.length > 1) {
            throwSetMultipleTimesError(long);
          }
          const optionResult = optionResults[0];
          if (optionResult === undefined) {
            try {
              return definition.defaultIfNotSpecified();
            } catch (error) {
              const context = "Not specified";
              throwFailedToGetDefaultValueError({ long, error, context });
            }
          }
          if (optionResult.inlined) {
            const inlined = optionResult.inlined;
            return decodeValue({ long, label, type, input: inlined });
          }
          if (definition.valueIfNothingInlined !== undefined) {
            try {
              return definition.valueIfNothingInlined();
            } catch (error) {
              const context = "Nothing inlined";
              throwFailedToGetDefaultValueError({ long, error, context });
            }
          }
          const separated = optionResult.separated[0]!;
          return decodeValue({ long, label, type, input: separated });
        },
      };
    },
  };
}

/**
 * Creates an option that collects every occurrence into an array (e.g. `--file a.ts --file b.ts`).
 *
 * Syntax: `--long value`, `--long=value`, `-s value`, `-s=value`, `-svalue`.
 * Parsing logic:
 * - absent → `[]`
 * - N occurrences → array of N decoded values in order.
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
            return decodeValue({ long, label, type, input });
          });
        },
      };
    },
  };
}

function decodeValue<Value>(params: {
  long: string;
  label?: string | undefined;
  type: Type<Value>;
  input: string;
}): Value {
  return TypoError.tryWithContext(
    () => params.type.decoder(params.input),
    () => {
      const errorText = new TypoText();
      errorText.push(new TypoString(`--${params.long}`, typoStyleConstants));
      if (params.label) {
        errorText.push(new TypoString(`: `));
        errorText.push(new TypoString(params.label, typoStyleUserInput));
      } else {
        errorText.push(new TypoString(`: `));
        errorText.push(new TypoString(params.type.content, typoStyleLogic));
      }
      return errorText;
    },
  );
}

// TODO - move advanced maybe for handling multiple options with shared logic (e.g. flag options with multiple aliases)
function registerOption(
  readerOptions: ReaderOptions,
  definition: {
    long: string;
    short: undefined | string;
    // label: string;
    // description: string | undefined;
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

function throwFailedToGetDefaultValueError(params: {
  long: string;
  error: unknown;
  context: string;
}): never {
  const errorText = new TypoText();
  errorText.push(new TypoString(`--${params.long}`, typoStyleConstants));
  errorText.push(new TypoString(`: ${params.context}`));
  errorText.push(new TypoString(`: Failed to get default value`));
  throw new TypoError(errorText, params.error);
}

import {
  ReaderOptionGetter,
  ReaderOptionNextGuard,
  ReaderOptionRestGuard,
  ReaderOptions,
  ReaderOptionValue,
} from "./Reader";
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
  const type = typeBoolean("value");
  const { long, short, description, hint, aliases } = definition;
  return {
    generateUsage() {
      return { short, long, annotation: "[=no]", description, hint };
    },
    registerAndMakeDecoder(readerOptions: ReaderOptions) {
      const resultsGetter = setupOptionAliased(readerOptions, {
        longKey: long,
        shortKey: short,
        aliasLongKeys: aliases?.longs,
        aliasShortKeys: aliases?.shorts,
        restGuard: () => false,
        nextGuard: () => false,
      });
      return {
        getAndDecodeValue() {
          const results = resultsGetter();
          if (results.length > 1) {
            throwSetMultipleTimesError(results.map((r) => r.identifier));
          }
          if (results.length === 0) {
            return definition.default === undefined
              ? false
              : definition.default;
          }
          const input = results[0]!.value.inlined;
          if (input === null) {
            return true;
          }
          return decodeValue({ long, label: undefined, type, input });
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
 * - absent → `fallbackValueIfNotSet()`
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
 * @param definition.fallbackValueIfAbsent - Default value when the option is not specified at all.
 * @param definition.impliedValueIfNotInlined - Default value when the option is specified without an inline value (e.g. `--option` or `-o`).
 * @returns An {@link Option}`<Value>`.
 *
 * @example
 * ```ts
 * const outputOption = optionSingleValue({
 *   long: "output",
 *   short: "o",
 *   type: typePath(),
 *   description: "Output directory",
 *   fallbackValueIfNotSet: () => "dist",
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
  fallbackValueIfAbsent?: () => Value;
  impliedValueIfNotInlined?: () => Value;
}): Option<Value> {
  const { long, short, description, hint, aliases, type } = definition;
  const label = `<${type.content}>`;
  return {
    generateUsage() {
      return { short, long, label, description, hint };
    },
    registerAndMakeDecoder(readerOptions: ReaderOptions) {
      const resultsGetter = setupOptionAliased(readerOptions, {
        longKey: long,
        shortKey: short,
        aliasLongKeys: aliases?.longs,
        aliasShortKeys: aliases?.shorts,
        restGuard: () => {
          if (definition.impliedValueIfNotInlined !== undefined) {
            return false;
          }
          return true;
        },
        nextGuard: (value) => {
          if (definition.impliedValueIfNotInlined !== undefined) {
            return false;
          }
          if (value.inlined !== null) {
            return false;
          }
          if (value.separated.length !== 0) {
            return false;
          }
          return true;
        },
      });
      return {
        getAndDecodeValue() {
          const results = resultsGetter();
          if (results.length > 1) {
            throwSetMultipleTimesError(
              results.map((result) => result.identifier),
            );
          }
          const result = results[0];
          if (result === undefined) {
            if (definition.fallbackValueIfAbsent === undefined) {
              const errorText = makeErrorText({ long, label, type });
              errorText.push(new TypoString(`: Is required, but was not set.`));
              throw new TypoError(errorText);
            }
            try {
              return definition.fallbackValueIfAbsent();
            } catch (error) {
              const errorText = makeErrorText({ long, label, type });
              errorText.push(new TypoString(`: Failed to get fallback value.`));
              throw new TypoError(errorText, error);
            }
          }
          const inlined = result.value.inlined;
          if (inlined) {
            return decodeValue({ long, label, type, input: inlined });
          }
          if (definition.impliedValueIfNotInlined !== undefined) {
            try {
              return definition.impliedValueIfNotInlined();
            } catch (error) {
              const errorText = makeErrorText({ long, label, type });
              errorText.push(new TypoString(`: Failed to get implied value.`));
              throw new TypoError(errorText, error);
            }
          }
          const separated = result.value.separated[0]!;
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
      const resultsGetter = setupOptionAliased(readerOptions, {
        longKey: long,
        shortKey: short,
        aliasLongKeys: aliases?.longs,
        aliasShortKeys: aliases?.shorts,
        restGuard: () => true,
        nextGuard: (value) => {
          if (value.inlined !== null) {
            return false;
          }
          if (value.separated.length !== 0) {
            return false;
          }
          return true;
        },
      });
      return {
        getAndDecodeValue() {
          return resultsGetter().map((result) => {
            const value = result.value;
            const input = value.inlined ?? value.separated[0]!;
            return decodeValue({ long, label, type, input });
          });
        },
      };
    },
  };
}

function decodeValue<Value>(params: {
  long: string;
  label: string | undefined;
  type: Type<Value>;
  input: string;
}): Value {
  const { long, label, type, input } = params;
  return TypoError.tryWithContext(
    () => type.decoder(input),
    () => makeErrorText({ long, label, type }),
  );
}

function makeErrorText(params: {
  long: string;
  label: string | undefined;
  type: Type<any>;
}): TypoText {
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
}

function setupOptionAliased(
  readerOptions: ReaderOptions,
  params: {
    longKey: string;
    shortKey: string | undefined;
    aliasLongKeys: Array<string> | undefined;
    aliasShortKeys: Array<string> | undefined;
    restGuard: ReaderOptionRestGuard;
    nextGuard: ReaderOptionNextGuard;
  },
): () => Array<{ identifier: string; value: ReaderOptionValue }> {
  const { longKey, shortKey, aliasLongKeys, aliasShortKeys } = params;
  const longKeys = [longKey];
  if (aliasLongKeys) {
    longKeys.push(...aliasLongKeys);
  }
  const shortKeys = shortKey ? [shortKey] : [];
  if (aliasShortKeys) {
    shortKeys.push(...aliasShortKeys);
  }
  return setupOptionMany(readerOptions, {
    longKeys,
    shortKeys,
    restGuard: params.restGuard,
    nextGuard: params.nextGuard,
  });
}

function setupOptionMany(
  readerOptions: ReaderOptions,
  params: {
    longKeys: Array<string>;
    shortKeys: Array<string>;
    restGuard: ReaderOptionRestGuard;
    nextGuard: ReaderOptionNextGuard;
  },
): () => Array<{ identifier: string; value: ReaderOptionValue }> {
  const { longKeys, shortKeys, restGuard, nextGuard } = params;
  const getters = new Array<ReaderOptionGetter>();
  for (const key of longKeys) {
    getters.push(readerOptions.registerOptionLong({ key, nextGuard }));
  }
  for (const key of shortKeys) {
    getters.push(
      readerOptions.registerOptionShort({ key, restGuard, nextGuard }),
    );
  }
  return () => {
    const results = new Array();
    for (const getter of getters) {
      const { identifier, values } = getter();
      for (const value of values) {
        results.push({ identifier, value });
      }
    }
    return results;
  };
}

function throwSetMultipleTimesError(identifiers: Array<string>): never {
  const identifiersTexts = Array.from(new Set(identifiers)).map(
    (identifier) => new TypoString(identifier, typoStyleConstants),
  );
  const errorText = new TypoText();
  errorText.pushJoined(identifiersTexts, new TypoString(", "), 3);
  errorText.push(new TypoString(`: Must not be set multiple times.`));
  throw new TypoError(errorText);
}

import { ReaderPositionals } from "./Reader";
import { Type } from "./Type";
import {
  TypoError,
  TypoString,
  typoStyleLogic,
  typoStyleUserInput,
  TypoText,
} from "./Typo";

/**
 * A bare (non-option) positional argument with its parsing and usage-generation logic.
 *
 * Created with {@link positionalRequired}, {@link positionalOptional}, or
 * {@link positionalVariadics} and passed via the `positionals` array of
 * {@link operation}, consumed in declaration order.
 *
 * @typeParam Value - Parsed value type.
 */
export type Positional<Value> = {
  /** Returns metadata used to render the `Positionals:` section of help. */
  generateUsage(): PositionalUsage;
  /**
   * Consumes the next positional token from `readerPositionals` and returns a parser
   * that produces the final decoded value.
   *
   * Called during {@link Operation.createFactory}. May defer a {@link TypoError}
   * (e.g. missing required token) to {@link PositionalParser.parseValue}.
   *
   * @param readerPositionals - Source of positional tokens.
   */
  createParser(readerPositionals: ReaderPositionals): PositionalParser<Value>;
};

/**
 * Retrieves the parsed value for a positional argument.
 *
 * Returned by {@link Positional.createParser}, called by {@link OperationFactory.createInstance}.
 *
 * @typeParam Value - Parsed value type.
 */
export type PositionalParser<Value> = {
  /**
   * Returns the decoded positional value.
   *
   * @throws {@link TypoError} if the positional was missing (when required) or if decoding failed.
   */
  parseValue(): Value;
};

/**
 * Human-readable metadata for a single positional argument, used to render the
 * `Positionals:` section of the help output produced by {@link usageToStyledLines}.
 */
export type PositionalUsage = {
  /** Help text. */
  description: string | undefined;
  /** Short note shown in parentheses. */
  hint: string | undefined;
  /**
   * Placeholder label shown in the usage line and the `Positionals:` section.
   * Required: `<NAME>`, optional: `[NAME]`, variadic: `[NAME]...`.
   */
  label: Uppercase<string>;
};

/**
 * Creates a required positional argument — one that must be present on the command line.
 *
 * Consumes the next available positional token and decodes it with `definition.type`.
 * If no token is available a {@link TypoError} is thrown inside
 * {@link Operation.createFactory}. The usage label defaults to the uppercased
 * `type.content` wrapped in angle brackets (e.g. `<STRING>`); supply `label` to
 * override.
 *
 * @typeParam Value - TypeScript type produced by the decoder.
 *
 * @param definition - Configuration for the positional.
 * @param definition.description - Help text.
 * @param definition.hint - Short note shown in parentheses.
 * @param definition.label - Label (without brackets). Defaults to uppercased `type.content`.
 * @param definition.type - Decoder for the raw string token.
 * @returns A {@link Positional}`<Value>`.
 *
 * @example
 * ```ts
 * const namePositional = positionalRequired({
 *   type: typeString,
 *   label: "NAME",
 *   description: "The name to greet",
 * });
 * // Parses: my-cli Alice  →  "Alice"
 * ```
 */
export function positionalRequired<Value>(definition: {
  description?: string;
  hint?: string;
  label?: Uppercase<string>;
  type: Type<Value>;
}): Positional<Value> {
  const label = `<${definition.label ?? definition.type.content.toUpperCase()}>`;
  return {
    generateUsage() {
      return {
        description: definition.description,
        hint: definition.hint,
        label: label as Uppercase<string>,
      };
    },
    createParser(readerPositionals: ReaderPositionals) {
      const positional = readerPositionals.consumePositional();
      if (positional === undefined) {
        throw new TypoError(
          new TypoText(
            new TypoString(label, typoStyleUserInput),
            new TypoString(`: Is required, but was not provided`),
          ),
        );
      }
      return {
        parseValue() {
          return decodeValue(label, definition.type, positional);
        },
      };
    },
  };
}

/**
 * Creates an optional positional argument — one that may or may not appear on the
 * command line.
 *
 * Consumes the next available positional token. If no token is available,
 * `definition.default()` supplies the fallback value (a throwing factory makes the
 * positional effectively required). The usage label defaults to the uppercased
 * `type.content` wrapped in square brackets (e.g. `[STRING]`); supply `label` to
 * override.
 *
 * @typeParam Value - TypeScript type produced by the decoder (or the default).
 *
 * @param definition - Configuration for the positional.
 * @param definition.description - Help text.
 * @param definition.hint - Short note shown in parentheses.
 * @param definition.label - Label (without brackets). Defaults to uppercased `type.content`.
 * @param definition.type - Decoder for the raw string token.
 * @param definition.default - Value when absent. Throw to make it required.
 * @returns A {@link Positional}`<Value>`.
 *
 * @example
 * ```ts
 * const greeteePositional = positionalOptional({
 *   type: typeString,
 *   label: "NAME",
 *   description: "Name to greet (default: world)",
 *   default: () => "world",
 * });
 * // my-cli         →  "world"
 * // my-cli Alice   →  "Alice"
 * ```
 */
export function positionalOptional<Value>(definition: {
  description?: string;
  hint?: string;
  label?: Uppercase<string>;
  type: Type<Value>;
  default: () => Value;
}): Positional<Value> {
  const label = `[${definition.label ?? definition.type.content.toUpperCase()}]`;
  return {
    generateUsage() {
      return {
        description: definition.description,
        hint: definition.hint,
        label: label as Uppercase<string>,
      };
    },
    createParser(readerPositionals: ReaderPositionals) {
      const positional = readerPositionals.consumePositional();
      return {
        parseValue() {
          if (positional === undefined) {
            try {
              return definition.default();
            } catch (error) {
              throw new TypoError(
                new TypoText(
                  new TypoString(label, typoStyleUserInput),
                  new TypoString(`: Failed to get default value`),
                ),
                error,
              );
            }
          }
          return decodeValue(label, definition.type, positional);
        },
      };
    },
  };
}

/**
 * Creates a variadic positional argument that collects zero or more remaining
 * positional tokens into an array.
 *
 * Greedily consumes tokens until the list is exhausted or the optional
 * `endDelimiter` sentinel is encountered (consumed but excluded from the result).
 * Each token is decoded independently with `definition.type`. Returns `[]` when
 * absent. The usage label defaults to the uppercased `type.content` wrapped in
 * `[...]...` notation (e.g. `[STRING]...`); supply `label` to override.
 *
 * @typeParam Value - TypeScript type produced by the decoder for each token.
 *
 * @param definition - Configuration for the variadic positional.
 * @param definition.endDelimiter - Sentinel token that stops collection (consumed, not included).
 * @param definition.description - Help text.
 * @param definition.hint - Short note shown in parentheses.
 * @param definition.label - Label (without brackets). Defaults to uppercased `type.content`.
 * @param definition.type - Decoder applied to each token.
 * @returns A {@link Positional}`<Array<Value>>`.
 *
 * @example
 * ```ts
 * const filesPositional = positionalVariadics({
 *   type: typeString,
 *   label: "FILE",
 *   description: "Files to process",
 * });
 * // my-cli a.ts b.ts c.ts  →  ["a.ts", "b.ts", "c.ts"]
 * // my-cli                  →  []
 * ```
 */
export function positionalVariadics<Value>(definition: {
  endDelimiter?: string;
  description?: string;
  hint?: string;
  label?: Uppercase<string>;
  type: Type<Value>;
}): Positional<Array<Value>> {
  const label = `[${definition.label ?? definition.type.content.toUpperCase()}]`;
  return {
    generateUsage() {
      return {
        description: definition.description,
        hint: definition.hint,
        label: (`${label}...` +
          (definition.endDelimiter
            ? `["${definition.endDelimiter}"]`
            : "")) as Uppercase<string>,
      };
    },
    createParser(readerPositionals: ReaderPositionals) {
      const positionals = new Array<string>();
      while (true) {
        const positional = readerPositionals.consumePositional();
        if (
          positional === undefined ||
          positional === definition.endDelimiter
        ) {
          break;
        }
        positionals.push(positional);
      }
      return {
        parseValue() {
          return positionals.map((positional) => {
            return decodeValue(label, definition.type, positional);
          });
        },
      };
    },
  };
}

function decodeValue<Value>(
  label: string,
  type: Type<Value>,
  value: string,
): Value {
  return TypoError.tryWithContext(
    () => type.decoder(value),
    () =>
      new TypoText(
        new TypoString(label, typoStyleUserInput),
        new TypoString(`: `),
        new TypoString(type.content, typoStyleLogic),
      ),
  );
}

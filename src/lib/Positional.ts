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
 * @typeParam Value - Decoded value type.
 */
export type Positional<Value> = {
  /**
   * Returns metadata used to render the `Positionals:` section of help.
   */
  generateUsage(): PositionalUsage;
  /**
   * Consumes the next positional token from `readerPositionals`.
   * Returns a decoder that produces the final value.
   */
  consumeAndMakeDecoder(
    readerPositionals: ReaderPositionals,
  ): PositionalDecoder<Value>;
};

/**
 * Produced by {@link Positional.consumeAndMakeDecoder}.
 *
 * @typeParam Value - Decoded value type.
 */
export type PositionalDecoder<Value> = {
  /**
   * Returns the decoded positional value.
   *
   * @throws {@link TypoError} if decoding failed.
   */
  decodeValue(): Value;
};

/**
 * Human-readable metadata for a single positional argument, used to render the
 * `Positionals:` section of the help output produced by {@link usageToStyledLines}.
 */
export type PositionalUsage = {
  /**
   * Help text.
   */
  description: string | undefined;
  /**
   * Short note shown in parentheses.
   */
  hint: string | undefined;
  /**
   * Placeholder label shown in the usage line and the `Positionals:` section.
   * Required: `<NAME>`, optional: `[NAME]`, variadic: `[NAME]...`.
   */
  label: Uppercase<string>;
};

/**
 * Creates a required positional — missing token throws {@link TypoError}.
 * Label defaults to uppercased `type.content` in angle brackets (e.g. `<STRING>`).
 *
 * @typeParam Value - Type produced by the decoder.
 *
 * @param definition.description - Help text.
 * @param definition.hint - Short note shown in parentheses.
 * @param definition.label - Label without brackets; defaults to uppercased `type.content`.
 * @param definition.type - Decoder for the raw token.
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
    consumeAndMakeDecoder(readerPositionals: ReaderPositionals) {
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
        decodeValue() {
          return decodeValue(label, definition.type, positional);
        },
      };
    },
  };
}

/**
 * Creates an optional positional — absent token falls back to `default()`.
 * Label defaults to uppercased `type.content` in square brackets (e.g. `[STRING]`).
 *
 * @typeParam Value - Type produced by the decoder (or the default).
 *
 * @param definition.description - Help text.
 * @param definition.hint - Short note shown in parentheses.
 * @param definition.label - Label without brackets; defaults to uppercased `type.content`.
 * @param definition.type - Decoder for the raw token.
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
    consumeAndMakeDecoder(readerPositionals: ReaderPositionals) {
      const positional = readerPositionals.consumePositional();
      return {
        decodeValue() {
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
 * Creates a variadic positional that collects zero or more remaining tokens into an array.
 * Stops at `endDelimiter` (consumed, not included). Label: `[TYPE]...` notation.
 *
 * @typeParam Value - Type produced by the decoder for each token.
 *
 * @param definition.endDelimiter - Sentinel token that stops collection (consumed, not included).
 * @param definition.description - Help text.
 * @param definition.hint - Short note shown in parentheses.
 * @param definition.label - Label without brackets; defaults to uppercased `type.content`.
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
            ? ` ["${definition.endDelimiter}"]`
            : "")) as Uppercase<string>,
      };
    },
    consumeAndMakeDecoder(readerPositionals: ReaderPositionals) {
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
        decodeValue() {
          return positionals.map((positional) =>
            decodeValue(label, definition.type, positional),
          );
        },
      };
    },
  };
}

function decodeValue<Value>(
  label: string,
  type: Type<Value>,
  input: string,
): Value {
  return TypoError.tryWithContext(
    () => type.decoder(input),
    () =>
      new TypoText(
        new TypoString(label, typoStyleUserInput),
        new TypoString(`: `),
        new TypoString(type.content, typoStyleLogic),
      ),
  );
}

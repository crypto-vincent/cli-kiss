import { ReaderPositionals } from "./Reader";
import { Type } from "./Type";
import { TypoError, TypoString, typoStyleUserInput, TypoText } from "./Typo";
import { UsagePositional } from "./Usage";
// TODO - One of positionals ? is that even possible ?

/**
 * A positional argument. Created with {@link positionalRequired}, {@link positionalOptional},
 * or {@link positionalVariadics}.
 *
 * @typeParam Value - Decoded value type.
 */
export type Positional<Value> = {
  /**
   * Returns metadata for the `Positionals:` section.
   */
  generateUsage(): UsagePositional;
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
 * Creates a required positional — missing token throws {@link TypoError}.
 *
 * @typeParam Value - Type produced by the decoder.
 *
 * @param definition.description - Help text.
 * @param definition.hint - Short note shown in parentheses.
 * @param definition.type - Decoder for the raw token.
 * @returns A {@link Positional}`<Value>`.
 *
 * @example
 * ```ts
 * const namePositional = positionalRequired({
 *   type: typeString,
 *   description: "The name to greet",
 * });
 * // Usage:
 * //   my-cli Alice  →  "Alice"
 * ```
 */
export function positionalRequired<Value>(definition: {
  description?: string;
  hint?: string;
  type: Type<Value>;
}): Positional<Value> {
  const { description, hint, type } = definition;
  const label = `<${type.content}>`;
  return {
    generateUsage() {
      return { description, hint, label };
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
 *
 * @typeParam Value - Type produced by the decoder (or the default).
 *
 * @param definition.description - Help text.
 * @param definition.hint - Short note shown in parentheses.
 * @param definition.label - Label without brackets.
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
 * // Usage:
 * //   my-cli  →  "world"
 * //   my-cli Alice  →  "Alice"
 * ```
 */
export function positionalOptional<Value>(definition: {
  description?: string;
  hint?: string;
  type: Type<Value>;
  default: () => Value;
}): Positional<Value> {
  const { description, hint, type } = definition;
  const label = `[${type.content}]`;
  return {
    generateUsage() {
      return { description, hint, label };
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
 * Optionally stops at `endDelimiter` (consumed, not included).
 *
 * @typeParam Value - Type produced by the decoder for each token.
 *
 * @param definition.endDelimiter - Sentinel token that stops collection (consumed, not included).
 * @param definition.description - Help text.
 * @param definition.hint - Short note shown in parentheses.
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
 * // Usage:
 * //   my-cli  →  []
 * //   my-cli a.ts b.ts c.ts  →  ["a.ts", "b.ts", "c.ts"]
 * ```
 */
export function positionalVariadics<Value>(definition: {
  endDelimiter?: string;
  description?: string;
  hint?: string;
  type: Type<Value>;
}): Positional<Array<Value>> {
  const { description, hint, type } = definition;
  const labelSingle = `[${type.content}]`;
  const labelMultiple =
    `${labelSingle}...` +
    (definition.endDelimiter ? ` ["${definition.endDelimiter}"]` : "");
  return {
    generateUsage() {
      return { description, hint, label: labelMultiple };
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
            decodeValue(labelSingle, definition.type, positional),
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
    () => new TypoText(new TypoString(label, typoStyleUserInput)),
  );
}

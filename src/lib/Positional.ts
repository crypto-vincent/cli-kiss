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
 * Describes a single positional argument — a bare (non-option) token on the command
 * line — together with its parsing and usage-generation logic.
 *
 * Positionals are created with {@link positionalRequired}, {@link positionalOptional}, or
 * {@link positionalVariadics} and are passed via the `positionals` array of
 * {@link operation}, where they are consumed in declaration order.
 *
 * @typeParam Value - The TypeScript type of the parsed positional value.
 */
export type Positional<Value> = {
  /** Returns human-readable metadata used to render the `Positionals:` section of help. */
  generateUsage(): PositionalUsage;
  /**
   * Consumes the positional from `readerPositionals` and then returns a parser that produces the final decoded value.
   *
   * The parser is created during {@link Operation.createFactory} and may throw a
   * {@link TypoError} if the positional is missing (when required) or if decoding fails.
   * @param readerPositionals - The source of positional arguments to be consumed.
   */
  createParser(readerPositionals: ReaderPositionals): PositionalParser<Value>;
};

/**
 * Retrieves the parsed value for a positional argument after parsing is complete.
 *
 * Returned by {@link Positional.createParser} and called by {@link OperationFactory.createInstance}.
 *
 * @typeParam Value - The TypeScript type of the parsed value.
 */
export type PositionalParser<Value> = {
  /**
   * Returns the fully decoded and validated value for the positional
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
  /** Short description of what the positional represents. */
  description: string | undefined;
  /**
   * Optional supplementary note shown in parentheses next to the description.
   * Suitable for short caveats such as `"defaults to 'world'"`.
   */
  hint: string | undefined;
  /**
   * The placeholder label shown in the usage line and the `Positionals:` section.
   * Required positionals use angle-bracket notation (e.g. `"<NAME>"`); optional ones
   * use square-bracket notation (e.g. `"[FILE]"`); variadic ones append `...`
   * (e.g. `"[ITEM]..."`).
   */
  label: Uppercase<string>;
};

/**
 * Creates a required positional argument — one that must be present on the command line.
 *
 * The parser consumes the next available positional token and decodes it with
 * `definition.type`. If no token is available, a {@link TypoError} is thrown immediately
 * during parsing (i.e. inside {@link Operation.createFactory}).
 *
 * The label displayed in the usage line defaults to the uppercased `type.content`
 * wrapped in angle brackets (e.g. `<STRING>`). Supply `label` to override.
 *
 * @typeParam Value - The TypeScript type produced by the type decoder.
 *
 * @param definition - Configuration for the positional.
 * @param definition.description - Human-readable description for the help output.
 * @param definition.hint - Optional supplementary note shown in parentheses.
 * @param definition.label - Custom label shown in the usage line (without angle brackets).
 *   Defaults to the uppercased `type.content`.
 * @param definition.type - The {@link Type} used to decode the raw string token.
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
 * The parser consumes the next available positional token. If no token is available,
 * `definition.default()` is called to supply the fallback value. If the default factory
 * throws, a {@link TypoError} is produced.
 *
 * The label displayed in the usage line defaults to the uppercased `type.content`
 * wrapped in square brackets (e.g. `[STRING]`). Supply `label` to override.
 *
 * @typeParam Value - The TypeScript type produced by the type decoder (or the default).
 *
 * @param definition - Configuration for the positional.
 * @param definition.description - Human-readable description for the help output.
 * @param definition.hint - Optional supplementary note shown in parentheses.
 * @param definition.label - Custom label shown in the usage line (without square brackets).
 *   Defaults to the uppercased `type.content`.
 * @param definition.type - The {@link Type} used to decode the raw string token.
 * @param definition.default - Factory called when the positional is absent to supply the
 *   default value. Throw from this factory to make omission an error.
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
 * Creates a variadic positional argument — one that collects zero or more remaining
 * positional tokens into an array.
 *
 * The parser greedily consumes tokens until either there are no more tokens or it
 * encounters the optional `endDelimiter` sentinel string, which is consumed but not
 * included in the result. Each token is decoded independently with `definition.type`.
 *
 * If absent entirely, the result is an empty array `[]`.
 *
 * The label displayed in the usage line defaults to the uppercased `type.content`
 * wrapped in square brackets followed by `...` (e.g. `[STRING]...`). When an
 * `endDelimiter` is configured, the delimiter is also shown (e.g. `[STRING]...["--"]`).
 * Supply `label` to override the base label.
 *
 * @typeParam Value - The TypeScript type produced by the type decoder for each token.
 *
 * @param definition - Configuration for the variadic positional.
 * @param definition.endDelimiter - Optional sentinel string that signals the end of
 *   the variadic sequence (e.g. `"--"`). When encountered it is consumed but not
 *   included in the result array.
 * @param definition.description - Human-readable description for the help output.
 * @param definition.hint - Optional supplementary note shown in parentheses.
 * @param definition.label - Custom label shown in the usage line (without brackets).
 *   Defaults to the uppercased `type.content`.
 * @param definition.type - The {@link Type} used to decode each raw string token.
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

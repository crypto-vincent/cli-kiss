import { statSync } from "fs";
import {
  TypoError,
  TypoString,
  typoStyleLogic,
  typoStyleQuote,
  TypoText,
} from "./Typo";

/**
 * Decodes a raw CLI string into a typed value.
 * A pair of a human-readable `content` name and a `decoder` function.
 *
 * Built-in: {@link type}, {@link typeBoolean}, {@link typeNumber},
 * {@link typeInteger}, {@link typeDatetime}, {@link typeUrl}.
 * Composite: {@link typeChoice}, {@link typeConverted}, {@link typeTuple}, {@link typeList}.
 *
 * @typeParam Value - Type produced by the decoder.
 */
export type Type<Value> = {
  /**
   * Human-readable name shown in help and errors (e.g. `"name"`, `"number"`).
   */
  content: string;
  /**
   * Decodes a raw CLI string into `Value`.
   *
   * @param input - Raw string from the command line.
   * @returns The decoded value.
   * @throws {@link TypoError} on invalid input.
   */
  decoder(input: string): Value;
};

/**
 * Decodes a string to `boolean` (case-insensitive).
 * Used by {@link optionFlag} for `--flag=<value>`.
 *
 * @example
 * ```ts
 * typeBoolean("flag").decoder("true")  // → true
 * typeBoolean("flag").decoder("yes")   // → true
 * typeBoolean("flag").decoder("y")     // → true
 * typeBoolean("flag").decoder("false") // → false
 * typeBoolean("flag").decoder("no")    // → false
 * typeBoolean("flag").decoder("n")     // → false
 * ```
 */
export function typeBoolean(name?: string): Type<boolean> {
  return {
    content: name ?? "boolean",
    decoder(input: string) {
      const lower = input.toLowerCase();
      if (typeBooleanValuesTrue.has(lower)) {
        return true;
      }
      if (typeBooleanValuesFalse.has(lower)) {
        return false;
      }
      throw new TypoError(
        new TypoText(
          new TypoString(`Not a boolean: `),
          new TypoString(`"${input}"`, typoStyleQuote),
        ),
      );
    },
  };
}

export const typeBooleanValuesTrue = new Set(["true", "yes", "on", "y"]);
export const typeBooleanValuesFalse = new Set(["false", "no", "off", "n"]);

/**
 * Parses a date/time string via `Date.parse`.
 * Accepts any format supported by `Date.parse`, including ISO 8601.
 *
 * @example
 * ```ts
 * typeDatetime("my-datetime").decoder("2024-01-15") // → Date object for 2024-01-15
 * typeDatetime("my-datetime").decoder("2024-01-15T13:45:30Z") // → Date object for 2024-01-15 13:45:30 UTC
 * typeDatetime("my-datetime").decoder("not a date") // throws TypoError
 * ```
 */
export function typeDatetime(name?: string): Type<Date> {
  return {
    content: name ?? "datetime",
    decoder(input: string) {
      try {
        const timestampMs = Date.parse(input);
        if (isNaN(timestampMs)) {
          throw new Error();
        }
        return new Date(timestampMs);
      } catch {
        throw new TypoError(
          new TypoText(
            new TypoString(`Not a valid ISO_8601 datetime: `),
            new TypoString(`"${input}"`, typoStyleQuote),
          ),
        );
      }
    },
  };
}

/**
 * Parses a string to `number` via `Number()`; `NaN` throws {@link TypoError}.
 *
 * @example
 * ```ts
 * typeNumber("my-number").decoder("3.14")  // → 3.14
 * typeNumber("my-number").decoder("-1")    // → -1
 * typeNumber("my-number").decoder("hello") // throws TypoError
 * ```
 */
export function typeNumber(name?: string): Type<number> {
  return {
    content: name ?? "number",
    decoder(input: string) {
      try {
        const parsed = Number(input);
        if (isNaN(parsed)) {
          throw new Error();
        }
        return parsed;
      } catch {
        throw new TypoError(
          new TypoText(
            new TypoString(`Not a number: `),
            new TypoString(`"${input}"`, typoStyleQuote),
          ),
        );
      }
    },
  };
}

/**
 * Parses an integer string to `bigint` via `BigInt()`.
 * Floats and non-numeric strings throw {@link TypoError}.
 *
 * @example
 * ```ts
 * typeInteger("my-integer").decoder("42")   // → 42n
 * typeInteger("my-integer").decoder("3.14") // throws TypoError
 * typeInteger("my-integer").decoder("abc")  // throws TypoError
 * ```
 */
export function typeInteger(name?: string): Type<bigint> {
  return {
    content: name ?? "integer",
    decoder(input: string) {
      try {
        return BigInt(input);
      } catch {
        throw new TypoError(
          new TypoText(
            new TypoString(`Not an integer: `),
            new TypoString(`"${input}"`, typoStyleQuote),
          ),
        );
      }
    },
  };
}

/**
 * Parses an absolute URL string to a `URL` object.
 * Relative or malformed URLs throw {@link TypoError}.
 *
 * @example
 * ```ts
 * typeUrl("my-url").decoder("https://example.com") // → URL { href: "https://example.com/", ... }
 * typeUrl("my-url").decoder("not-a-url")           // throws TypoError
 * ```
 */
export function typeUrl(name?: string): Type<URL> {
  return {
    content: name ?? "url",
    decoder(input: string) {
      try {
        return new URL(input);
      } catch {
        throw new TypoError(
          new TypoText(
            new TypoString(`Not an URL: `),
            new TypoString(`"${input}"`, typoStyleQuote),
          ),
        );
      }
    },
  };
}

/**
 * A named type that accepts any string as input.
 * @param name - Name shown in help and errors (e.g. `"my-value"`).
 * @example
 * ```ts
 * type("greeting").decoder("hello") // → "hello"
 * type("greeting").decoder("")      // → ""
 * ```
 */
export function type(name?: string): Type<string> {
  return {
    content: name ?? "string",
    decoder: (input: string) => input,
  };
}

/**
 * Chains `before`'s decoder with an `after` transformation.
 * `before` errors are prefixed with `"from: <content>"` for traceability.
 *
 * @typeParam Before - Intermediate type from `before.decoder`.
 * @typeParam After - Final type from `after.decoder`.
 *
 * @param name - Name shown in help and errors (e.g. `"my-value"`).
 * @param before - Base type to decode the raw string.
 * @param mapper - Transforms `before`'s output to the final value; errors are wrapped with context.
 * @returns A {@link Type}`<After>`.
 *
 * @example
 * ```ts
 * const typePort = typeConverted("port", typeNumber(), (n) => {
 *   if (n < 1 || n > 65535) throw new Error("Out of range");
 *   return n;
 * });
 * // "--port 8080"   →  8080
 * // "--port 99999"  →  TypoError: --port: <PORT>: Port: Out of range
 * ```
 */
export function typeConverted<Before, After>(
  name: string,
  before: Type<Before>,
  mapper: (value: Before) => After,
): Type<After> {
  return {
    content: name,
    decoder: (input: string) => {
      return mapper(
        TypoError.tryWithContext(
          () => before.decoder(input),
          () =>
            new TypoText(
              new TypoString("from: "),
              new TypoString(before.content, typoStyleLogic),
            ),
        ),
      );
    },
  };
}

/**
 * Adds a name to a {@link Type} for clearer error messages and help text.
 *
 * @param name - Name to use for the type.
 * @param type - Base type to name.
 * @returns A {@link Type} with the given name.
 */
export function typeRenamed<Value>(
  type: Type<Value>,
  name: string,
): Type<Value> {
  return {
    content: name,
    decoder: (input: string) => {
      return TypoError.tryWithContext(
        () => type.decoder(input),
        () =>
          new TypoText(
            new TypoString("from: "),
            new TypoString(type.content, typoStyleLogic),
          ),
      );
    },
  };
}

/**
 * Creates a {@link Type} for filesystem paths with optional existence checks.
 * @param checks - Optional checks for path existence and type (file/directory).
 * @returns A {@link Type}`<string>` representing the path.
 */
export function typePath(
  name?: string,
  checks?: { checkSyncExistAs?: "file" | "directory" | "anything" },
): Type<string> {
  return {
    content: name ?? "path",
    decoder(input: string) {
      if (input.length === 0) {
        throw new Error(`Path cannot be empty`);
      }
      if (input.includes("\0")) {
        throw new Error(`Path cannot contain null characters`);
      }
      if (checks?.checkSyncExistAs !== undefined) {
        function safeStatSync(path: string) {
          try {
            return statSync(path);
          } catch (error) {
            throw new TypoError(
              new TypoText(
                new TypoString(`Path does not exist: `),
                new TypoString(`"${path}"`, typoStyleQuote),
              ),
              error,
            );
          }
        }
        const stats = safeStatSync(input);
        const preview = stats.isDirectory()
          ? "directory"
          : stats.isFile()
            ? "file"
            : "unknown";
        if (checks.checkSyncExistAs === "file" && !stats.isFile()) {
          throw new TypoError(
            new TypoText(
              new TypoString(`Expected a file but found: ${preview}: `),
              new TypoString(`"${input}"`, typoStyleQuote),
            ),
          );
        }
        if (checks.checkSyncExistAs === "directory" && !stats.isDirectory()) {
          throw new TypoError(
            new TypoText(
              new TypoString(`Expected a directory but found: ${preview}: `),
              new TypoString(`"${input}"`, typoStyleQuote),
            ),
          );
        }
      }
      return input;
    },
  };
}

/**
 * Creates a {@link Type}`<string>` that only accepts a fixed set of values.
 * Out-of-set inputs throw {@link TypoError} listing up to 5 valid options.
 *
 * @param name - Name shown in help and errors.
 * @param values - Ordered list of accepted values.
 * @returns A {@link Type}`<string>`.
 *
 * @example
 * ```ts
 * const typeEnv = typeChoice("environment", ["dev", "staging", "prod"]);
 * typeEnv.decoder("prod")    // → "prod"
 * typeEnv.decoder("unknown") // throws TypoError: Invalid value: "unknown" (expected one of: "dev" | "staging" | "prod")
 * ```
 */
export function typeChoice<const Value extends string>(
  name: string,
  values: Array<Value>,
  caseSensitive: boolean = false,
): Type<Value> {
  const normalize = caseSensitive
    ? (s: string) => s
    : (s: string) => s.toLowerCase();
  const valueMap = new Map(values.map((value) => [normalize(value), value]));
  return {
    content: name,
    decoder(input: string) {
      const normalized = normalize(input);
      const original = valueMap.get(normalized);
      if (original !== undefined) {
        return original;
      }
      const valuesPreview = [];
      for (const value of values) {
        if (valuesPreview.length >= 5) {
          valuesPreview.push(new TypoString(`...`));
          break;
        }
        if (valuesPreview.length > 0) {
          valuesPreview.push(new TypoString(` | `));
        }
        valuesPreview.push(new TypoString(`"${value}"`, typoStyleQuote));
      }
      throw new TypoError(
        new TypoText(
          new TypoString(`Invalid value: `),
          new TypoString(`"${input}"`, typoStyleQuote),
          new TypoString(` (expected one of: `),
          ...valuesPreview,
          new TypoString(`)`),
        ),
      );
    },
  };
}

/**
 * Splits a delimited string into a typed tuple.
 * Each part is decoded by the corresponding element type; wrong count or decode failure throws {@link TypoError}.
 *
 * @typeParam Elements - Tuple of decoded value types (inferred from `elementTypes`).
 *
 * @param elementTypes - One {@link Type} per tuple element, in order.
 * @param separator - Delimiter (default `","`).
 * @returns A {@link Type}`<Elements>`.
 *
 * @example
 * ```ts
 * const typePoint = typeTuple([typeNumber("x"), typeNumber("y")]);
 * typePoint.decoder("3.14,2.71") // → [3.14, 2.71]
 * typePoint.decoder("1,2,3")     // → [1, 2]
 * typePoint.decoder("x,2")       // throws TypoError: at 0: Number: Unable to parse: "x"
 * ```
 */
export function typeTuple<const Elements extends Array<any>>(
  elementTypes: { [K in keyof Elements]: Type<Elements[K]> },
  separator: string = ",",
): Type<Elements> {
  return {
    content: elementTypes
      .map((elementType) => elementType.content)
      .join(separator),
    decoder(input: string) {
      const splits = input.split(separator, elementTypes.length);
      if (splits.length !== elementTypes.length) {
        throw new TypoError(
          new TypoText(
            new TypoString(`Found ${splits.length} splits: `),
            new TypoString(`Expected ${elementTypes.length} splits from: `),
            new TypoString(`"${input}"`, typoStyleQuote),
          ),
        );
      }
      return splits.map((split, index) => {
        const elementType = elementTypes[index]!;
        return TypoError.tryWithContext(
          () => elementType.decoder(split),
          () =>
            new TypoText(
              new TypoString(`at ${index}: `),
              new TypoString(elementType.content, typoStyleLogic),
            ),
        );
      }) as Elements;
    },
  };
}

/**
 * Splits a delimited string into a typed array.
 * Each part is decoded by `elementType`; failed decodes throw {@link TypoError}.
 * Note: splitting an empty string yields one empty element — prefer {@link optionRepeatable} for a zero-default.
 *
 * @typeParam Value - Element type produced by `elementType.decoder`.
 *
 * @param elementType - Decoder applied to each element.
 * @param separator - Delimiter (default `","`).
 * @returns A {@link Type}`<Array<Value>>`.
 *
 * @example
 * ```ts
 * const typeNumbers = typeList(typeNumber);
 * typeNumbers.decoder("1,2,3")  // → [1, 2, 3]
 * typeNumbers.decoder("1,x,3")  // throws TypoError: at 1: Number: Unable to parse: "x"
 *
 * const typePaths = typeList(typePath(), ":");
 * typePaths.decoder("/usr/bin:/usr/local/bin") // → ["/usr/bin", "/usr/local/bin"]
 * ```
 */
export function typeList<Value>(
  elementType: Type<Value>,
  separator: string = ",",
): Type<Array<Value>> {
  return {
    content: `${elementType.content}[${separator}${elementType.content}]...`,
    decoder(input: string) {
      const splits = input.split(separator);
      return splits.map((split, index) =>
        TypoError.tryWithContext(
          () => elementType.decoder(split),
          () =>
            new TypoText(
              new TypoString(`at ${index}: `),
              new TypoString(elementType.content, typoStyleLogic),
            ),
        ),
      );
    },
  };
}

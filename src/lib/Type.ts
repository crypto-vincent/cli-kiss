import {
  TypoError,
  TypoString,
  typoStyleLogic,
  typoStyleQuote,
  TypoText,
} from "./Typo";

/**
 * Decodes a raw CLI string into a typed value.
 * A pair of a human-readable `content` name (e.g. `"Number"`) and a `decoder` function.
 *
 * Built-in: {@link typeString}, {@link typeBoolean}, {@link typeNumber},
 * {@link typeInteger}, {@link typeDate}, {@link typeUrl}.
 * Composite: {@link typeOneOf}, {@link typeMapped}, {@link typeTuple}, {@link typeList}.
 *
 * @typeParam Value - Type produced by the decoder.
 */
export type Type<Value> = {
  /**
   * Human-readable name shown in help and error messages (e.g. `"String"`, `"Number"`).
   */
  content: string;
  /**
   * Converts a raw CLI string into `Value`.
   *
   * @param input - Raw string from the command line.
   * @returns The decoded value.
   * @throws {@link TypoError} on invalid input.
   */
  decoder(input: string): Value;
};

/**
 * Decodes a string into a `boolean` on a best effort basis (case-insensitive).
 * Used internally by {@link optionFlag} for the `--flag=<value>` syntax.
 *
 * @example
 * ```ts
 * typeBoolean.decoder("true")  // → true
 * typeBoolean.decoder("yes")   // → true
 * typeBoolean.decoder("y")     // → true
 * typeBoolean.decoder("false") // → false
 * typeBoolean.decoder("no")    // → false
 * typeBoolean.decoder("n")     // → false
 * ```
 */
export const typeBoolean: Type<boolean> = {
  content: "Boolean",
  decoder(input: string) {
    const lower = input.toLowerCase();
    if (booleanValuesTrue.has(lower)) {
      return true;
    }
    if (booleanValuesFalse.has(lower)) {
      return false;
    }
    throw new TypoError(
      new TypoText(
        new TypoString(`Invalid value: `),
        new TypoString(`"${input}"`, typoStyleQuote),
      ),
    );
  },
};
const booleanValuesTrue = new Set(["true", "yes", "on", "1", "y", "t"]);
const booleanValuesFalse = new Set(["false", "no", "off", "0", "n", "f"]);

/**
 * Parses a date/time string via `Date.parse` into a `Date` object.
 * Accepts any format supported by `Date.parse`, including ISO 8601.
 *
 * @example
 * ```ts
 * typeDate.decoder("2024-01-15") // → Date object for 2024-01-15
 * typeDate.decoder("2024-01-15T13:45:30Z") // → Date object for 2024-01-15 13:45:30 UTC
 * typeDate.decoder("not a date") // throws TypoError
 * ```
 */
export const typeDate: Type<Date> = {
  content: "Date",
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
          new TypoString(`Not a valid ISO_8601: `),
          new TypoString(`"${input}"`, typoStyleQuote),
        ),
      );
    }
  },
};

/**
 * Parses a string into a `number` via `Number()`.
 * Accepts integers, floats, and scientific notation; `NaN` throws a {@link TypoError}.
 *
 * @example
 * ```ts
 * typeNumber.decoder("3.14")  // → 3.14
 * typeNumber.decoder("-1")    // → -1
 * typeNumber.decoder("hello") // throws TypoError
 * ```
 */
export const typeNumber: Type<number> = {
  content: "Number",
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
          new TypoString(`Unable to parse: `),
          new TypoString(`"${input}"`, typoStyleQuote),
        ),
      );
    }
  },
};

/**
 * Parses an integer string into a `bigint` via `BigInt()`.
 * Floats and non-numeric strings throw a {@link TypoError}.
 *
 * @example
 * ```ts
 * typeInteger.decoder("42")   // → 42n
 * typeInteger.decoder("3.14") // throws TypoError
 * typeInteger.decoder("abc")  // throws TypoError
 * ```
 */
export const typeInteger: Type<bigint> = {
  content: "Integer",
  decoder(input: string) {
    try {
      return BigInt(input);
    } catch {
      throw new TypoError(
        new TypoText(
          new TypoString(`Unable to parse: `),
          new TypoString(`"${input}"`, typoStyleQuote),
        ),
      );
    }
  },
};

/**
 * Parses an absolute URL string into a `URL` object.
 * Relative or malformed URLs throw a {@link TypoError}.
 *
 * @example
 * ```ts
 * typeUrl.decoder("https://example.com") // → URL { href: "https://example.com/", ... }
 * typeUrl.decoder("not-a-url")           // throws TypoError
 * ```
 */
export const typeUrl: Type<URL> = {
  content: "Url",
  decoder(input: string) {
    try {
      return new URL(input);
    } catch {
      throw new TypoError(
        new TypoText(
          new TypoString(`Unable to parse: `),
          new TypoString(`"${input}"`, typoStyleQuote),
        ),
      );
    }
  },
};

/**
 * Identity decoder — passes the raw string through unchanged.
 *
 * @example
 * ```ts
 * typeString.decoder("hello") // → "hello"
 * typeString.decoder("")      // → ""
 * ```
 */
export const typeString: Type<string> = {
  content: "String",
  decoder(input: string) {
    return input;
  },
};

/**
 * Creates a {@link Type} by chaining `before`'s decoder with an `after` transformation.
 * `before` errors are prefixed with `"from: <content>"` for traceability.
 *
 * @typeParam Before - Intermediate type from `before.decoder`.
 * @typeParam After - Final type from `after.decoder`.
 *
 * @param before - Base decoder for the raw string.
 * @param after - Transformation applied to the decoded value.
 * @param after.content - Name for the resulting type (shown in errors).
 * @param after.decoder - Converts a `Before` value to `After`.
 * @returns A {@link Type}`<After>`.
 *
 * @example
 * ```ts
 * const typePort = typeMapped(typeNumber, {
 *   content: "Port",
 *   decoder: (n) => {
 *     if (n < 1 || n > 65535) throw new Error("Out of range");
 *     return n;
 *   },
 * });
 * // "--port 8080"   →  8080
 * // "--port 99999"  →  TypoError: --port: <PORT>: Port: Out of range
 * ```
 */
export function typeMapped<Before, After>(
  before: Type<Before>,
  after: { content: string; decoder: (value: Before) => After },
): Type<After> {
  return {
    content: after.content,
    decoder: (input: string) => {
      return after.decoder(
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
 * Creates a {@link Type}`<string>` accepting only a fixed set of string values.
 * Out-of-set inputs throw a {@link TypoError} listing up to 5 valid options.
 *
 * @param content - Name shown in help and errors (e.g. `"Environment"`).
 * @param values - Ordered list of accepted values.
 * @returns A {@link Type}`<string>`.
 *
 * @example
 * ```ts
 * const typeEnv = typeOneOf("Environment", ["dev", "staging", "prod"]);
 * typeEnv.decoder("prod")    // → "prod"
 * typeEnv.decoder("unknown") // throws TypoError: Invalid value: "unknown" (expected one of: "dev" | "staging" | "prod")
 * ```
 */
export function typeOneOf<const Value extends string>(
  content: string,
  values: Array<Value>,
): Type<Value> {
  return {
    content: content,
    decoder(input: string) {
      for (const value of values) {
        if (input === value) {
          return value;
        }
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
 * Splits a delimited string into a fixed-length typed tuple.
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
 * const typePoint = typeTuple([typeNumber, typeNumber]);
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
 * Splits a delimited string into a variable-length typed array.
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
 * const typePaths = typeList(typeString, ":");
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

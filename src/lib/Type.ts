import {
  TypoError,
  TypoString,
  typoStyleLogic,
  typoStyleQuote,
  TypoText,
} from "./Typo";

/**
 * Describes how to decode a raw CLI string token into a typed TypeScript value.
 *
 * A `Type` is a pair of:
 * - a `content` string — a human-readable name shown in help/error messages (e.g.
 *   `"String"`, `"Number"`, `"Url"`).
 * - a `decoder` function — converts the raw string or throws a {@link TypoError} on
 *   invalid input.
 *
 * Built-in types: {@link typeString}, {@link typeBoolean}, {@link typeNumber},
 * {@link typeInteger}, {@link typeDate}, {@link typeUrl}.
 *
 * Composite types: {@link typeOneOf}, {@link typeConverted}, {@link typeTuple},
 * {@link typeList}.
 *
 * @typeParam Value - The TypeScript type that the decoder produces.
 */
export type Type<Value> = {
  /**
   * Human-readable name for this type, used in help text and error messages.
   * Examples: `"String"`, `"Number"`, `"Url"`.
   */
  content: string;
  /**
   * Decodes a raw string token into a `Value`.
   *
   * @param value - The raw string from the command line.
   * @returns The decoded value.
   * @throws {@link TypoError} if the value cannot be decoded.
   */
  decoder(value: string): Value;
};

/**
 * A {@link Type} that decodes `"true"` / `"yes"` to `true` and `"false"` / `"no"` to
 * `false` (case-insensitive). Any other value throws a {@link TypoError}.
 *
 * Primarily used internally by {@link optionFlag} for the `--flag=<value>` syntax, but
 * can also be used in positionals or valued options.
 *
 * @example
 * ```ts
 * typeBoolean.decoder("yes")   // → true
 * typeBoolean.decoder("false") // → false
 * typeBoolean.decoder("1")     // throws TypoError
 * ```
 */
export const typeBoolean: Type<boolean> = {
  content: "Boolean",
  decoder(value: string) {
    const lowerValue = value.toLowerCase();
    if (lowerValue === "true" || lowerValue === "yes") {
      return true;
    }
    if (lowerValue === "false" || lowerValue === "no") {
      return false;
    }
    throw new TypoError(
      new TypoText(
        new TypoString(`Invalid value: `),
        new TypoString(`"${value}"`, typoStyleQuote),
      ),
    );
  },
};

/**
 * A {@link Type} that parses a date/time string using `Date.parse`.
 *
 * Accepts any format supported by the JavaScript `Date.parse` API, including ISO 8601
 * strings (e.g. `"2024-01-15"`, `"2024-01-15T10:30:00Z"`). Non-parseable values throw
 * a {@link TypoError}.
 *
 * Produces a `Date` object. The decoded value is the result of `new Date(Date.parse(value))`.
 *
 * @example
 * ```ts
 * typeDate.decoder("2024-01-15") // → Date object for 2024-01-15
 * typeDate.decoder("not a date") // throws TypoError
 * ```
 */
export const typeDate: Type<Date> = {
  content: "Date",
  decoder(value: string) {
    try {
      const timestampMs = Date.parse(value);
      if (isNaN(timestampMs)) {
        throw new Error();
      }
      return new Date(timestampMs);
    } catch {
      throw new TypoError(
        new TypoText(
          new TypoString(`Not a valid ISO_8601: `),
          new TypoString(`"${value}"`, typoStyleQuote),
        ),
      );
    }
  },
};

/**
 * A {@link Type} that parses a string into a JavaScript `number` using the `Number()`
 * constructor.
 *
 * Accepts integers, floating-point values, and scientific notation (e.g. `"3.14"`,
 * `"-1"`, `"1e10"`). Values that produce `NaN` throw a {@link TypoError}.
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
  decoder(value: string) {
    try {
      const parsed = Number(value);
      if (isNaN(parsed)) {
        throw new Error();
      }
      return parsed;
    } catch {
      throw new TypoError(
        new TypoText(
          new TypoString(`Unable to parse: `),
          new TypoString(`"${value}"`, typoStyleQuote),
        ),
      );
    }
  },
};

/**
 * A {@link Type} that parses a string into a JavaScript `bigint` using the `BigInt()`
 * constructor.
 *
 * Only accepts valid integer strings (e.g. `"42"`, `"-100"`, `"9007199254740993"`).
 * Floating-point strings or non-numeric values throw a {@link TypoError}.
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
  decoder(value: string) {
    try {
      return BigInt(value);
    } catch {
      throw new TypoError(
        new TypoText(
          new TypoString(`Unable to parse: `),
          new TypoString(`"${value}"`, typoStyleQuote),
        ),
      );
    }
  },
};

/**
 * A {@link Type} that parses a string into a `URL` object using the `URL` constructor.
 *
 * The string must be a valid absolute URL (e.g. `"https://example.com/path?q=1"`).
 * Relative URLs and malformed strings throw a {@link TypoError}.
 *
 * @example
 * ```ts
 * typeUrl.decoder("https://example.com") // → URL { href: "https://example.com/", ... }
 * typeUrl.decoder("not-a-url")           // throws TypoError
 * ```
 */
export const typeUrl: Type<URL> = {
  content: "Url",
  decoder(value: string) {
    try {
      return new URL(value);
    } catch {
      throw new TypoError(
        new TypoText(
          new TypoString(`Unable to parse: `),
          new TypoString(`"${value}"`, typoStyleQuote),
        ),
      );
    }
  },
};

/**
 * A {@link Type} that passes the raw string through unchanged (identity decoder).
 *
 * This is the simplest type and accepts any string value without validation.
 *
 * @example
 * ```ts
 * typeString.decoder("hello") // → "hello"
 * typeString.decoder("")      // → ""
 * ```
 */
export const typeString: Type<string> = {
  content: "String",
  decoder(value: string) {
    return value;
  },
};

/**
 * Creates a new {@link Type} by chaining a `before` type decoder with an `after`
 * transformation.
 *
 * The raw string is first decoded by `before.decoder`; its result is then passed to
 * `after.decoder`. Errors from `before` are wrapped with a "from: <content>" context
 * prefix so that the full decoding path is visible in error messages.
 *
 * Use this when an existing type (e.g. {@link typeString}, {@link typeOneOf}) produces
 * an intermediate value that needs a further transformation (e.g. parsing a
 * string-keyed enum into a number).
 *
 * @typeParam Before - The intermediate type produced by `before.decoder`.
 * @typeParam After - The final type produced by `after.decoder`.
 *
 * @param before - The base type that decodes the raw CLI string.
 * @param after - The transformation applied to the `Before` value.
 * @param after.content - Human-readable name for the resulting type (shown in errors).
 * @param after.decoder - Function that converts a `Before` value into `After`.
 * @returns A new {@link Type}`<After>` whose `content` is `after.content`.
 *
 * @example
 * ```ts
 * const typePort = typeConverted(typeNumber, {
 *   content: "Port",
 *   decoder: (n) => {
 *     if (n < 1 || n > 65535) throw new Error("Out of range");
 *     return n;
 *   },
 * });
 * // "--port 8080"   →  8080
 * // "--port 99999"  →  TypoError: <PORT>: Port: from: Number: Out of range
 * ```
 */
export function typeConverted<Before, After>(
  before: Type<Before>,
  after: { content: string; decoder: (value: Before) => After },
): Type<After> {
  return {
    content: after.content,
    decoder: (value: string) => {
      return after.decoder(
        TypoError.tryWithContext(
          () => before.decoder(value),
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
 * Creates a {@link Type}`<string>` that only accepts a fixed set of string values.
 *
 * The decoder performs an exact (case-sensitive) lookup in `values`. If the input is
 * not in the set, a {@link TypoError} is thrown listing up to 5 of the valid options.
 *
 * Combine with {@link typeConverted} to map the accepted strings to a richer type.
 *
 * @param content - Human-readable name for this type shown in help text and error
 *   messages (e.g. `"Environment"`, `"LogLevel"`).
 * @param values - The ordered list of accepted string values. The order is preserved in
 *   the error message preview.
 * @returns A {@link Type}`<string>` that validates membership in `values`.
 *
 * @example
 * ```ts
 * const typeEnv = typeOneOf("Environment", ["dev", "staging", "prod"]);
 * typeEnv.decoder("prod")    // → "prod"
 * typeEnv.decoder("unknown") // throws TypoError: Invalid value: "unknown" (expected one of: "dev" | "staging" | "prod")
 * ```
 */
export function typeOneOf(
  content: string,
  values: Array<string>,
): Type<string> {
  const valuesSet = new Set(values);
  return {
    content: content,
    decoder(value: string) {
      if (valuesSet.has(value)) {
        return value;
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
          new TypoString(`"${value}"`, typoStyleQuote),
          new TypoString(` (expected one of: `),
          ...valuesPreview,
          new TypoString(`)`),
        ),
      );
    },
  };
}

/**
 * Creates a {@link Type} that decodes a single delimited string into a fixed-length
 * tuple of typed elements.
 *
 * The raw string is split on `separator` into exactly `elementTypes.length` parts.
 * Each part is decoded by its corresponding element type. If the number of splits does
 * not match, or if any element's decoder fails, a {@link TypoError} is thrown with the
 * index and element type context.
 *
 * The resulting `content` is the element types' `content` values joined by `separator`
 * (e.g. `"Number,String"` for a `[number, string]` tuple with `","` separator).
 *
 * @typeParam Elements - The tuple type of decoded element values (inferred from
 *   `elementTypes`).
 *
 * @param elementTypes - An ordered array of {@link Type}s, one per tuple element.
 * @param separator - The string used to split the raw value (default: `","`).
 * @returns A {@link Type}`<Elements>` tuple type.
 *
 * @example
 * ```ts
 * const typePoint = typeTuple([typeNumber, typeNumber]);
 * typePoint.decoder("3.14,2.71") // → [3.14, 2.71]
 * typePoint.decoder("1,2,3")     // throws TypoError: Found 3 splits: Expected 2 splits
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
    decoder(value: string) {
      const splits = value.split(separator, elementTypes.length);
      if (splits.length !== elementTypes.length) {
        throw new TypoError(
          new TypoText(
            new TypoString(`Found ${splits.length} splits: `),
            new TypoString(`Expected ${elementTypes.length} splits from: `),
            new TypoString(`"${value}"`, typoStyleQuote),
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
 * Creates a {@link Type} that decodes a single delimited string into an array of
 * homogeneous typed elements.
 *
 * The raw string is split on `separator` and each part is decoded by `elementType`.
 * If any element's decoder fails, a {@link TypoError} is thrown with the index and
 * element type context.
 *
 * Unlike {@link typeTuple}, the number of elements is not fixed; the result array
 * length equals the number of `separator`-delimited parts in the input string. To pass
 * an empty array, the user must pass an empty string (`""`), which splits into one
 * empty-string element — consider using {@link optionRepeatable} instead if you want a
 * naturally empty default.
 *
 * The `content` is formatted as `"<elementContent>[<sep><elementContent>]..."` to
 * signal repeatability.
 *
 * @typeParam Value - The TypeScript element type produced by `elementType.decoder`.
 *
 * @param elementType - The {@link Type} used to decode each element.
 * @param separator - The string used to split the raw value (default: `","`).
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
    decoder(value: string) {
      const splits = value.split(separator);
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

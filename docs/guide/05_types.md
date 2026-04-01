# Types

A `Type<Value>` converts a raw CLI string into a typed value:

- Contains a `content` label about the type of data being decoded
- Paired with a `decoder` function that throws if the value is invalid.

## Built-in types

| Export        | TypeScript type | Accepts                                                                     |
| ------------- | --------------- | --------------------------------------------------------------------------- |
| `typeString`  | `string`        | Any string                                                                  |
| `typeBoolean` | `boolean`       | `true/yes/on/1/y/t` → true, `false/no/off/0/n/f` → false (case-insensitive) |
| `typeNumber`  | `number`        | Integers, floats, scientific notation                                       |
| `typeInteger` | `bigint`        | Integer strings only                                                        |
| `typeDate`    | `Date`          | Any format accepted by `Date.parse` (ISO 8601 recommended)                  |
| `typeUrl`     | `URL`           | Absolute URLs                                                               |

```ts
typeString.decoder("hello"); // → "hello"
typeBoolean.decoder("yes"); // → true
typeNumber.decoder("3.14"); // → 3.14
typeInteger.decoder("9007199254740993"); // → 9007199254740993n
typeDate.decoder("2024-01-15"); // → Date object
typeUrl.decoder("https://example.com/path"); // → URL object
```

## `typeOneOf` — string enum

Accepts only a fixed set of strings:

```ts
const typeEnv = typeOneOf("environment", ["dev", "staging", "prod"]);
typeEnv.decoder("prod"); // → "prod"
typeEnv.decoder("unknown");
// Error: Invalid value: "unknown" (expected one of: "dev" | "staging" | "prod")
```

## `typeMapped` — transform an existing type

Chain a `before` type with an `after` transformation:

```ts
const typePort = typeMapped(typeNumber, {
  content: "port",
  decoder(n) {
    if (n < 1 || n > 65535) {
      throw new Error("Out of range");
    }
    return n;
  },
});
// "--port 8080"   →  8080
// "--port 99999"  →  Error: --port: <PORT>: Port: Out of range
```

Errors from the `before` decoder are prefixed with `from: <content>`.

## `typeTuple` — fixed-length delimited value

Splits a string into a fixed-length typed tuple:

```ts
const typePoint = typeTuple([typeNumber, typeNumber]);

typePoint.decoder("3.14,2.71"); // → [3.14, 2.71]
typePoint.decoder("x,2"); // → Error: at 0: Number: Unable to parse: "x"
```

The default separator is `","`. Pass a second argument to change it:

```ts
typeTuple([typeString, typeNumber], ":");
// "foo:42"  →  ["foo", 42]
```

## `typeList` — variable-length delimited value

Splits a string into an array of typed values:

```ts
const typeNumbers = typeList(typeNumber);
typeNumbers.decoder("1,2,3"); // → [1, 2, 3]
typeNumbers.decoder("1,x,3"); // → Error: at 1: Number: Unable to parse: "x"
```

Custom separator:

```ts
const typePaths = typeList(typeString, ":");
typePaths.decoder("/usr/bin:/usr/local/bin"); // → ["/usr/bin", "/usr/local/bin"]
```

::: tip Prefer
[`optionRepeatable`](/guide/03_options#optionrepeatable-collect-multiple-values)
over `typeList` when users should pass multiple values as separate flags
(`--file a --file b` rather than `--files a,b`).

:::

## Custom types

Implement the `Type<Value>` interface directly:

```ts
import type { Type } from "cli-kiss";
const typeHexColor: Type<string> = {
  content: "hex-color",
  decoder(value) {
    if (/^#[0-9a-fA-F]{6}$/.test(value)) {
      return value;
    }
    throw new Error(`Not a valid value: "${value}"`);
  },
};
// "#ff0000"  →  "#ff0000"
// "red"  →  Error: HexColor: Not a valid value: "red"
```

# Types

A `Type<Value>` is a pair of a human-readable `content` string and a `decoder` function. It tells cli-kiss how to convert a raw CLI string into a typed value.

## Built-in types

| Export | TypeScript type | Accepts |
|---|---|---|
| `typeString` | `string` | Any string |
| `typeBoolean` | `boolean` | `true`, `yes`, `false`, `no` (case-insensitive) |
| `typeNumber` | `number` | Integers, floats, scientific notation |
| `typeInteger` | `bigint` | Integer strings only |
| `typeDate` | `Date` | Any format accepted by `Date.parse` (ISO 8601 recommended) |
| `typeUrl` | `URL` | Absolute URLs |

```ts
import {
  typeBoolean,
  typeDate,
  typeInteger,
  typeNumber,
  typeString,
  typeUrl,
} from "cli-kiss";

typeString.decoder("hello")                  // → "hello"
typeBoolean.decoder("yes")                   // → true
typeNumber.decoder("3.14")                   // → 3.14
typeInteger.decoder("9007199254740993")       // → 9007199254740993n
typeDate.decoder("2024-01-15")               // → Date object
typeUrl.decoder("https://example.com/path")  // → URL object
```

---

## `typeOneOf` — string enum

Accept only a fixed set of strings:

```ts
import { typeOneOf } from "cli-kiss";

const typeEnv = typeOneOf("Environment", ["dev", "staging", "prod"]);

typeEnv.decoder("prod")    // → "prod"
typeEnv.decoder("unknown")
// Error: Invalid value: "unknown" (expected one of: "dev" | "staging" | "prod")
```

Combine with `typeConverted` to map the string to a richer type:

```ts
import { typeConverted, typeOneOf } from "cli-kiss";

const typeLogLevel = typeConverted(
  typeOneOf("LogLevel", ["debug", "info", "warn", "error"]),
  {
    content: "LogLevel",
    decoder: (s) => s as "debug" | "info" | "warn" | "error",
  },
);
```

---

## `typeConverted` — transform an existing type

Chain a `before` type with an `after` transformation:

```ts
import { typeConverted, typeNumber } from "cli-kiss";

const typePort = typeConverted(typeNumber, {
  content: "Port",
  decoder: (n) => {
    if (n < 1 || n > 65535) throw new Error("Out of range");
    return n;
  },
});
// "--port 8080"   →  8080
// "--port 99999"  →  Error: --port: <PORT>: Port: Out of range
```

Errors from the `before` decoder are automatically prefixed with `from: <content>` for easy debugging.

---

## `typeTuple` — fixed-length delimited value

Split a single string into a fixed-length typed tuple:

```ts
import { typeTuple, typeNumber } from "cli-kiss";

const typePoint = typeTuple([typeNumber, typeNumber]);

typePoint.decoder("3.14,2.71") // → [3.14, 2.71]
typePoint.decoder("x,2")       // → Error: at 0: Number: Unable to parse: "x"
```

The default separator is `","`. Pass a second argument to change it:

```ts
typeTuple([typeString, typeNumber], ":")
// "foo:42"  →  ["foo", 42]
```

---

## `typeList` — variable-length delimited value

Split a single string into an array of homogeneous values:

```ts
import { typeList, typeNumber } from "cli-kiss";

const typeNumbers = typeList(typeNumber);

typeNumbers.decoder("1,2,3")  // → [1, 2, 3]
typeNumbers.decoder("1,x,3")  // → Error: at 1: Number: Unable to parse: "x"
```

Custom separator:

```ts
const typePaths = typeList(typeString, ":");
typePaths.decoder("/usr/bin:/usr/local/bin") // → ["/usr/bin", "/usr/local/bin"]
```

::: tip
Prefer [`optionRepeatable`](/guide/03_options#optionrepeatable-collect-multiple-values) over `typeList` when users should pass multiple values as separate flags (`--file a --file b` rather than `--files a,b`).
:::

---

## Custom types

Implement the `Type<Value>` interface directly:

```ts
import type { Type } from "cli-kiss";

const typeHexColor: Type<string> = {
  content: "HexColor",
  decoder(value) {
    if (/^#[0-9a-fA-F]{6}$/.test(value)) return value;
    throw new Error(`Not a valid hex color: "${value}"`);
  },
};

// "--color #ff0000"  →  "#ff0000"
// "--color red"      →  Error: --color: <HEXCOLOR>: HexColor: Not a valid hex color: "red"
```

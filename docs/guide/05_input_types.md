# Input Types

A `Type<Value>` converts a raw CLI string token into a typed value. It is a
pair of a human-readable `content` label and a `decoder` function that throws
on invalid input.

`Type<Value>` is used as the `type` field of any `Option` or `Positional`.

## Built-in types

All type factories accept an optional `name` parameter that overrides the label
shown in help and error messages.

| Type factory   | Value type | Accepts                                                             |
| -------------- | ---------- | ------------------------------------------------------------------- |
| `type`         | `string`   | Any string                                                          |
| `typeBoolean`  | `boolean`  | `true/yes/on/y` → true, `false/no/off/n` → false (case-insensitive)|
| `typeNumber`   | `number`   | Integers, floats, scientific notation                               |
| `typeInteger`  | `bigint`   | Integer strings only                                                |
| `typeDatetime` | `Date`     | Any format accepted by `Date.parse` (ISO 8601 recommended)          |
| `typeUrl`      | `URL`      | Absolute URLs only                                                  |
| `typePath`     | `string`   | Non-empty path strings; optional sync existence check               |

```ts
type("greeting").decoder("hello");               // → "hello"
typeBoolean("flag").decoder("yes");              // → true
typeNumber("pi").decoder("3.14");                // → 3.14
typeInteger("id").decoder("9007199254740993");   // → 9007199254740993n
typeDatetime("birthday").decoder("2024-01-15"); // → Date object
typeUrl("redirect").decoder("https://example.com/path"); // → URL object
typePath().decoder("/usr/bin");                  // → "/usr/bin"
```

`typePath` also accepts an optional second argument to check existence at
parse time:

```ts
typePath("config", { checkSyncExistAs: "file" });      // throws if not a file
typePath("dir",    { checkSyncExistAs: "directory" }); // throws if not a directory
```

## `typeChoice` — string enum

Accepts only a fixed set of strings. Matching is **case-sensitive by default**.

```ts
const typeEnv = typeChoice("environment", ["dev", "staging", "prod"]);
typeEnv.decoder("prod");    // → "prod"
typeEnv.decoder("PROD");    // → Error: Unknown value: "PROD"
typeEnv.decoder("unknown"); // → Error: Unknown value: "unknown"
```

Pass `false` as the third argument to enable case-insensitive matching:

```ts
const typeEnvCI = typeChoice("environment", ["dev", "staging", "prod"], false);
typeEnvCI.decoder("PROD"); // → "prod"
```

## `typeTuple` — fixed-length delimited value

Splits a string into a fixed-length typed tuple. Wrong element count or a
failed element decode throws.

```ts
const typePoint = typeTuple([typeNumber("x"), typeNumber("y")]);
typePoint.decoder("3.14,2.71"); // → [3.14, 2.71]
typePoint.decoder("x,2");       // → Error: at 0: x: Unable to parse: "x"
typePoint.decoder("1,2,3");     // → Error: wrong element count
```

The default separator is `","`. Pass a second argument to change it:

```ts
typeTuple([type("name"), typeNumber()], ":");
// "foo:42"  →  ["foo", 42]
```

## `typeList` — variable-length delimited value

Splits a string into an array of typed values.

```ts
const typeNumbers = typeList(typeNumber("v"));
typeNumbers.decoder("1,2,3"); // → [1, 2, 3]
typeNumbers.decoder("1,x,3"); // → Error: at 1: v: Unable to parse: "x"
```

Custom separator:

```ts
const typePaths = typeList(typePath(), ":");
typePaths.decoder("/usr/bin:/usr/local/bin"); // → ["/usr/bin", "/usr/local/bin"]
```

::: tip Prefer
[`optionRepeatable`](/guide/03_options#optionrepeatable-collect-multiple-values)
over `typeList` when users should pass multiple values as separate flags
(`--file a --file b` rather than `--files a,b`).

:::

## `typeConverted` — transform decoded value

Chains a base type with a transformation function. Useful for range checks or
custom conversions.

```ts
const typePort = typeConverted("port", typeNumber(), (n) => {
  if (n < 1 || n > 65535) throw new Error("Out of range");
  return n;
});
typePort.decoder("8080");  // → 8080
typePort.decoder("99999"); // → Error: Out of range
```

## `typeRenamed` — rename a type

Wraps an existing type with a different label for clearer errors and help text:

```ts
const typeUserId = typeRenamed(typeInteger("u64"), "user-id");
```

## Custom types

Implement the `Type<Value>` interface directly:

```ts
const typeHexColor: Type<string> = {
  content: "hex-color",
  decoder(value) {
    if (/^#[0-9a-fA-F]{6}$/.test(value)) {
      return value;
    }
    throw new Error(`Not a valid hex color: "${value}"`);
  },
};
typeHexColor.decoder("#ff0000"); // → "#ff0000"
typeHexColor.decoder("red");     // → Error: Not a valid hex color: "red"
```

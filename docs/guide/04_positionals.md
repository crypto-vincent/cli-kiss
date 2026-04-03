# Positionals

Bare (non-`--`) arguments, consumed in order. Declared in the `positionals`
array of [`operation`](/guide/02_commands).

## `positionalRequired` — must be present

Throws if the token is missing.

```ts
const name = positionalRequired({
  type: type("person"),
  description: "The name of the person to greet",
});
// Usage:
//   my-cli Alice   →  "Alice"
//   my-cli         →  Error: <person>: Is required, but was not provided
```

| Parameter     | Type          | Description                      |
| ------------- | ------------- | -------------------------------- |
| `type`        | `Type<Value>` | Decoder for the raw string token |
| `description` | `string?`     | Help text                        |
| `hint`        | `string?`     | Short note in parentheses        |

## `positionalOptional` — may be absent

Falls back to a default when no token is present.

```ts
const greeting = positionalOptional({
  type: type("greeting"),
  description: "Custom greeting",
  hint: "defaults to 'Hello'",
  default: () => "Hello",
});
// Usage:
//   my-cli         →  "Hello"
//   my-cli Howdy   →  "Howdy"
```

| Parameter     | Type          | Description                                          |
| ------------- | ------------- | ---------------------------------------------------- |
| `type`        | `Type<Value>` | Decoder for the raw string token                     |
| `description` | `string?`     | Help text                                            |
| `hint`        | `string?`     | Short note in parentheses                            |
| `default`     | `() => Value` | Value when absent — throw inside to make it required |

## `positionalVariadics` — zero or more

Consumes all remaining tokens into an array.

```ts
const files = positionalVariadics({
  type: typePath(),
  description: "Files to process",
});
// Usage:
//   my-cli a.ts b.ts c.ts   →  ["a.ts", "b.ts", "c.ts"]
//   my-cli                  →  []
```

### End delimiter

Optionally stop collecting at a specific sentinel token:

```ts
const args = positionalVariadics({
  type: type("argument"),
  endDelimiter: "STOP",
  description: "Arguments (end with STOP)",
});
// Usage:
//   my-cli foo bar STOP   →  ["foo", "bar"]
```

| Parameter      | Type          | Description                          |
| -------------- | ------------- | ------------------------------------ |
| `type`         | `Type<Value>` | Decoder applied to each token        |
| `description`  | `string?`     | Help text                            |
| `hint`         | `string?`     | Short note in parentheses            |
| `endDelimiter` | `string?`     | Sentinel token that stops collection |

## Ordering rules

Positionals are consumed **in declaration order** — required first, variadics
last.

```ts
operation(
  {
    options: {},
    positionals: [
      positionalRequired({ type: type("src") }),
      positionalRequired({ type: type("dst") }),
      positionalOptional({ type: type("tag"), default: () => "latest" }),
      positionalVariadics({ type: type("extra") }),
    ],
  },
  async function (_ctx, { positionals: [src, dst, tag, extras] }) {
    /* ... */
  },
);
// Usage:
//   my-cli in out  →  src="in", dst="out", tag="latest", extras=[]
//   my-cli in out v2 a b c  →  src="in", dst="out", tag="v2", extras=["a","b","c"]
```

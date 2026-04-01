# Positionals

Bare (non-`--`) arguments, consumed in order. Declared in the `positionals`
array of [`operation`](/guide/02_commands).

## `positionalRequired` — must be present

Fails if missing.

```ts
import { positionalRequired, typeString } from "cli-kiss";

const name = positionalRequired({
  type: typeNamed(typeString, "person"),
  description: "The name of the person to greet",
});
// my-cli Alice   →  "Alice"
// my-cli         →  Error: <PERSON>: Is required, but was not provided
```

| Parameter     | Type          | Description                      |
| ------------- | ------------- | -------------------------------- |
| `type`        | `Type<Value>` | Decoder for the raw string token |
| `description` | `string?`     | Help text                        |
| `hint`        | `string?`     | Short note in parentheses        |

## `positionalOptional` — may be absent

Falls back to a default when absent.

```ts
import { positionalOptional, typeString } from "cli-kiss";

const greeting = positionalOptional({
  type: typeNamed(typeString, "greeting"),
  description: "Custom greeting (default: Hello)",
  default: () => "Hello",
});
// my-cli          →  "Hello"
// my-cli Howdy    →  "Howdy"
```

| Parameter     | Type          | Description                                       |
| ------------- | ------------- | ------------------------------------------------- |
| `type`        | `Type<Value>` | Decoder for the raw string token                  |
| `description` | `string?`     | Help text                                         |
| `hint`        | `string?`     | Short note in parentheses                         |
| `default`     | `() => Value` | Value when absent — **throw** to make it required |

## `positionalVariadics` — zero or more

Consumes all remaining tokens into an array.

```ts
import { positionalVariadics, typeString } from "cli-kiss";

const files = positionalVariadics({
  type: typePath(),
  description: "Files to process",
});
// my-cli a.ts b.ts c.ts   →  ["a.ts", "b.ts", "c.ts"]
// my-cli                  →  []
```

### End delimiter

Optionally stop collecting at a specific sentinel token:

```ts
const args = positionalVariadics({
  type: typeNamed("argument", typeString),
  endDelimiter: "STOP",
  description: "Arguments (end with STOP)",
});
// my-cli foo bar STOP   →  ["foo", "bar"]
```

| Parameter      | Type          | Description                          |
| -------------- | ------------- | ------------------------------------ |
| `type`         | `Type<Value>` | Decoder applied to each token        |
| `description`  | `string?`     | Help text                            |
| `hint`         | `string?`     | Short note in parentheses            |
| `endDelimiter` | `string?`     | Sentinel token that stops collection |

## Ordering rules

Consumed **in declaration order** — required first, variadics last.

```ts
operation(
  {
    options: {},
    positionals: [
      positionalRequired({ type: typeNamed("src", typeString) }),
      positionalRequired({ type: typeNamed("dst", typeString) }),
      positionalOptional({ type: typeString, default: () => "latest" }),
      positionalVariadics({ type: typeString }),
    ],
  },
  async function (_ctx, { positionals: [src, dst, tag, extras] }) {
    /* ... */
  },
);
// Usage:
//   my-cli in out  →  src="in", src="out", tag="latest", extras=[]
//   my-cli in out v2 a b c  →  src="in", src="out", tag="v2", extras=["a","b","c"]
```

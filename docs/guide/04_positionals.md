# Positionals

Positionals are bare (non-option) arguments passed by position. Declare them in
order in the `positionals` array of [`operation`](/guide/02_commands).

## `positionalRequired` — must be present

Fails with a parse error if the argument is missing.

```ts
import { positionalRequired, typeString } from "cli-kiss";

const name = positionalRequired({
  type: typeString,
  label: "NAME",
  description: "The name to greet",
});
// my-cli Alice   →  "Alice"
// my-cli         →  Error: <NAME>: Is required, but was not provided
```

| Parameter     | Type                 | Description                                               |
| ------------- | -------------------- | --------------------------------------------------------- |
| `type`        | `Type<Value>`        | Decoder for the raw string token                          |
| `label`       | `Uppercase<string>?` | Placeholder in help (defaults to uppercased type content) |
| `description` | `string?`            | Help text                                                 |
| `hint`        | `string?`            | Short note in parentheses                                 |

## `positionalOptional` — may be absent

Falls back to a default value when the argument is not provided.

```ts
import { positionalOptional, typeString } from "cli-kiss";

const greeting = positionalOptional({
  type: typeString,
  label: "GREETING",
  description: "Custom greeting (default: Hello)",
  default: () => "Hello",
});
// my-cli          →  "Hello"
// my-cli Howdy    →  "Howdy"
```

| Parameter     | Type                 | Description                                       |
| ------------- | -------------------- | ------------------------------------------------- |
| `type`        | `Type<Value>`        | Decoder for the raw string token                  |
| `label`       | `Uppercase<string>?` | Placeholder in help                               |
| `description` | `string?`            | Help text                                         |
| `hint`        | `string?`            | Short note in parentheses                         |
| `default`     | `() => Value`        | Value when absent — **throw** to make it required |

## `positionalVariadics` — zero or more

Greedily consumes all remaining positional tokens into an array.

```ts
import { positionalVariadics, typeString } from "cli-kiss";

const files = positionalVariadics({
  type: typeString,
  label: "FILE",
  description: "Files to process",
});
// my-cli a.ts b.ts c.ts   →  ["a.ts", "b.ts", "c.ts"]
// my-cli                  →  []
```

### End delimiter

Optionally stop collecting at a specific sentinel token:

```ts
const args = positionalVariadics({
  type: typeString,
  label: "ARG",
  endDelimiter: "STOP",
  description: "Arguments (end with STOP)",
});
// my-cli foo bar STOP   →  ["foo", "bar"]
```

| Parameter      | Type                 | Description                          |
| -------------- | -------------------- | ------------------------------------ |
| `type`         | `Type<Value>`        | Decoder applied to each token        |
| `label`        | `Uppercase<string>?` | Placeholder in help                  |
| `description`  | `string?`            | Help text                            |
| `hint`         | `string?`            | Short note in parentheses            |
| `endDelimiter` | `string?`            | Sentinel token that stops collection |

## Ordering rules

Positionals are consumed **in declaration order**. Required positionals should
come first; variadics should be last.

```ts
operation(
  {
    options: {},
    positionals: [
      positionalRequired({ type: typeString, label: "SOURCE" }),
      positionalRequired({ type: typeString, label: "DEST" }),
      positionalOptional({
        type: typeString,
        label: "TAG",
        default: () => "latest",
      }),
      positionalVariadics({ type: typeString, label: "EXTRA" }),
    ],
  },
  async (_ctx, { positionals: [source, dest, tag, extras] }) => {
    /* ... */
  },
);
// my-cli src/ dst/                →  source="src/", dest="dst/", tag="latest", extras=[]
// my-cli src/ dst/ v2 a b c       →  source="src/", dest="dst/", tag="v2", extras=["a","b","c"]
```

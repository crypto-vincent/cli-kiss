# Options

Options are named arguments prefixed with `--` (or `-` for short forms). Declare them in the `options` map of [`operation`](/guide/commands).

## `optionFlag` — boolean toggle

A flag that is either present or absent. The user can also pass `--flag=yes` / `--flag=no`.

```ts
import { optionFlag } from "cli-kiss";

const verbose = optionFlag({
  long: "verbose",
  short: "v",
  description: "Enable verbose output",
});
// --verbose       →  true
// --verbose=yes   →  true
// --verbose=no    →  false
// (absent)        →  false
```

| Parameter | Type | Description |
|---|---|---|
| `long` | `Lowercase<string>` | Long flag name (without `--`) |
| `short` | `string?` | Short flag name (without `-`) |
| `description` | `string?` | Help text |
| `hint` | `string?` | Short note in parentheses |
| `default` | `() => boolean` | Default when absent (default: `() => false`) |
| `aliases` | `{ longs?, shorts? }` | Additional names for the flag |

::: tip
A flag specified more than once triggers a parse error. Use [`optionRepeatable`](#optionrepeatable-collect-multiple-values) if you need multiple values.
:::

---

## `optionSingleValue` — one typed value

Accepts exactly one value. Use any [`Type`](/guide/types) to decode it.

```ts
import { optionSingleValue, typeString } from "cli-kiss";

const output = optionSingleValue({
  long: "output",
  short: "o",
  type: typeString,
  label: "PATH",
  description: "Output directory",
  default: () => "dist/",
});
// --output dist/   →  "dist/"
// --output=dist/   →  "dist/"
// -o dist/         →  "dist/"
// (absent)         →  "dist/"
```

| Parameter | Type | Description |
|---|---|---|
| `long` | `Lowercase<string>` | Long option name |
| `short` | `string?` | Short option name |
| `type` | `Type<Value>` | Decoder for the value |
| `label` | `Uppercase<string>?` | Placeholder in help (defaults to uppercased type content) |
| `description` | `string?` | Help text |
| `hint` | `string?` | Short note in parentheses |
| `default` | `() => Value` | Default when absent — **throw** to make the option required |
| `aliases` | `{ longs?, shorts? }` | Additional names |

### Making an option required

Throw from the `default` factory to require the option:

```ts
optionSingleValue({
  long: "token",
  type: typeString,
  description: "API token",
  default: () => {
    throw new Error("--token is required");
  },
})
```

---

## `optionRepeatable` — collect multiple values

Collects every occurrence into an array. Safe to specify zero or many times.

```ts
import { optionRepeatable, typeString } from "cli-kiss";

const files = optionRepeatable({
  long: "file",
  short: "f",
  type: typeString,
  label: "PATH",
  description: "Input file (may be repeated)",
});
// --file a.ts --file b.ts   →  ["a.ts", "b.ts"]
// (absent)                  →  []
```

| Parameter | Type | Description |
|---|---|---|
| `long` | `Lowercase<string>` | Long option name |
| `short` | `string?` | Short option name |
| `type` | `Type<Value>` | Decoder applied to each occurrence |
| `label` | `Uppercase<string>?` | Placeholder in help |
| `description` | `string?` | Help text |
| `hint` | `string?` | Short note in parentheses |
| `aliases` | `{ longs?, shorts? }` | Additional names |

---

## Aliases

All three option creators accept an `aliases` field for alternative names:

```ts
optionFlag({
  long: "dry-run",
  aliases: { longs: ["dryrun"], shorts: ["n"] },
  description: "Print actions without executing them",
})
// --dry-run, --dryrun, and -n all work
```

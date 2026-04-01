# Options

Named `--` arguments (or `-` for short forms). Declared in the `options` map of
[`operation`](/guide/02_commands).

## `optionFlag` — boolean toggle

Present or absent. Also accepts `--flag=true` / `--flag=no`.

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

| Parameter     | Type                  | Description                          |
| ------------- | --------------------- | ------------------------------------ |
| `long`        | `string`              | Long flag name (without `--`)        |
| `short`       | `string?`             | Short flag name (without `-`)        |
| `description` | `string?`             | Help text                            |
| `hint`        | `string?`             | Short note in parentheses            |
| `default`     | `boolean? `           | Value when absent (default: `false`) |
| `aliases`     | `{ longs?, shorts? }` | Additional names for the flag        |

::: tip A flag specified more than once triggers a parse error. Use
[`optionRepeatable`](#optionrepeatable-collect-multiple-values) if you need
multiple values.

:::

## `optionSingleValue` — one typed value

Exactly one typed value.

```ts
import { optionSingleValue, typePath } from "cli-kiss";

const output = optionSingleValue({
  long: "output",
  short: "o",
  type: typePath(),
  description: "Output directory",
  valueNotDefined: () => "dist/",
});
// --output dist/   →  "dist/"
// --output=dist/   →  "dist/"
// -o dist/         →  "dist/"
// (absent)         →  "dist/"
```

| Parameter        | Type                  | Description                                                 |
| ---------------- | --------------------- | ----------------------------------------------------------- |
| `long`           | `string`              | Long option name                                            |
| `short`          | `string?`             | Short option name                                           |
| `type`           | `Type<Value>`         | Decoder for the value                                       |
| `description`    | `string?`             | Help text                                                   |
| `hint`           | `string?`             | Short note in parentheses                                   |
| `valueNotDefined`   | `() => Value`      | Value when option is absent — **throw** to make it required |
| `valueNotInlined`   | `() => Value?`     | Value when option is present but has no inline value (e.g. `--output` alone) |
| `aliases`        | `{ longs?, shorts? }` | Additional names                                            |

## `optionRepeatable` — collect multiple values

Collects every occurrence into an array.

```ts
import { optionRepeatable, type } from "cli-kiss";

const files = optionRepeatable({
  long: "file",
  short: "f",
  type: typePath("FILE_PATH"),
  description: "Input file (may be repeated)",
});
// --file a.ts --file b.ts   →  ["a.ts", "b.ts"]
// (absent)                  →  []
```

| Parameter     | Type                  | Description                        |
| ------------- | --------------------- | ---------------------------------- |
| `long`        | `string`              | Long option name                   |
| `short`       | `string?`             | Short option name                  |
| `type`        | `Type<Value>`         | Decoder applied to each occurrence |
| `description` | `string?`             | Help text                          |
| `hint`        | `string?`             | Short note in parentheses          |
| `aliases`     | `{ longs?, shorts? }` | Additional names                   |

## Aliases

All three option creators accept an `aliases` field for alternative names:

```ts
optionFlag({
  long: "dry-run",
  aliases: { longs: ["dryrun"], shorts: ["n"] },
  description: "Print actions without executing them",
});
// --dry-run, --dryrun, and -n all work
```

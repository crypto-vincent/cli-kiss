# Options

Named `--` arguments (or `-` for short forms). Declared in the `options` map of
[`operation`](/guide/02_commands).

## `optionFlag` — boolean toggle

Present or absent. Also accepts `--flag=true` / `--flag=no`.

```ts
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
const output = optionSingleValue({
  long: "output",
  short: "o",
  type: typePath(),
  description: "Output directory",
  defaultIfNotSpecified: () => "dist/",
});
// --output dist/   →  "dist/"
// --output=dist/   →  "dist/"
// -o dist/         →  "dist/"
// (absent)         →  "dist/"
```

| Parameter               | Type                  | Description                                                                  |
| ----------------------- | --------------------- | ---------------------------------------------------------------------------- |
| `long`                  | `string`              | Long option name                                                             |
| `short`                 | `string?`             | Short option name                                                            |
| `type`                  | `Type<Value>`         | Decoder for the value                                                        |
| `description`           | `string?`             | Help text                                                                    |
| `hint`                  | `string?`             | Short note in parentheses                                                    |
| `defaultIfNotSpecified` | `() => Value`         | Value when option is absent — **throw** to make it required                  |
| `valueIfNothingInlined` | `() => Value?`        | Value when option is present but has no inline value (e.g. `--output` alone) |
| `aliases`               | `{ longs?, shorts? }` | Additional names                                                             |

## `optionRepeatable` — collect multiple values

Collects every occurrence into an array.

```ts
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

## Short option syntax

Short options support several equivalent syntaxes for value-bearing options:

```sh
my-cli -o dist/      # separated: space between flag and value
my-cli -odist/       # attached: value immediately after the flag letter
my-cli -o=dist/      # inline: = between flag and value
```

### Stacking short flags

Multiple boolean short flags can be combined into a single token:

```sh
my-cli -abc          # equivalent to: my-cli -a -b -c
my-cli -abco dist/   # equivalent to: my-cli -a -b -c -o dist/
```

The last letter in a stack may be a value-bearing option and consume the next argument.

## End-of-options delimiter (`--`)

A bare `--` token stops option parsing. Everything after it is treated as a
positional argument, even if it starts with `-` or `--`:

```sh
my-cli -- --not-an-option    # "--not-an-option" is a positional value
my-cli -- -v                 # "-v" is a positional value
```

This follows the POSIX convention for passing raw arguments to sub-processes.


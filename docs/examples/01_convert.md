# File Converter

A CLI that converts a source file to an output path with a mandatory format
choice and an optional overwrite guard.

Demonstrates: `positionalRequired`, `optionSingleValue` with `typeChoice`,
`optionFlag`.

```ts
import {
  command,
  operation,
  optionFlag,
  optionSingleValue,
  positionalRequired,
  runAndExit,
  type,
  typeChoice,
} from "cli-kiss";

const typeFormat = typeChoice("format", ["json", "yaml", "toml"]);

const convertCmd = command(
  { description: "Convert a file to another format" },
  operation(
    {
      options: {
        format: optionSingleValue({
          long: "format",
          short: "f",
          type: typeFormat,
          description: 'Target format ("json", "yaml", or "toml")',
          defaultWhenNotDefined: () => {
            throw new Error("--format is required");
          },
        }),
        overwrite: optionFlag({
          long: "overwrite",
          description: "Overwrite the output file if it already exists",
        }),
      },
      positionals: [
        positionalRequired({ type: type("src"), description: "Source file" }),
        positionalRequired({ type: type("dst"), description: "Output file" }),
      ],
    },
    async (_ctx, { options: { format, overwrite }, positionals: [src, dst] }) => {
      console.log(`Converting ${src} → ${dst} (${format})${overwrite ? " [overwrite]" : ""}`);
    },
  ),
);

await runAndExit("convert", process.argv.slice(2), {}, convertCmd, {
  buildVersion: "1.0.0",
});
```

```sh
convert data.csv out.json --format json
```

```text
Converting data.csv → out.json (json)
```

```sh
convert data.csv out.json --format json --overwrite
```

```text
Converting data.csv → out.json (json) [overwrite]
```

```sh
convert --help --color
```

```text
Usage: convert <src> <dst>

Convert a file to another format

Positionals:
  <src>  Source file
  <dst>  Output file

Options:
  --format[=<format>], -f  Target format ("json", "yaml", or "toml")
  --overwrite[=no]         Overwrite the output file if it already exists
```

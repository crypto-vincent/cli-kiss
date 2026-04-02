# cli-kiss

Type-safe CLI builder for TypeScript. No dependencies, no supply-chain attacks.

Small API, standard compliance, polished help output, zero runtime dependencies.

## Why

- Compose commands, subcommands, options, and positionals with strong types
- Get built-in `--help`, `--version`, and color-aware error messages
- Ship a real CLI parser without pulling in a dependency tree

## Install

```sh
npm install cli-kiss
```

## Example

```ts
import {
  command,
  operation,
  optionFlag,
  positionalRequired,
  runAndExit,
  type,
} from "cli-kiss";

const greet = command(
  { description: "Greet someone" },
  operation(
    {
      options: {
        loud: optionFlag({ long: "loud", description: "Print in uppercase" }),
      },
      positionals: [positionalRequired({ type: type("name") })],
    },
    async (_ctx, { options: { loud }, positionals: [name] }) => {
      const text = `Hello, ${name}!`;
      console.log(loud ? text.toUpperCase() : text);
    },
  ),
);

await runAndExit("greet", process.argv.slice(2), {}, greet, {
  buildVersion: "1.0.0",
});
```

```sh
greet --help
```

```text
Usage: greet <name>

Greet someone

Positionals:
  <name>

Options:
  --loud[=no]  Print in uppercase
```

## Docs

Guides, examples, and API usage:
[crypto-vincent.github.io/cli-kiss](https://crypto-vincent.github.io/cli-kiss/)

# cli-kiss

Type-safe CLI builder for TypeScript. Zero runtime dependencies.

Small API, standard compliance, polished help output.

## Why

- Compose commands, subcommands, options, and positionals with strong types
- Built-in `--help`, `--version`, and color-aware error messages
- No dependency tree — no supply-chain risk

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

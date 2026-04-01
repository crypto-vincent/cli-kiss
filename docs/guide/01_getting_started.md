# Getting Started

## Installation

```sh
npm install cli-kiss
```

## Your first CLI

Minimal "greet" CLI with:

- a required `NAME` positional
- optional `--loud` flag:

```ts
import {
  command,
  operation,
  optionFlag,
  positionalRequired,
  runAndExit,
  type,
} from "cli-kiss";

const greetCommand = command(
  { description: "Greet someone" },
  operation(
    {
      options: {
        loud: optionFlag({ long: "loud", description: "Print in uppercase" }),
      },
      positionals: [
        positionalRequired({
          type: type("name"),
          description: "The name of the person to greet",
        }),
      ],
    },
    async (_context, { options: { loud }, positionals: [name] }) => {
      const message = `Hello, ${name}!`;
      console.log(loud ? message.toUpperCase() : message);
    },
  ),
);

await runAndExit("greet", process.argv.slice(2), {}, greetCommand, {
  buildVersion: "1.0.0",
});
```

Run it:

```sh
greet Alice
```

```text
Hello, Alice!
```

Pass a flag:

```sh
greet --loud Alice
```

```text
HELLO, ALICE!
```

Help (built-in):

```sh
greet --help
```

```text
Usage: greet <NAME>

Greet someone

Positionals:
  <NAME>  The name to greet

Options:
  --loud[=no]  Print in uppercase
```

Version (built-in):

```sh
greet --version
```

```text
greet 1.0.0
```

## Project structure

A typical `cli-kiss` project looks like this:

```text
my-cli/
├── src/
│   ├── index.ts        ← entry point: calls runAndExit
│   └── commands/
│       ├── deploy.ts   ← command(...) definitions
│       └── rollback.ts
└── package.json
```

Each command lives in its own file and is composed together in the entry point.
See the [Commands](./02_commands) guide to learn how.

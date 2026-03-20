# Getting Started

## Installation

```sh
npm install cli-kiss
```

## Your first CLI

Here is a minimal "greet" CLI that takes a required `NAME` positional and an optional `--loud` flag:

```ts
import {
  command,
  operation,
  optionFlag,
  positionalRequired,
  runAndExit,
  typeString,
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
          type: typeString,
          label: "NAME",
          description: "The name to greet",
        }),
      ],
    },
    async (_ctx, { options: { loud }, positionals: [name] }) => {
      const message = `Hello, ${name}!`;
      console.log(loud ? message.toUpperCase() : message);
    },
  ),
);

await runAndExit("greet", process.argv.slice(2), undefined, greetCommand, {
  buildVersion: "1.0.0",
});
```

Run it:

```sh
$ greet Alice
Hello, Alice!

$ greet --loud Alice
HELLO, ALICE!

$ greet --help
Usage: greet <NAME>

Greet someone

Positionals:
  <NAME>  The name to greet

Options:
  --loud[=no]  Print in uppercase

$ greet --version
greet 1.0.0
```

## Project structure

A typical `cli-kiss` project looks like this:

```
my-cli/
├── src/
│   ├── index.ts        ← entry point: calls runAndExit
│   └── commands/
│       ├── deploy.ts   ← command(...) definitions
│       └── rollback.ts
└── package.json
```

Each command lives in its own file and is composed together in the entry point. See the [Commands](./commands) guide to learn how.

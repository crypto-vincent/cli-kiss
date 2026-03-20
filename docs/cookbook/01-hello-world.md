# 1. Hello, World!

The minimum viable CLI: a single command that prints a greeting.

```ts
import {
  command,
  operation,
  positionalRequired,
  runAsCliAndExit,
  typeString,
} from "cli-kiss";

const greetCommand = command(
  { description: "Greet someone" },
  operation(
    {
      options: {},
      positionals: [
        positionalRequired({
          type: typeString,
          label: "NAME",
          description: "The name to greet",
        }),
      ],
    },
    async (_ctx, { positionals: [name] }) => {
      console.log(`Hello, ${name}!`);
    },
  ),
);

await runAsCliAndExit("greet", process.argv.slice(2), undefined, greetCommand);
```

```
$ greet Alice
Hello, Alice!

$ greet --help
Usage: greet <NAME>

  Greet someone

Positionals:
  <NAME>   The name to greet
```

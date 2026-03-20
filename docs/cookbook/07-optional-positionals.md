# 7. Optional Positional Arguments

`positionalOptional` falls back to a default when the argument is omitted.

```ts
import {
  command,
  operation,
  positionalOptional,
  runAsCliAndExit,
  typeString,
} from "cli-kiss";

const greetCommand = command(
  { description: "Greet someone" },
  operation(
    {
      options: {},
      positionals: [
        positionalOptional({
          type: typeString,
          label: "NAME",
          description: "Name to greet",
          default: () => "World",
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
$ greet
Hello, World!

$ greet Alice
Hello, Alice!
```

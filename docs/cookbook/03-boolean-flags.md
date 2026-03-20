# 3. Boolean Flags

Use `optionFlag` for options that are either present or absent.

```ts
import {
  command,
  operation,
  optionFlag,
  positionalRequired,
  runAsCliAndExit,
  typeString,
} from "cli-kiss";

const greetCommand = command(
  { description: "Greet someone" },
  operation(
    {
      options: {
        loud: optionFlag({
          long: "loud",
          short: "l",
          description: "Print the greeting in uppercase",
        }),
      },
      positionals: [positionalRequired({ type: typeString, label: "NAME" })],
    },
    async (_ctx, { options: { loud }, positionals: [name] }) => {
      const message = `Hello, ${name}!`;
      console.log(loud ? message.toUpperCase() : message);
    },
  ),
);

await runAsCliAndExit("greet", process.argv.slice(2), undefined, greetCommand);
```

```
$ greet Alice
Hello, Alice!

$ greet --loud Alice
HELLO, ALICE!

$ greet -l Alice
HELLO, ALICE!
```

> **Tip:** A flag can also be set with an explicit value: `--loud=true` /
> `--loud=false`.

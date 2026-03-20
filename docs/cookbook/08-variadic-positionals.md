# 8. Variadic Positional Arguments

`positionalVariadics` collects all remaining positional tokens into an array.

```ts
import {
  command,
  operation,
  positionalVariadics,
  runAsCliAndExit,
  typeString,
} from "cli-kiss";

const echoCommand = command(
  { description: "Echo words back" },
  operation(
    {
      options: {},
      positionals: [
        positionalVariadics({
          type: typeString,
          label: "WORD",
          description: "Words to echo",
        }),
      ],
    },
    async (_ctx, { positionals: [words] }) => {
      console.log(words.join(" "));
    },
  ),
);

await runAsCliAndExit("echo", process.argv.slice(2), undefined, echoCommand);
```

```
$ echo hello world
hello world

$ echo
(empty line)
```

## Using an end delimiter

Stop collecting variadic args at a sentinel token (e.g. `--`):

```ts
positionalVariadics({
  type: typeString,
  label: "ARG",
  endDelimiter: "--",
  description: "Arguments before --",
});
// my-cli a b -- c d  →  ["a", "b"]   (c and d are left in the stream)
```

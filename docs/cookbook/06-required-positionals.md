# 6. Required Positional Arguments

`positionalRequired` fails immediately if the argument is missing.

```ts
import {
  command,
  operation,
  positionalRequired,
  runAsCliAndExit,
  typeString,
} from "cli-kiss";

const copyCommand = command(
  { description: "Copy a file" },
  operation(
    {
      options: {},
      positionals: [
        positionalRequired({
          type: typeString,
          label: "SRC",
          description: "Source path",
        }),
        positionalRequired({
          type: typeString,
          label: "DEST",
          description: "Destination path",
        }),
      ],
    },
    async (_ctx, { positionals: [src, dest] }) => {
      console.log(`Copying ${src} → ${dest}`);
    },
  ),
);

await runAsCliAndExit("cp", process.argv.slice(2), undefined, copyCommand);
```

```
$ cp foo.txt bar.txt
Copying foo.txt → bar.txt

$ cp foo.txt
Error: <DEST>: Is required, but was not provided
```

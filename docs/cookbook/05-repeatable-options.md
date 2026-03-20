# 5. Repeatable Options

Use `optionRepeatable` when the same option can be passed multiple times.

```ts
import {
  command,
  operation,
  optionRepeatable,
  runAsCliAndExit,
  typeString,
} from "cli-kiss";

const compileCommand = command(
  { description: "Compile source files" },
  operation(
    {
      options: {
        files: optionRepeatable({
          long: "file",
          short: "f",
          type: typeString,
          label: "PATH",
          description: "Source file (repeatable)",
        }),
      },
      positionals: [],
    },
    async (_ctx, { options: { files } }) => {
      if (files.length === 0) {
        console.log("No files provided.");
        return;
      }
      for (const file of files) {
        console.log(`Compiling ${file}…`);
      }
    },
  ),
);

await runAsCliAndExit(
  "compile",
  process.argv.slice(2),
  undefined,
  compileCommand,
);
```

```
$ compile --file a.ts --file b.ts -f c.ts
Compiling a.ts…
Compiling b.ts…
Compiling c.ts…
```

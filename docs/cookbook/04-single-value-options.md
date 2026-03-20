# 4. Single-Value Options

Use `optionSingleValue` for options that accept exactly one value.

```ts
import {
  command,
  operation,
  optionSingleValue,
  runAsCliAndExit,
  typeString,
} from "cli-kiss";

const buildCommand = command(
  { description: "Build the project" },
  operation(
    {
      options: {
        output: optionSingleValue({
          long: "output",
          short: "o",
          type: typeString,
          label: "PATH",
          description: "Output directory",
          default: () => "dist/",
        }),
      },
      positionals: [],
    },
    async (_ctx, { options: { output } }) => {
      console.log(`Building into ${output}…`);
    },
  ),
);

await runAsCliAndExit("build", process.argv.slice(2), undefined, buildCommand);
```

```
$ build
Building into dist/…

$ build --output build/
Building into build/…

$ build -o /tmp/out
Building into /tmp/out…
```

## Making an option required

Throw inside `default` to make the option mandatory:

```ts
optionSingleValue({
  long: "token",
  type: typeString,
  description: "API token",
  default: () => {
    throw new Error("--token is required");
  },
});
```

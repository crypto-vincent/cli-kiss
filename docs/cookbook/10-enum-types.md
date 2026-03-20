# 10. Enum Types with `typeOneOf`

Restrict a string argument to a fixed set of values.

```ts
import {
  command,
  operation,
  optionSingleValue,
  runAsCliAndExit,
  typeOneOf,
} from "cli-kiss";

const typeEnv = typeOneOf("Environment", ["dev", "staging", "prod"]);

const deployCommand = command(
  { description: "Deploy the application" },
  operation(
    {
      options: {
        env: optionSingleValue({
          long: "env",
          short: "e",
          type: typeEnv,
          label: "ENV",
          description: "Target environment",
          default: () => "dev",
        }),
      },
      positionals: [],
    },
    async (_ctx, { options: { env } }) => {
      console.log(`Deploying to ${env}…`);
    },
  ),
);

await runAsCliAndExit(
  "deploy",
  process.argv.slice(2),
  undefined,
  deployCommand,
);
```

```
$ deploy --env prod
Deploying to prod…

$ deploy --env unknown
Error: --env: <ENV>: Environment: Invalid value: "unknown"
        (expected one of: "dev" | "staging" | "prod")
```

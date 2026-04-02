# Release CLI

A multi-environment release tool with two subcommands (`publish` and
`rollback`). The root operation resolves the target environment once and
forwards it as context to every subcommand.

Demonstrates: `commandWithSubcommands`, `optionSingleValue` with `typeChoice`,
shared context, `details` and `examples` metadata.

```ts
import {
  command,
  commandWithSubcommands,
  operation,
  optionFlag,
  optionSingleValue,
  runAndExit,
  typeChoice,
} from "cli-kiss";

type Ctx = { env: "staging" | "prod" };

const publishCmd = command(
  {
    description: "Publish the current build",
    examples: [
      {
        explanation: "Dry-run publish to staging",
        commandArgs: [
          { subcommand: "publish" },
          { option: { long: "dry-run" } },
        ],
      },
    ],
  },
  operation(
    {
      options: {
        dryRun: optionFlag({ long: "dry-run", description: "Simulate only" }),
      },
      positionals: [],
    },
    async ({ env }, { options: { dryRun } }) => {
      const tag = dryRun ? "[dry-run] " : "";
      console.log(`${tag}Publishing to ${env}`);
    },
  ),
);

const rollbackCmd = command(
  { description: "Roll back to the previous release" },
  operation(
    { options: {}, positionals: [] },
    async ({ env }) => {
      console.log(`Rolling back ${env}`);
    },
  ),
);

const rootCmd = commandWithSubcommands(
  { description: "Release management tool" },
  operation(
    {
      options: {
        env: optionSingleValue({
          long: "env",
          type: typeChoice("environment", ["staging", "prod"]),
          description: "Target environment",
          defaultWhenNotDefined: () => "staging" as const,
        }),
      },
      positionals: [],
    },
    async (_ctx, { options: { env } }): Promise<Ctx> => ({ env }),
  ),
  { publish: publishCmd, rollback: rollbackCmd },
);

await runAndExit("release", process.argv.slice(2), undefined, rootCmd, {
  buildVersion: "1.0.0",
});
```

```sh
release --help --color
```

```text
Usage: release <subcommand>

Release management tool

Subcommands:
  publish   Publish the current build
  rollback  Roll back to the previous release

Options:
  --env[=<environment>]  Target environment
```

```sh
release publish --dry-run
```

```text
[dry-run] Publishing to staging
```

```sh
release --env prod rollback
```

```text
Rolling back prod
```

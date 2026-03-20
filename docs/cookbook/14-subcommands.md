# 14. Subcommands

Use `commandWithSubcommands` to route to named sub-actions.

```ts
import {
  command,
  commandWithSubcommands,
  operation,
  optionSingleValue,
  positionalRequired,
  runAsCliAndExit,
  typeString,
} from "cli-kiss";

// Shared root operation — runs before every subcommand.
const rootOperation = operation(
  {
    options: {
      config: optionSingleValue({
        long: "config",
        short: "c",
        type: typeString,
        label: "PATH",
        description: "Config file",
        default: () => "cli.config.json",
      }),
    },
    positionals: [],
  },
  async (_ctx, { options: { config } }) => {
    // Load config and pass it as the subcommand context.
    return { configPath: config };
  },
);

const deployCommand = command(
  { description: "Deploy the application" },
  operation(
    {
      options: {},
      positionals: [
        positionalRequired({
          type: typeString,
          label: "ENV",
          description: "Target environment",
        }),
      ],
    },
    async ({ configPath }, { positionals: [env] }) => {
      console.log(`[${configPath}] Deploying to ${env}…`);
    },
  ),
);

const rollbackCommand = command(
  { description: "Rollback the last deployment" },
  operation({ options: {}, positionals: [] }, async ({ configPath }) => {
    console.log(`[${configPath}] Rolling back…`);
  }),
);

const cli = commandWithSubcommands(
  { description: "My deployment tool" },
  rootOperation,
  { deploy: deployCommand, rollback: rollbackCommand },
);

await runAsCliAndExit("mytool", process.argv.slice(2), undefined, cli);
```

```
$ mytool deploy prod
[cli.config.json] Deploying to prod…

$ mytool --config custom.json rollback
[custom.json] Rolling back…

$ mytool --help
Usage: mytool <SUBCOMMAND>

  My deployment tool

Subcommands:
  deploy     Deploy the application
  rollback   Rollback the last deployment

Options:
  --config, -c <PATH>   Config file
```

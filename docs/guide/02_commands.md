# Commands

Three factory functions cover every use-case.

## `command` — leaf command

No subcommands — directly runs an operation.

```ts
import { command, operation, positionalRequired, type } from "cli-kiss";

const greet = command(
  { description: "Greet a user" },
  operation(
    {
      options: {},
      positionals: [positionalRequired({ type: type("name") })],
    },
    async function (_ctx, { positionals: [name] }) {
      console.log(`Hello, ${name}!`);
    },
  ),
);
```

## `commandWithSubcommands` — dispatch to a subcommand

User must pick one of several sub-actions.

```ts
import {
  command,
  commandWithSubcommands,
  operation,
  runAndExit,
} from "cli-kiss";

const rootCmd = commandWithSubcommands(
  { description: "My deployment CLI" },
  // This operation runs before the subcommand is selected.
  // Its return value becomes the subcommand's context.
  operation({ options: {}, positionals: [] }, async function (_ctx) {
    return { db: "postgres://localhost/mydb" };
  }),
  {
    deploy: command(
      { description: "Deploy the latest build" },
      operation({ options: {}, positionals: [] }, async function (ctx) {
        console.log(`Deploying with DB: ${ctx.db}`);
      }),
    ),
    rollback: command(
      { description: "Rollback to the previous release" },
      operation({ options: {}, positionals: [] }, async function (ctx) {
        console.log(`Rolling back, DB: ${ctx.db}`);
      }),
    ),
  },
);

await runAndExit("deploy-cli", process.argv.slice(2), undefined, rootCmd);
```

Check it:

```sh
deploy-cli --help
```

```text
Usage: deploy-cli <SUBCOMMAND>

My deployment CLI

Subcommands:
  deploy    Deploy the latest build
  rollback  Rollback to the previous release
```

### Subcommand names

Keys are the tokens users must type.

## `commandChained` — sequential stages

Splits a command into reusable steps with no extra user-visible token.

```ts
import {
  command,
  commandChained,
  operation,
  optionSingleValue,
  type,
} from "cli-kiss";

const authenticatedDeploy = commandChained(
  { description: "Authenticate then deploy" },
  // Stage 1: parse a --token option and forward the token as context
  operation(
    {
      options: {
        token: optionSingleValue({
          long: "token",
          type: type("SECRET"),
          description: "API token",
          valueNotDefined: function () {
            const t = process.env.API_TOKEN;
            if (!t) throw new Error("API_TOKEN env var is required");
            return t;
          },
        }),
      },
      positionals: [],
    },
    async (_ctx, { options: { token } }) => ({ token }),
  ),
  // Stage 2: receives { token } as context
  command(
    { description: "Deploy with auth token" },
    operation({ options: {}, positionals: [] }, async ({ token }) => {
      console.log(`Deploying with token: ${token}`);
    }),
  ),
);
```

All stages share a single flat usage — users see one combined command.

## `CommandInformation`

Every command accepts a metadata object:

| Field         | Type         | Description                                       |
| ------------- | ------------ | ------------------------------------------------- |
| `description` | `string`     | Short description shown in help output            |
| `hint`        | `string?`    | Note shown in parentheses next to the description |
| `details`     | `string[]?`  | Extra lines printed below the description         |
| `examples`    | `Example[]?` | Usage examples shown in the `Examples:` section   |

Each `Example` entry has:

| Field         | Type           | Description                                             |
| ------------- | -------------- | ------------------------------------------------------- |
| `explanation` | `string`       | Comment line shown above the example command            |
| `commandArgs` | `CommandArg[]` | Ordered list of arguments to render on the command line |

Each `CommandArg` is one of:

| Shape                                                                 | Renders as             |
| --------------------------------------------------------------------- | ---------------------- |
| `string`                                                              | literal text           |
| `{ positional: string }`                                              | positional label       |
| `{ subcommand: string }`                                              | subcommand name        |
| `{ option: { long: string; inlined?: string; separated?: string[] } }` | `--long[=val] [args]` |
| `{ option: { short: string; inlined?: string; separated?: string[] } }` | `-s[=val] [args]`    |

```ts
command(
  {
    description: "Deploy the application",
    hint: "experimental",
    details: [
      "Pushes to the configured remote.",
      "Runs migrations after push.",
    ],
    examples: [
      {
        explanation: "Deploy with a specific tag",
        commandArgs: [
          { positional: "v1.2.3" },
          { option: { long: "dry-run" } },
        ],
      },
    ],
  },
  deployOperation,
);
```

The `Examples:` section in `--help` output renders each entry as a comment
followed by the reconstructed command line:

```text
Examples:
 # Deploy with a specific tag
 deploy v1.2.3 --dry-run
```

# Commands

Commands are the building blocks of a `cli-kiss` CLI.

Three factory functions cover every use-case.

## `command` — leaf command

A leaf command has no subcommands. It directly runs an operation.

```ts
import { command, operation, positionalRequired, typeString } from "cli-kiss";

const greet = command(
  { description: "Greet a user" },
  operation(
    {
      options: {},
      positionals: [positionalRequired({ type: typeString, label: "NAME" })],
    },
    async (_ctx, { positionals: [name] }) => {
      console.log(`Hello, ${name}!`);
    },
  ),
);
```

### `CommandInformation`

Every command accepts a metadata object:

| Field         | Type        | Description                                       |
| ------------- | ----------- | ------------------------------------------------- |
| `description` | `string`    | Short description shown in help output            |
| `hint`        | `string?`   | Note shown in parentheses next to the description |
| `details`     | `string[]?` | Extra lines printed below the description         |

```ts
command(
  {
    description: "Deploy the application",
    hint: "experimental",
    details: [
      "Pushes to the configured remote.",
      "Runs migrations after push.",
    ],
  },
  deployOperation,
);
```

## `commandWithSubcommands` — dispatch to a subcommand

Use this when the user must pick one of several sub-actions.

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
  operation({ options: {}, positionals: [] }, async (_ctx) => ({
    db: "postgres://localhost/mydb",
  })),
  {
    deploy: command(
      { description: "Deploy the latest build" },
      operation({ options: {}, positionals: [] }, async (ctx) => {
        console.log(`Deploying with DB: ${ctx.db}`);
      }),
    ),
    rollback: command(
      { description: "Rollback to the previous release" },
      operation({ options: {}, positionals: [] }, async (ctx) => {
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

The keys of the subcommand map are the literal tokens users type. They must be
lowercase strings.

## `commandChained` — sequential stages

Use this to split a command into reusable steps without introducing a
user-visible subcommand token.

```ts
import {
  command,
  commandChained,
  operation,
  optionSingleValue,
  typeString,
} from "cli-kiss";

const authenticatedDeploy = commandChained(
  { description: "Authenticate then deploy" },
  // Stage 1: parse a --token option and forward the token as context
  operation(
    {
      options: {
        token: optionSingleValue({
          long: "token",
          type: typeString,
          description: "API token",
          default: () => {
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

The two stages' options and positionals are merged into a single flat usage
output — the user sees one combined command.

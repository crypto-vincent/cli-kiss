# Commands

Three factory functions cover every use-case.

## `operation` — bundle options, positionals, and a handler

`operation` is the core building block for command logic. It binds together
the options and positionals a command accepts, plus the async handler that
runs when parsing succeeds.

```ts
const myOperation = operation(
  {
    options: { /* named Option descriptors */ },
    positionals: [ /* ordered Positional descriptors */ ],
  },
  async function (context, { options, positionals }) {
    // your logic here
  },
);
```

The handler receives:

- `context` — forwarded unchanged from `runAndExit`
- `options` — an object keyed by the names declared in `options`
- `positionals` — a tuple of decoded values, in declaration order

`operation` is always passed to one of the command factories below.

## `command` — leaf command

No subcommands — directly executes an operation.

```ts
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

The user must pick one of several named sub-actions. The operation runs
first; its return value becomes the subcommand's context.

```ts
const rootCmd = commandWithSubcommands(
  { description: "My deployment CLI" },
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

```sh
deploy-cli --help
```

```text
Usage: deploy-cli <subcommand>

My deployment CLI

Subcommands:
  deploy    Deploy the latest build
  rollback  Rollback to the previous release
```

Subcommand keys are the tokens users type at the prompt.

## `commandChained` — sequential stages

Chains an operation and a command without consuming an extra token. The
operation runs first, and its return value becomes the next command's context.
Useful for splitting shared setup (authentication, config loading) from command
logic while keeping a flat usage line.

```ts
const authenticatedDeploy = commandChained(
  { description: "Authenticate then deploy" },
  // Stage 1: parse --token and expose it as context
  operation(
    {
      options: {
        token: optionSingleValue({
          long: "token",
          type: type("secret"),
          description: "API token",
          defaultIfNotSpecified: function () {
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

All stages share a single flat usage — users see one combined `--help` output.

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

| Shape                                                                   | Renders as            |
| ----------------------------------------------------------------------- | --------------------- |
| `string`                                                                | literal text          |
| `{ positional: string }`                                                | positional label      |
| `{ subcommand: string }`                                                | subcommand name       |
| `{ option: { long: string; inlined?: string; separated?: string[] } }`  | `--long[=val] [args]` |
| `{ option: { short: string; inlined?: string; separated?: string[] } }` | `-s[=val] [args]`     |

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

The `Examples:` section in `--help` renders each entry as a comment followed
by the reconstructed command line:

```text
Examples:
 # Deploy with a specific tag
 deploy v1.2.3 --dry-run
```

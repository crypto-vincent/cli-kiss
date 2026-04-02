# Running your CLI

## `runAndExit`

`runAndExit` parses arguments, runs the matched command, and exits.

```ts
await runAndExit(cliName, cliArgs, context, command, options?);
```

| Parameter | Type                     | Description                                       |
| --------- | ------------------------ | ------------------------------------------------- |
| `cliName` | `string`                 | Program name used in help and `--version` output  |
| `cliArgs` | `ReadonlyArray<string>`  | Raw arguments — typically `process.argv.slice(2)` |
| `context` | `Context`                | Value forwarded to every command handler          |
| `command` | `Command<Context, void>` | The root command                                  |
| `options` | `object?`                | See below                                         |

### Options

| Option         | Type                                        | Default        | Description                                                                                 |
| -------------- | ------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------- |
| `buildVersion` | `string?`                                   | —              | Enables `--version` flag; prints `<cliName> <buildVersion>`                                 |
| `usageOnHelp`  | `boolean?`                                  | `true`         | Enables `--help` flag                                                                       |
| `usageOnError` | `boolean?`                                  | `true`         | Prints usage to stderr when parsing fails                                                   |
| `colorSetup`   | `"flag"\|"env"\|"always"\|"never"\|"mock"?` | `"flag"`       | Color mode: `"flag"` adds a `--color` option; `"env"` reads env vars; others force the mode |
| `onError`      | `(error: unknown) => void`                  | —              | Custom handler for parse and execution errors                                               |
| `onExit`       | `(code: number) => never`                   | `process.exit` | Override for testing                                                                        |

### Exit codes

| Code | Reason                                  |
| ---- | --------------------------------------- |
| `0`  | Success, `--help`, or `--version`       |
| `1`  | Parse error or uncaught execution error |

## Full example

```ts
type Ctx = { db: string };

const deployCmd = command(
  { description: "Deploy to production" },
  operation(
    {
      options: {
        dryRun: optionFlag({ long: "dry-run", description: "Simulate only" }),
      },
      positionals: [],
    },
    async ({ db }, { options: { dryRun } }) => {
      if (dryRun) {
        console.log(`[dry-run] would deploy with DB: ${db}`);
      } else {
        console.log(`Deploying with DB: ${db}`);
      }
    },
  ),
);

const rootCmd = commandWithSubcommands(
  { description: "My deployment CLI" },
  operation(
    {
      options: {
        dbUrl: optionSingleValue({
          long: "db",
          type: typeUrl(),
          description: "Database URL",
          defaultWhenNotDefined: () => new URL("postgres://localhost/mydb"),
        }),
      },
      positionals: [],
    },
    async (_ctx, { options: { dbUrl } }): Promise<Ctx> => ({
      db: dbUrl.toString(),
    }),
  ),
  { deploy: deployCmd },
);

await runAndExit("my-cli", process.argv.slice(2), undefined, rootCmd, {
  buildVersion: "2.0.0",
});
```

Check it

```sh
my-cli --help
```

```text
Usage: my-cli <subcommand>

My deployment CLI

Subcommands:
  deploy  Deploy to production

Options:
  --db <url>  Database URL
```

Try it

```sh
my-cli deploy --dry-run
```

```text
[dry-run] would deploy with DB: postgres://localhost/mydb
```

## Color control

Colors are auto-detected by default (`colorSetup: "flag"` adds a `--color`
option). Override:

```ts
// Read from env vars (FORCE_COLOR, NO_COLOR), same as `--color=auto`
await runAndExit("my-cli", args, ctx, cmd, { colorSetup: "env" });
// Force colors on
await runAndExit("my-cli", args, ctx, cmd, { colorSetup: "always" });
// Force colors off (useful in CI)
await runAndExit("my-cli", args, ctx, cmd, { colorSetup: "never" });
```

## Testing your CLI

Override `onExit` to prevent process exit during tests:

```ts
const exitCodes: number[] = [];
await runAndExit("my-cli", ["--help"], undefined, myCommand, {
  colorSetup: "never",
  onExit: (code) => {
    exitCodes.push(code);
    return undefined as never;
  },
});
console.assert(exitCodes[0] === 0, "expected exit 0 for --help");
```

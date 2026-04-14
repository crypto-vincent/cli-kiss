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

| Option         | Type                                | Default        | Description                                                                                 |
| -------------- | ----------------------------------- | -------------- | ------------------------------------------------------------------------------------------- |
| `buildVersion`     | `string?`                           | —              | Enables `--version` flag; prints `<cliName> <buildVersion>`                                 |
| `usageOnHelp`      | `boolean?`                          | `true`         | Enables `--help` flag                                                                       |
| `usageOnError`     | `boolean?`                          | `true`         | Prints usage to stderr when parsing fails                                                   |
| `colorSetup`       | `flag` / `env` / `always` / `never` | `"flag"`       | Color mode: `"flag"` adds a `--color` option; `"env"` reads env vars; others force the mode |
| `completionSetup`  | `"flag"?`                           | —              | Enables shell auto-completion; adds `--completion` and `--get-completions` flags             |
| `onError`          | `(error: unknown) => void`          | —              | Custom handler for parse and execution errors                                               |
| `onExit`           | `(code: number) => never`           | `process.exit` | Override for testing                                                                        |

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
          fallbackValueIfAbsent: () => new URL("postgres://localhost/mydb"),
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

## Shell auto-completion

Enable tab-completion for bash, zsh, and fish with `completionSetup: "flag"`:

```ts
await runAndExit("my-cli", process.argv.slice(2), undefined, rootCmd, {
  buildVersion: "2.0.0",
  completionSetup: "flag", // adds --completion and --get-completions
});
```

This adds two hidden flags:

| Flag                          | Description                                                              |
| ----------------------------- | ------------------------------------------------------------------------ |
| `--completion [bash|zsh|fish]`  | Prints a shell completion script; source it in your shell init file       |
| `--get-completions -- <args>` | Returns one completion per line for the given typed args (used by scripts) |

### Install the completion script

```sh
# Bash — add to ~/.bashrc or ~/.bash_profile
source <(my-cli --completion bash)

# Zsh — add to ~/.zshrc
source <(my-cli --completion zsh)

# Fish — add to ~/.config/fish/config.fish
my-cli --completion fish | source
```

### How it works

Each generated script calls `my-cli --get-completions -- <typed-args>` on every
`<TAB>`. The shell passes all already-completed words (before the cursor) as
`<typed-args>`; the CLI walks its command tree and prints matching options and
subcommand names. The shell then filters the list by the current partial word.

When the cursor position is right after an option that expects a value (e.g.
`my-cli --format `) no completions are offered, since the expected input at that
position is the option's value, not a new flag or subcommand.

### Low-level API

You can also use the completion helpers directly:

```ts
import {
  getCompletions,
  generateCompletionScript,
  CompletionNode,
} from "cli-kiss";

// Build the static completion tree from your root command
const node: CompletionNode = rootCmd.generateCompletionNode();

// Get completions for an already-typed prefix (completedArgs excludes the partial word)
const completions: string[] = getCompletions(node, ["deploy"]);
// → ["--env", "--help", ...]

// Generate a shell completion script string
const script: string = generateCompletionScript("my-cli", "bash");
```


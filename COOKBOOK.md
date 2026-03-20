# cli-kiss Cookbook

A collection of practical recipes for building CLIs with **cli-kiss** — no
bloat, no dependencies, full-featured.

---

## Table of Contents

1. [Hello, World!](#1-hello-world)
2. [Adding a Version Flag](#2-adding-a-version-flag)
3. [Boolean Flags](#3-boolean-flags)
4. [Single-Value Options](#4-single-value-options)
5. [Repeatable Options](#5-repeatable-options)
6. [Required Positional Arguments](#6-required-positional-arguments)
7. [Optional Positional Arguments](#7-optional-positional-arguments)
8. [Variadic Positional Arguments](#8-variadic-positional-arguments)
9. [Built-in Types](#9-built-in-types)
10. [Enum Types with `typeOneOf`](#10-enum-types-with-typeoneof)
11. [Custom Types with `typeConverted`](#11-custom-types-with-typeconverted)
12. [Delimited Lists with `typeList`](#12-delimited-lists-with-typelist)
13. [Fixed-Length Tuples with `typeTuple`](#13-fixed-length-tuples-with-typetuple)
14. [Subcommands](#14-subcommands)
15. [Chained Commands](#15-chained-commands)
16. [Passing Context (Dependency Injection)](#16-passing-context-dependency-injection)
17. [Testing Your CLI](#17-testing-your-cli)

---

## 1. Hello, World!

The minimum viable CLI: a single command that prints a greeting.

```ts
import {
  command,
  operation,
  positionalRequired,
  runAsCliAndExit,
  typeString,
} from "cli-kiss";

const greetCommand = command(
  { description: "Greet someone" },
  operation(
    {
      options: {},
      positionals: [
        positionalRequired({
          type: typeString,
          label: "NAME",
          description: "The name to greet",
        }),
      ],
    },
    async (_ctx, { positionals: [name] }) => {
      console.log(`Hello, ${name}!`);
    },
  ),
);

await runAsCliAndExit("greet", process.argv.slice(2), undefined, greetCommand);
```

```
$ greet Alice
Hello, Alice!

$ greet --help
Usage: greet <NAME>

  Greet someone

Positionals:
  <NAME>   The name to greet
```

---

## 2. Adding a Version Flag

Pass `buildVersion` to automatically handle `--version`.

```ts
await runAsCliAndExit("greet", process.argv.slice(2), undefined, greetCommand, {
  buildVersion: "1.2.0",
});
```

```
$ greet --version
greet 1.2.0
```

---

## 3. Boolean Flags

Use `optionFlag` for options that are either present or absent.

```ts
import {
  command,
  operation,
  optionFlag,
  positionalRequired,
  runAsCliAndExit,
  typeString,
} from "cli-kiss";

const greetCommand = command(
  { description: "Greet someone" },
  operation(
    {
      options: {
        loud: optionFlag({
          long: "loud",
          short: "l",
          description: "Print the greeting in uppercase",
        }),
      },
      positionals: [positionalRequired({ type: typeString, label: "NAME" })],
    },
    async (_ctx, { options: { loud }, positionals: [name] }) => {
      const message = `Hello, ${name}!`;
      console.log(loud ? message.toUpperCase() : message);
    },
  ),
);

await runAsCliAndExit("greet", process.argv.slice(2), undefined, greetCommand);
```

```
$ greet Alice
Hello, Alice!

$ greet --loud Alice
HELLO, ALICE!

$ greet -l Alice
HELLO, ALICE!
```

> **Tip:** A flag can also be set with an explicit value: `--loud=true` /
> `--loud=false`.

---

## 4. Single-Value Options

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

### Making an option required

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

---

## 5. Repeatable Options

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

---

## 6. Required Positional Arguments

`positionalRequired` fails immediately if the argument is missing.

```ts
import {
  command,
  operation,
  positionalRequired,
  runAsCliAndExit,
  typeString,
} from "cli-kiss";

const copyCommand = command(
  { description: "Copy a file" },
  operation(
    {
      options: {},
      positionals: [
        positionalRequired({
          type: typeString,
          label: "SRC",
          description: "Source path",
        }),
        positionalRequired({
          type: typeString,
          label: "DEST",
          description: "Destination path",
        }),
      ],
    },
    async (_ctx, { positionals: [src, dest] }) => {
      console.log(`Copying ${src} → ${dest}`);
    },
  ),
);

await runAsCliAndExit("cp", process.argv.slice(2), undefined, copyCommand);
```

```
$ cp foo.txt bar.txt
Copying foo.txt → bar.txt

$ cp foo.txt
Error: <DEST>: Is required, but was not provided
```

---

## 7. Optional Positional Arguments

`positionalOptional` falls back to a default when the argument is omitted.

```ts
import {
  command,
  operation,
  positionalOptional,
  runAsCliAndExit,
  typeString,
} from "cli-kiss";

const greetCommand = command(
  { description: "Greet someone" },
  operation(
    {
      options: {},
      positionals: [
        positionalOptional({
          type: typeString,
          label: "NAME",
          description: "Name to greet",
          default: () => "World",
        }),
      ],
    },
    async (_ctx, { positionals: [name] }) => {
      console.log(`Hello, ${name}!`);
    },
  ),
);

await runAsCliAndExit("greet", process.argv.slice(2), undefined, greetCommand);
```

```
$ greet
Hello, World!

$ greet Alice
Hello, Alice!
```

---

## 8. Variadic Positional Arguments

`positionalVariadics` collects all remaining positional tokens into an array.

```ts
import {
  command,
  operation,
  positionalVariadics,
  runAsCliAndExit,
  typeString,
} from "cli-kiss";

const echoCommand = command(
  { description: "Echo words back" },
  operation(
    {
      options: {},
      positionals: [
        positionalVariadics({
          type: typeString,
          label: "WORD",
          description: "Words to echo",
        }),
      ],
    },
    async (_ctx, { positionals: [words] }) => {
      console.log(words.join(" "));
    },
  ),
);

await runAsCliAndExit("echo", process.argv.slice(2), undefined, echoCommand);
```

```
$ echo hello world
hello world

$ echo
(empty line)
```

### Using an end delimiter

Stop collecting variadic args at a sentinel token (e.g. `--`):

```ts
positionalVariadics({
  type: typeString,
  label: "ARG",
  endDelimiter: "--",
  description: "Arguments before --",
});
// my-cli a b -- c d  →  ["a", "b"]   (c and d are left in the stream)
```

---

## 9. Built-in Types

| Type          | TypeScript type | Accepts                                            |
| ------------- | --------------- | -------------------------------------------------- |
| `typeString`  | `string`        | Any string                                         |
| `typeBoolean` | `boolean`       | `true`, `yes`, `false`, `no` (insensitive)         |
| `typeNumber`  | `number`        | Integers, floats, scientific notation              |
| `typeInteger` | `bigint`        | Integer strings only                               |
| `typeDate`    | `Date`          | ISO 8601 strings and anything `Date.parse` accepts |
| `typeUrl`     | `URL`           | Absolute URLs                                      |

```ts
import {
  command,
  operation,
  optionSingleValue,
  positionalRequired,
  runAsCliAndExit,
  typeDate,
  typeInteger,
  typeNumber,
  typeUrl,
} from "cli-kiss";

const scheduleCommand = command(
  { description: "Schedule a job" },
  operation(
    {
      options: {
        workers: optionSingleValue({
          long: "workers",
          type: typeInteger,
          description: "Number of workers",
          default: () => 1n,
        }),
        rate: optionSingleValue({
          long: "rate",
          type: typeNumber,
          description: "Jobs per second",
          default: () => 1.0,
        }),
      },
      positionals: [
        positionalRequired({
          type: typeUrl,
          label: "ENDPOINT",
          description: "Target URL",
        }),
        positionalRequired({
          type: typeDate,
          label: "START",
          description: "Start date (ISO 8601)",
        }),
      ],
    },
    async (
      _ctx,
      { options: { workers, rate }, positionals: [endpoint, start] },
    ) => {
      console.log(`Scheduling ${rate} job/s on ${endpoint.href}`);
      console.log(
        `Starting on ${start.toDateString()} with ${workers} workers`,
      );
    },
  ),
);

await runAsCliAndExit(
  "schedule",
  process.argv.slice(2),
  undefined,
  scheduleCommand,
);
```

```
$ schedule https://api.example.com/jobs 2024-06-01 --workers 4 --rate 0.5
Scheduling 0.5 job/s on https://api.example.com/jobs
Starting on Sat Jun 01 2024 with 4 workers
```

---

## 10. Enum Types with `typeOneOf`

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

---

## 11. Custom Types with `typeConverted`

Chain an existing type with a transformation to build validated domain types.

```ts
import {
  command,
  operation,
  optionSingleValue,
  runAsCliAndExit,
  typeConverted,
  typeNumber,
} from "cli-kiss";

const typePort = typeConverted(typeNumber, {
  content: "Port",
  decoder: (n) => {
    if (!Number.isInteger(n) || n < 1 || n > 65535) {
      throw new Error(`${n} is not a valid port number`);
    }
    return n;
  },
});

const serveCommand = command(
  { description: "Start the server" },
  operation(
    {
      options: {
        port: optionSingleValue({
          long: "port",
          short: "p",
          type: typePort,
          label: "PORT",
          description: "Port to listen on",
          default: () => 3000,
        }),
      },
      positionals: [],
    },
    async (_ctx, { options: { port } }) => {
      console.log(`Listening on port ${port}`);
    },
  ),
);

await runAsCliAndExit("serve", process.argv.slice(2), undefined, serveCommand);
```

```
$ serve
Listening on port 3000

$ serve --port 8080
Listening on port 8080

$ serve --port 99999
Error: --port: <PORT>: Port: 99999 is not a valid port number
```

### Combining `typeOneOf` with `typeConverted`

Map a set of string keys to a richer TypeScript type:

```ts
import { typeConverted, typeOneOf } from "cli-kiss";

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const;
type LogLevel = (typeof LOG_LEVELS)[keyof typeof LOG_LEVELS];

const typeLogLevel = typeConverted(
  typeOneOf("LogLevel", Object.keys(LOG_LEVELS)),
  {
    content: "LogLevel",
    decoder: (key) => LOG_LEVELS[key as keyof typeof LOG_LEVELS] as LogLevel,
  },
);

// "--log-level warn"  →  2 (number)
```

---

## 12. Delimited Lists with `typeList`

Parse a comma-separated (or any-separator) string into an array in a single
option.

```ts
import {
  command,
  operation,
  optionSingleValue,
  runAsCliAndExit,
  typeList,
  typeString,
} from "cli-kiss";

const buildCommand = command(
  { description: "Build with feature flags" },
  operation(
    {
      options: {
        features: optionSingleValue({
          long: "features",
          type: typeList(typeString),
          label: "FEATURE,...",
          description: "Comma-separated feature flags",
          default: () => [],
        }),
      },
      positionals: [],
    },
    async (_ctx, { options: { features } }) => {
      console.log("Features:", features);
    },
  ),
);

await runAsCliAndExit("build", process.argv.slice(2), undefined, buildCommand);
```

```
$ build --features ssr,pwa,analytics
Features: [ 'ssr', 'pwa', 'analytics' ]
```

> **Note:** `typeList` uses `","` as the default separator. Pass a second
> argument to change it, e.g. `typeList(typeString, ":")` for colon-separated
> values.

> **Tip:** Prefer `optionRepeatable` when each value should be a separate flag
> (`--file a --file b`). Use `typeList` when a single delimited string is more
> ergonomic (`--files a,b`).

---

## 13. Fixed-Length Tuples with `typeTuple`

Parse a delimited string into a typed fixed-length array.

```ts
import {
  command,
  operation,
  positionalRequired,
  runAsCliAndExit,
  typeNumber,
  typeTuple,
} from "cli-kiss";

const typePoint = typeTuple([typeNumber, typeNumber]);

const plotCommand = command(
  { description: "Plot a 2-D point" },
  operation(
    {
      options: {},
      positionals: [
        positionalRequired({
          type: typePoint,
          label: "X,Y",
          description: "Coordinates as X,Y",
        }),
      ],
    },
    async (_ctx, { positionals: [[x, y]] }) => {
      console.log(`Point: (${x}, ${y})`);
    },
  ),
);

await runAsCliAndExit("plot", process.argv.slice(2), undefined, plotCommand);
```

```
$ plot 3.14,2.71
Point: (3.14, 2.71)

$ plot 3.14
Error: <X,Y>: Number,Number: Found 1 splits: Expected 2 splits from: "3.14"
```

---

## 14. Subcommands

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

---

## 15. Chained Commands

Use `commandChained` to compose two stages without a named subcommand token —
the output of the first stage becomes the input context of the second.

```ts
import {
  command,
  commandChained,
  operation,
  optionSingleValue,
  positionalRequired,
  runAsCliAndExit,
  typeString,
} from "cli-kiss";

// Stage 1: authenticate and produce a token payload.
const authOperation = operation(
  {
    options: {
      token: optionSingleValue({
        long: "token",
        type: typeString,
        description: "API token",
        default: () => {
          throw new Error("--token is required");
        },
      }),
    },
    positionals: [],
  },
  async (_ctx, { options: { token } }) => {
    // Validate and return the token for downstream use.
    return { token };
  },
);

// Stage 2: perform an authenticated action.
const uploadCommand = command(
  { description: "Upload a file (requires authentication)" },
  operation(
    {
      options: {},
      positionals: [
        positionalRequired({
          type: typeString,
          label: "FILE",
          description: "File to upload",
        }),
      ],
    },
    async ({ token }, { positionals: [file] }) => {
      console.log(`Uploading ${file} with token ${token}…`);
    },
  ),
);

const cli = commandChained(
  { description: "Authenticated upload" },
  authOperation,
  uploadCommand,
);

await runAsCliAndExit("uploader", process.argv.slice(2), undefined, cli);
```

```
$ uploader --token abc123 report.pdf
Uploading report.pdf with token abc123…

$ uploader report.pdf
Error: --token: Failed to get default value
```

---

## 16. Passing Context (Dependency Injection)

The `context` parameter of `runAsCliAndExit` flows unchanged to every command
handler. Use it to inject shared resources — loggers, database connections, HTTP
clients, etc. — without global state.

```ts
import {
  command,
  operation,
  positionalRequired,
  runAsCliAndExit,
  typeString,
} from "cli-kiss";

// Define your context type.
type AppContext = {
  logger: { info: (msg: string) => void };
  apiBaseUrl: string;
};

const getUserCommand = command(
  { description: "Fetch a user by ID" },
  operation(
    {
      options: {},
      positionals: [
        positionalRequired({
          type: typeString,
          label: "ID",
          description: "User ID",
        }),
      ],
    },
    async ({ logger, apiBaseUrl }, { positionals: [id] }) => {
      logger.info(`GET ${apiBaseUrl}/users/${id}`);
    },
  ),
);

const context: AppContext = {
  logger: { info: console.log },
  apiBaseUrl: "https://api.example.com",
};

await runAsCliAndExit("myapp", process.argv.slice(2), context, getUserCommand);
```

```
$ myapp 42
GET https://api.example.com/users/42
```

---

## 17. Testing Your CLI

cli-kiss is easy to unit-test because the entire parsing pipeline is pure and
composable. Use the `onExit`, `onLogStdOut`, and `onLogStdErr` hooks to capture
output and exit codes without spawning a subprocess.

```ts
import { expect, it } from "@jest/globals";
import {
  command,
  operation,
  optionFlag,
  positionalRequired,
  runAsCliAndExit,
  typeString,
} from "cli-kiss";

const greetCommand = command(
  { description: "Greet someone" },
  operation(
    {
      options: {
        loud: optionFlag({ long: "loud" }),
      },
      positionals: [positionalRequired({ type: typeString, label: "NAME" })],
    },
    async (_ctx, { options: { loud }, positionals: [name] }) => {
      const msg = `Hello, ${name}!`;
      console.log(loud ? msg.toUpperCase() : msg);
    },
  ),
);

async function runCli(args: string[]) {
  const stdout: string[] = [];
  const stderr: string[] = [];
  let exitCode = -1;

  await runAsCliAndExit("greet", args, undefined, greetCommand, {
    useTtyColors: false,
    onLogStdOut: (msg) => stdout.push(msg),
    onLogStdErr: (msg) => stderr.push(msg),
    onExit: (code) => {
      exitCode = code;
      return undefined as never;
    },
  });

  return { stdout, stderr, exitCode };
}

it("greets with the provided name", async () => {
  const result = await runCli(["Alice"]);
  expect(result.exitCode).toBe(0);
  expect(result.stdout).toEqual(["Hello, Alice!"]);
});

it("greets loudly with --loud", async () => {
  const result = await runCli(["--loud", "Bob"]);
  expect(result.exitCode).toBe(0);
  expect(result.stdout).toEqual(["HELLO, BOB!"]);
});

it("exits with code 1 when NAME is missing", async () => {
  const result = await runCli([]);
  expect(result.exitCode).toBe(1);
  expect(result.stderr.join("\n")).toContain("<NAME>: Is required");
});
```

> **Tip:** Use `useTtyColors: "mock"` instead of `false` when you want
> deterministic styled output in snapshot tests.

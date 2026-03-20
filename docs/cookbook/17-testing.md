# 17. Testing Your CLI

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

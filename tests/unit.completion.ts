import { expect, it } from "@jest/globals";
import {
  command,
  commandChained,
  commandWithSubcommands,
  generateCompletionScript,
  getCompletions,
  operation,
  optionFlag,
  optionRepeatable,
  optionSingleValue,
  positionalOptional,
  positionalRequired,
  runAndExit,
  type,
  typeChoice,
} from "../src";

// ---------------------------------------------------------------------------
// Shared command tree used across most tests
// ---------------------------------------------------------------------------

const buildCmd = command(
  { description: "Build command" },
  operation(
    {
      options: {
        verbose: optionFlag({ long: "verbose", short: "v" }),
        output: optionSingleValue({
          long: "output",
          short: "o",
          type: type("path"),
          defaultIfNotSpecified: () => "dist",
        }),
      },
      positionals: [
        positionalOptional({ type: type("file"), default: () => "index.ts" }),
      ],
    },
    async () => {},
  ),
);

const rootCommand = commandWithSubcommands(
  { description: "Root command" },
  operation(
    {
      options: {
        debug: optionFlag({ long: "debug", short: "d" }),
        format: optionSingleValue({
          long: "format",
          short: "f",
          type: typeChoice("fmt", ["json", "yaml"]),
          defaultIfNotSpecified: () => "json",
        }),
        tags: optionRepeatable({ long: "tag", short: "t", type: type("tag") }),
      },
      positionals: [],
    },
    async () => {},
  ),
  {
    build: buildCmd,
    deploy: command(
      { description: "Deploy command" },
      operation(
        {
          options: {
            env: optionSingleValue({
              long: "env",
              type: type("env"),
              defaultIfNotSpecified: () => "prod",
            }),
          },
          positionals: [
            positionalRequired({ type: typeChoice("target", ["k8s", "ecs"]) }),
          ],
        },
        async () => {},
      ),
    ),
  },
);

// ---------------------------------------------------------------------------
// getCompletions (pure function)
// ---------------------------------------------------------------------------

it("getCompletions", function () {
  const rootNode = rootCommand.generateCompletionNode();

  // empty args → root subcommands and their options
  expect(getCompletions(rootNode, [])).toEqual(
    expect.arrayContaining([
      "build",
      "deploy",
      "--debug",
      "-d",
      "--format",
      "-f",
      "--tag",
      "-t",
    ]),
  );
  expect(getCompletions(rootNode, [])).not.toContain("--verbose");
  expect(getCompletions(rootNode, [])).not.toContain("--output");

  // after known subcommand → that subcommand's options
  expect(getCompletions(rootNode, ["build"])).toEqual(
    expect.arrayContaining(["--verbose", "-v", "--output", "-o"]),
  );
  expect(getCompletions(rootNode, ["build"])).not.toContain("--debug");
  expect(getCompletions(rootNode, ["build"])).not.toContain("deploy");

  // flag before subcommand is skipped (--debug has no value)
  expect(getCompletions(rootNode, ["--debug", "build"])).toContain("--verbose");
  expect(getCompletions(rootNode, ["--debug", "build"])).not.toContain(
    "--debug",
  );

  // option-with-value + its value, before subcommand: both tokens consumed
  expect(getCompletions(rootNode, ["--format", "json", "build"])).toContain(
    "--verbose",
  );
  expect(getCompletions(rootNode, ["--format=json", "build"])).toContain(
    "--verbose",
  );
  expect(getCompletions(rootNode, ["-f", "json", "build"])).toContain(
    "--verbose",
  );

  // cursor IS on the value of an option-with-value (last completed arg has no following value)
  // → return [] so the shell doesn't offer subcommand/option names as values
  expect(getCompletions(rootNode, ["--format"])).toEqual([]);
  expect(getCompletions(rootNode, ["-f"])).toEqual([]);
  expect(getCompletions(rootNode, ["build", "--output"])).toEqual([]);
  expect(getCompletions(rootNode, ["build", "-o"])).toEqual([]);

  // inline value (--format=json) does NOT set awaitingOptionValue
  expect(getCompletions(rootNode, ["--format=json"])).not.toEqual([]);

  // unknown subcommand stays at root node
  expect(getCompletions(rootNode, ["unknown"])).toContain("--debug");
  expect(getCompletions(rootNode, ["unknown"])).toContain("build");

  // leaf command: own options, no subcommands
  const leafNode = buildCmd.generateCompletionNode();
  expect(getCompletions(leafNode, [])).toEqual(
    expect.arrayContaining(["--verbose", "-v", "--output", "-o"]),
  );
  expect(getCompletions(leafNode, [])).not.toContain("build");

  // commandChained merges options from both levels
  const chained = commandChained(
    { description: "Chained" },
    operation(
      { options: { dbg: optionFlag({ long: "dbg" }) }, positionals: [] },
      async (ctx) => ctx,
    ),
    buildCmd,
  );
  const chainedNode = chained.generateCompletionNode();
  expect(getCompletions(chainedNode, [])).toContain("--dbg");
  expect(getCompletions(chainedNode, [])).toContain("--verbose");
  expect(getCompletions(chainedNode, [])).toContain("--output");
});

// ---------------------------------------------------------------------------
// generateCompletionScript (pure function)
// ---------------------------------------------------------------------------

it("generateCompletionScript", function () {
  const bash = generateCompletionScript("my-cli", "bash");
  expect(bash).toContain("_my_cli_completion()");
  expect(bash).toContain("complete -F _my_cli_completion my-cli");
  expect(bash).toContain("--get-completions");
  expect(bash).toContain("COMPREPLY");

  const zsh = generateCompletionScript("my-cli", "zsh");
  expect(zsh).toContain("#compdef my-cli");
  expect(zsh).toContain("_my_cli()");
  expect(zsh).toContain("compadd");
  expect(zsh).toContain("--get-completions");

  const fish = generateCompletionScript("my-cli", "fish");
  expect(fish).toContain("complete -c my-cli");
  expect(fish).toContain("--get-completions");
  expect(fish).toContain("commandline");

  // special chars in the CLI name are sanitized to underscores
  const sanitized = generateCompletionScript("my-awesome-cli", "bash");
  expect(sanitized).toContain("_my_awesome_cli_completion");
  expect(sanitized).not.toContain("-my-awesome-cli");
});

// ---------------------------------------------------------------------------
// runAndExit integration
// ---------------------------------------------------------------------------

it("runAndExit completion", async function () {
  // --completion <shell> prints the right script and exits 0
  await testCompletion("bash", ["_my_cli_completion", "complete -F"]);
  await testCompletion("zsh", ["#compdef my-cli"]);
  await testCompletion("fish", ["complete -c my-cli"]);

  // --completion without a shell argument defaults to bash
  await testCompletion("", ["bash"]);

  // --get-completions at the root level includes all top-level tokens
  await testGetCompletionsRun(
    [],
    [
      "build",
      "deploy",
      "--debug",
      "--help",
      "--version",
      "--completion",
      "--color",
    ],
    [],
  );

  // --get-completions after a subcommand shows only that subcommand's options
  await testGetCompletionsRun(
    ["build"],
    ["--verbose", "--output"],
    ["deploy", "--debug"],
  );

  // --get-completions with cursor on an option value → no completions offered
  await testGetCompletionsRun(["--format"], [], ["--debug", "build"]);
  await testGetCompletionsRun(["-f"], [], ["--debug", "build"]);
  await testGetCompletionsRun(["build", "--output"], [], ["--verbose"]);

  // --get-completions with partial/unknown input does not produce a parse error
  await testGetCompletionsRun(["--invalid-partial"], [], []);

  // --get-completions for a commandChained root: options from both stages are present
  const chainedRoot = commandChained(
    { description: "Chained root" },
    operation(
      { options: { dbg: optionFlag({ long: "dbg" }) }, positionals: [] },
      async (ctx) => ctx,
    ),
    buildCmd,
  );
  await testGetCompletionsRunWith(
    chainedRoot,
    [],
    ["--dbg", "--verbose", "--output"],
    [],
  );

  // completionSetup not enabled → --completion is an unknown option → exit 1
  await testCompletionDisabled();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function testCompletion(
  shellArg: string,
  expectedScriptParts: Array<string>,
) {
  const args = shellArg === "" ? ["--completion"] : ["--completion", shellArg];
  const onLogStdOut = makeMocked<string, void>([null as unknown as void]);
  const onLogStdErr = makeMocked<string, void>([]);
  const onExit = makeMocked<number, never>([null as never]);
  console.log = onLogStdOut.call;
  console.error = onLogStdErr.call;
  await runAndExit("my-cli", args, null, rootCommand, {
    completionSetup: "flag",
    onExit: onExit.call,
  });
  expect(onLogStdOut.history).toHaveLength(1);
  for (const part of expectedScriptParts) {
    expect(onLogStdOut.history[0]).toContain(part);
  }
  expect(onExit.history).toEqual([0]);
}

async function testGetCompletionsRun(
  completedArgs: Array<string>,
  expectedToContain: Array<string>,
  expectedNotToContain: Array<string>,
) {
  await testGetCompletionsRunWith(
    rootCommand,
    completedArgs,
    expectedToContain,
    expectedNotToContain,
  );
}

async function testGetCompletionsRunWith(
  cmd: Parameters<typeof runAndExit>[3],
  completedArgs: Array<string>,
  expectedToContain: Array<string>,
  expectedNotToContain: Array<string>,
) {
  const onLogStdOut = makeMocked<string, void>(
    Array(100).fill(null as unknown as void),
  );
  const onLogStdErr = makeMocked<string, void>([]);
  const onExit = makeMocked<number, never>([null as never]);
  console.log = onLogStdOut.call;
  console.error = onLogStdErr.call;
  await runAndExit(
    "my-cli",
    ["--get-completions", "--", ...completedArgs],
    null,
    cmd,
    {
      completionSetup: "flag",
      buildVersion: "1.0.0",
      onExit: onExit.call,
    },
  );
  if (expectedToContain.length > 0) {
    expect(onLogStdOut.history).toEqual(
      expect.arrayContaining(expectedToContain),
    );
  }
  for (const item of expectedNotToContain) {
    expect(onLogStdOut.history).not.toContain(item);
  }
  expect(onExit.history).toEqual([0]);
}

async function testCompletionDisabled() {
  const onLogStdOut = makeMocked<string, void>([]);
  const onLogStdErr = makeMocked<string, void>([
    null as unknown as void,
    null as unknown as void,
  ]);
  const onExit = makeMocked<number, never>([null as never]);
  console.log = onLogStdOut.call;
  console.error = onLogStdErr.call;
  await runAndExit("my-cli", ["--completion", "bash"], null, rootCommand, {
    // completionSetup is NOT set → --completion is an unknown option
    onExit: onExit.call,
  });
  expect(onLogStdErr.history.some((e) => e.includes("--completion"))).toBe(
    true,
  );
  expect(onExit.history).toEqual([1]);
}

function makeMocked<P, R>(returns: Array<R>) {
  const history = new Array<P>();
  return {
    history,
    call(p: P) {
      history.push(p);
      if (history.length > returns.length) {
        throw new Error(
          `Mocked function called more times than expected. History: ${JSON.stringify(
            history,
          )}, returns: ${JSON.stringify(returns)}`,
        );
      }
      return returns[history.length - 1]!;
    },
  };
}

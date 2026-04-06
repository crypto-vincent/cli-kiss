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

const subCommand = command(
  { description: "Sub command" },
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
    build: subCommand,
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
// getCompletions
// ---------------------------------------------------------------------------

it("getCompletions - empty args returns root subcommands and options", function () {
  const node = rootCommand.generateCompletionNode();
  const completions = getCompletions(node, []);
  expect(completions).toEqual(
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
  // Should NOT include subcommand-specific options at root level
  expect(completions).not.toContain("--verbose");
  expect(completions).not.toContain("--output");
});

it("getCompletions - after subcommand returns that subcommand's options", function () {
  const node = rootCommand.generateCompletionNode();
  const completions = getCompletions(node, ["build"]);
  expect(completions).toEqual(
    expect.arrayContaining(["--verbose", "-v", "--output", "-o"]),
  );
  // Should NOT include root-level subcommands or root-only options
  expect(completions).not.toContain("build");
  expect(completions).not.toContain("deploy");
  expect(completions).not.toContain("--debug");
});

it("getCompletions - root options before subcommand are skipped correctly", function () {
  const node = rootCommand.generateCompletionNode();
  // User typed: --debug build  (--debug is a flag, no value; then entered "build")
  const completions = getCompletions(node, ["--debug", "build"]);
  expect(completions).toContain("--verbose");
  expect(completions).not.toContain("--debug");
});

it("getCompletions - root option with value before subcommand is skipped correctly", function () {
  const node = rootCommand.generateCompletionNode();
  // User typed: --format json build
  const completions = getCompletions(node, ["--format", "json", "build"]);
  expect(completions).toContain("--verbose");
  expect(completions).not.toContain("--format");
});

it("getCompletions - inline option value (--format=json) does not consume next arg", function () {
  const node = rootCommand.generateCompletionNode();
  const completions = getCompletions(node, ["--format=json", "build"]);
  expect(completions).toContain("--verbose");
});

it("getCompletions - unknown subcommand stays at root node", function () {
  const node = rootCommand.generateCompletionNode();
  const completions = getCompletions(node, ["unknown"]);
  // Unknown word is treated as a positional — stays at root
  expect(completions).toContain("--debug");
  expect(completions).toContain("build");
});

it("getCompletions - end-of-options marker (--) stops option processing", function () {
  const node = rootCommand.generateCompletionNode();
  const completions = getCompletions(node, ["--"]);
  // After --, we can't really do option completions. But the node stays the same.
  expect(Array.isArray(completions)).toBe(true);
});

it("getCompletions - short option with value is skipped", function () {
  const node = rootCommand.generateCompletionNode();
  // -f is short for --format which takes a value
  const completions = getCompletions(node, ["-f", "json", "build"]);
  expect(completions).toContain("--verbose");
});

it("getCompletions - leaf command returns its own options", function () {
  const node = subCommand.generateCompletionNode();
  const completions = getCompletions(node, []);
  expect(completions).toEqual(
    expect.arrayContaining(["--verbose", "-v", "--output", "-o"]),
  );
  // Leaf command has no subcommands
  expect(completions).not.toContain("build");
});

// ---------------------------------------------------------------------------
// generateCompletionNode on commandChained
// ---------------------------------------------------------------------------

it("generateCompletionNode on commandChained merges options", function () {
  const chained = commandChained(
    { description: "Chained" },
    operation(
      {
        options: { debug: optionFlag({ long: "debug" }) },
        positionals: [],
      },
      async (ctx) => ctx,
    ),
    subCommand,
  );
  const node = chained.generateCompletionNode();
  const completions = getCompletions(node, []);
  expect(completions).toContain("--debug");
  expect(completions).toContain("--verbose");
  expect(completions).toContain("--output");
});

// ---------------------------------------------------------------------------
// generateCompletionScript
// ---------------------------------------------------------------------------

it("generateCompletionScript - bash contains function and complete call", function () {
  const script = generateCompletionScript("my-cli", "bash");
  expect(script).toContain("_my_cli_completion()");
  expect(script).toContain("complete -F _my_cli_completion my-cli");
  expect(script).toContain("--get-completions");
  expect(script).toContain("COMPREPLY");
});

it("generateCompletionScript - zsh contains compdef", function () {
  const script = generateCompletionScript("my-cli", "zsh");
  expect(script).toContain("#compdef my-cli");
  expect(script).toContain("_my_cli()");
  expect(script).toContain("compadd");
  expect(script).toContain("--get-completions");
});

it("generateCompletionScript - fish contains complete command", function () {
  const script = generateCompletionScript("my-cli", "fish");
  expect(script).toContain("complete -c my-cli");
  expect(script).toContain("--get-completions");
  expect(script).toContain("commandline");
});

it("generateCompletionScript - special chars in cli name are sanitized", function () {
  const bashScript = generateCompletionScript("my-awesome-cli", "bash");
  expect(bashScript).toContain("_my_awesome_cli_completion");
  expect(bashScript).not.toContain("-my-awesome-cli");
});

// ---------------------------------------------------------------------------
// runAndExit integration
// ---------------------------------------------------------------------------

it("runAndExit - --completion bash outputs bash script", async function () {
  const exits: Array<number> = [];
  await runAndExit("my-cli", ["--completion", "bash"], null, rootCommand, {
    completionSetup: "flag",
    onExit: (code) => {
      exits.push(code);
      return null as never;
    },
    onError: (e) => {
      throw e;
    },
  });
  // Capture via mocking console.log
  // Since we can't easily mock console.log before runAndExit, test via separate mock approach
  expect(exits).toEqual([0]);
});

it("runAndExit - --completion bash via mocked console prints script and exits 0", async function () {
  const captured: Array<string> = [];
  const exits: Array<number> = [];
  const origLog = console.log;
  console.log = (msg: string) => {
    captured.push(msg);
  };
  try {
    await runAndExit("my-cli", ["--completion", "bash"], null, rootCommand, {
      completionSetup: "flag",
      onExit: (code) => {
        exits.push(code);
        return null as never;
      },
    });
  } finally {
    console.log = origLog;
  }
  expect(exits).toEqual([0]);
  expect(captured).toHaveLength(1);
  expect(captured[0]).toContain("_my_cli_completion");
  expect(captured[0]).toContain("complete -F");
});

it("runAndExit - --completion zsh outputs zsh script", async function () {
  const captured: Array<string> = [];
  const exits: Array<number> = [];
  const origLog = console.log;
  console.log = (msg: string) => {
    captured.push(msg);
  };
  try {
    await runAndExit("my-cli", ["--completion", "zsh"], null, rootCommand, {
      completionSetup: "flag",
      onExit: (code) => {
        exits.push(code);
        return null as never;
      },
    });
  } finally {
    console.log = origLog;
  }
  expect(exits).toEqual([0]);
  expect(captured[0]).toContain("#compdef my-cli");
});

it("runAndExit - --completion without shell defaults to bash", async function () {
  const captured: Array<string> = [];
  const exits: Array<number> = [];
  const origLog = console.log;
  console.log = (msg: string) => {
    captured.push(msg);
  };
  try {
    await runAndExit("my-cli", ["--completion"], null, rootCommand, {
      completionSetup: "flag",
      onExit: (code) => {
        exits.push(code);
        return null as never;
      },
    });
  } finally {
    console.log = origLog;
  }
  expect(exits).toEqual([0]);
  expect(captured[0]).toContain("bash");
});

it("runAndExit - --get-completions returns root completions for empty args", async function () {
  const captured: Array<string> = [];
  const exits: Array<number> = [];
  const origLog = console.log;
  console.log = (msg: string) => {
    captured.push(msg);
  };
  try {
    await runAndExit("my-cli", ["--get-completions", "--"], null, rootCommand, {
      completionSetup: "flag",
      buildVersion: "1.0.0",
      onExit: (code) => {
        exits.push(code);
        return null as never;
      },
    });
  } finally {
    console.log = origLog;
  }
  expect(exits).toEqual([0]);
  expect(captured).toContain("build");
  expect(captured).toContain("deploy");
  expect(captured).toContain("--debug");
  expect(captured).toContain("--help");
  expect(captured).toContain("--version");
  expect(captured).toContain("--completion");
  expect(captured).toContain("--color");
});

it("runAndExit - --get-completions after subcommand returns subcommand options", async function () {
  const captured: Array<string> = [];
  const exits: Array<number> = [];
  const origLog = console.log;
  console.log = (msg: string) => {
    captured.push(msg);
  };
  try {
    await runAndExit(
      "my-cli",
      ["--get-completions", "--", "build"],
      null,
      rootCommand,
      {
        completionSetup: "flag",
        buildVersion: "1.0.0",
        onExit: (code) => {
          exits.push(code);
          return null as never;
        },
      },
    );
  } finally {
    console.log = origLog;
  }
  expect(exits).toEqual([0]);
  expect(captured).toContain("--verbose");
  expect(captured).toContain("--output");
  // Root-level subcommands should not be present
  expect(captured).not.toContain("deploy");
});

it("runAndExit - --get-completions works with partial invalid args (no parse error)", async function () {
  const captured: Array<string> = [];
  const exits: Array<number> = [];
  const errors: Array<unknown> = [];
  const origLog = console.log;
  console.log = (msg: string) => {
    captured.push(msg);
  };
  try {
    await runAndExit(
      "my-cli",
      ["--get-completions", "--", "--invalid-partial"],
      null,
      rootCommand,
      {
        completionSetup: "flag",
        onExit: (code) => {
          exits.push(code);
          return null as never;
        },
        onError: (e) => {
          errors.push(e);
        },
      },
    );
  } finally {
    console.log = origLog;
  }
  // Must not error out — completion should work with partial/invalid input
  expect(errors).toEqual([]);
  expect(exits).toEqual([0]);
});

it("runAndExit - completion flags are not active when completionSetup is not set", async function () {
  const captured: Array<string> = [];
  const exits: Array<number> = [];
  const errors: Array<string> = [];
  const origLog = console.log;
  const origErr = console.error;
  console.log = (msg: string) => {
    captured.push(msg);
  };
  console.error = (msg: string) => {
    errors.push(msg);
  };
  try {
    await runAndExit("my-cli", ["--completion", "bash"], null, rootCommand, {
      // completionSetup is NOT set → --completion is unknown
      onExit: (code) => {
        exits.push(code);
        return null as never;
      },
    });
  } finally {
    console.log = origLog;
    console.error = origErr;
  }
  // Should fail with "unknown option" error
  expect(exits).toEqual([1]);
  expect(errors.some((e) => e.includes("--completion"))).toBe(true);
});

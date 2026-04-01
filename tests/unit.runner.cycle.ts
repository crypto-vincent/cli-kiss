import { it } from "@jest/globals";
import {
  command,
  commandWithSubcommands,
  operation,
  optionFlag,
  optionRepeatable,
  optionSingleValue,
  positionalOptional,
  positionalRequired,
  positionalVariadics,
  runAndExit,
  typeMapped,
  typeNamed,
  typeOneOf,
  typeString,
  typeUrl,
} from "../src";

it("run", async function () {
  const rootUsage = [
    "Usage: my-cli <required1> <subcommand>",
    "",
    "Root Description",
    "",
    "Positionals:",
    "  <required1>  Required1 positional description",
    "",
    "Subcommands:",
    "  subcommand  Subcommand Description",
    "",
    "Options:",
    "  --flag[=no]                    Option flag description",
    "  --repeatable <string> [*]      Option repeatable description",
    "  --single-value <enum(number)>  Option single value description",
    "",
  ].join("\n");
  const subcommandUsage = [
    "Usage: my-cli <required1> subcommand <required2> [optional] [variadic]...",
    "",
    "Subcommand Description",
    "",
    "Positionals:",
    "  <required1>    Required1 positional description",
    "  <required2>    Required2 positional description",
    "  [optional]     Optional positional description",
    "  [variadic]...  Variadics positional description",
    "",
    "Options:",
    "  --flag[=no]                    Option flag description",
    "  --repeatable <string> [*]      Option repeatable description",
    "  --single-value <enum(number)>  Option single value description",
    "  --url <url> [*]                Option url description",
    "",
  ].join("\n");

  // Test that everything could work normally
  await testCase(
    ["required1", "subcommand", "required2"],
    ["Has executed root command", "Has executed subcommand"],
    [],
    0,
  );

  // Check that version flag takes precedence over execution
  await testCase(["--version"], ["my-cli 1.0.0"], [], 0);
  await testCase(["required1", "--version"], ["my-cli 1.0.0"], [], 0);
  await testCase(
    ["required1", "subcommand", "--version"],
    ["my-cli 1.0.0"],
    [],
    0,
  );
  await testCase(
    ["required1", "subcommand", "required2", "--version"],
    ["my-cli 1.0.0"],
    [],
    0,
  );

  // Check that help flag takes precedence over execution
  await testCase(["--help"], [rootUsage], [], 0);
  await testCase(["required1", "--help"], [rootUsage], [], 0);
  await testCase(
    ["required1", "subcommand", "--help"],
    [subcommandUsage],
    [],
    0,
  );
  await testCase(
    ["required1", "subcommand", "required2", "--help"],
    [subcommandUsage],
    [],
    0,
  );

  // Help takes precedence over version
  await testCase(["--version", "--help"], [rootUsage], [], 0);
  await testCase(["--help", "--version"], [rootUsage], [], 0);

  // Weird help/version values inputs
  await testCase(
    ["--help=invalid"],
    [],
    [rootUsage, `Error: --help: boolean: Invalid value: "invalid"`],
    1,
  );
  await testCase(
    ["--version=invalid"],
    [],
    [rootUsage, `Error: --version: boolean: Invalid value: "invalid"`],
    1,
  );

  // Test color flag exists and is parsed on top of regular flags and env
  process.env["FORCE_COLOR"] = "1";
  await testCase(["--color=never", "--help"], [rootUsage], [], 0, "auto");
  await testCase(["--help", "--color=never"], [rootUsage], [], 0, "auto");
  delete process.env["FORCE_COLOR"];

  // TODO - better testing in a separate test file for color modes and flag
  process.env["FORCE_COLOR"] = "0";
  await testCase(["--color=auto", "--help"], [rootUsage], [], 0, "auto");
  await testCase(["--help", "--color=auto"], [rootUsage], [], 0, "auto");
  delete process.env["FORCE_COLOR"];

  // Colorless output should not match when color is enabled
  mustFail(async () => {
    await testCase(["--color=always", "--help"], [rootUsage], [], 0, "auto");
  });
  mustFail(async () => {
    await testCase(["--color=mock", "--help"], [rootUsage], [], 0, "auto");
  });
  mustFail(async () => {
    await testCase(["--color=auto", "--help"], [rootUsage], [], 0, "auto");
  });
  mustFail(async () => {
    await testCase(["--color", "--help"], [rootUsage], [], 0, "auto");
  });

  // Check that color flag is properly gated
  await testCase(
    ["--color=auto"],
    [],
    [rootUsage, "Error: Unexpected unknown option: --color"],
    1,
    "never",
  );
  process.env["NO_COLOR"] = "";
  await testCase(
    ["--color=invalid"],
    [],
    [
      rootUsage,
      `Error: --color: <color-mode>: Invalid value: "invalid" (expected one of: "auto" | "always" | "never"...)`,
    ],
    1,
    "auto",
  );
  await testCase(
    ["--color=auto"],
    [],
    [rootUsage, "Error: Unexpected unknown option: --color"],
    1,
    "env",
  );
  delete process.env["NO_COLOR"];

  // Test multiple errors at once (first one should show only)
  await testCase(
    ["--invalid1", "--invalid2", "required1", "--invalid3"],
    [],
    [rootUsage, "Error: Unexpected unknown option: --invalid1"],
    1,
  );
  await testCase(
    ["required1", "unknown", "-wut", "--flag", "--single-value"],
    [],
    [rootUsage, 'Error: <subcommand>: Invalid value: "unknown"'],
    1,
  );

  // Test missing required inputs
  await testCase(
    [],
    [],
    [rootUsage, "Error: <required1>: Is required, but was not provided"],
    1,
  );
  await testCase(
    ["required1"],
    [],
    [rootUsage, "Error: <subcommand>: Is required, but was not provided"],
    1,
  );
  await testCase(
    ["required1", "subcommand"],
    [],
    [subcommandUsage, "Error: <required2>: Is required, but was not provided"],
    1,
  );

  // Test that flags become available when subcommand is known
  await testCase(
    ["--url", "https://example.com"],
    [],
    [rootUsage, "Error: Unexpected unknown option: --url"],
    1,
  );
  await testCase(
    ["required1", "--url", "https://example.com"],
    [],
    [rootUsage, "Error: Unexpected unknown option: --url"],
    1,
  );
  await testCase(
    ["required1", "subcommand", "--url", "https://example.com"],
    [],
    [subcommandUsage, "Error: <required2>: Is required, but was not provided"],
    1,
  );
  await testCase(
    ["required1", "subcommand", "required2", "--url", "https://example.com"],
    ["Has executed root command", "Has executed subcommand"],
    [],
    0,
  );

  // Test option as flag parsing cases
  await testCase(
    ["--flag", "--flag", "required1", "subcommand", "required2"],
    [],
    [subcommandUsage, "Error: --flag: Must not be set multiple times"],
    1,
  );
  await testCase(
    ["--flag=42", "required1", "subcommand", "required2"],
    [],
    [subcommandUsage, 'Error: --flag: boolean: Invalid value: "42"'],
    1,
  );
  await testCase(
    ["--flag=no", "required1", "subcommand", "required2"],
    ["Has executed root command", "Has executed subcommand"],
    [],
    0,
  );
  await testCase(
    ["--flag=yes", "required1", "subcommand", "required2"],
    ["Has executed root command", "Has executed subcommand"],
    [],
    0,
  );
  await testCase(
    ["--flag", "required1", "subcommand", "required2"],
    ["Has executed root command", "Has executed subcommand"],
    [],
    0,
  );
  await testCase(
    ["--no-flag", "required1", "subcommand", "required2"],
    ["Has executed root command", "Has executed subcommand"],
    [],
    0,
  );

  // Test option parsing errors
  await testCase(
    ["--invalid", "required1", "subcommand", "required2"],
    [],
    [rootUsage, "Error: Unexpected unknown option: --invalid"],
    1,
  );
  await testCase(
    ["required1", "subcommand", "required2", "--nope"],
    [],
    [subcommandUsage, "Error: Unexpected unknown option: --nope"],
    1,
  );
  await testCase(
    ["required1", "subcommand", "required2", "--url"],
    [],
    [subcommandUsage, "Error: --url: Requires a value, but got end of input"],
    1,
  );
  await testCase(
    ["required1", "subcommand", "required2", "--url", "--", "url"],
    [],
    [subcommandUsage, 'Error: --url: Requires a value before "--"'],
    1,
  );
  await testCase(
    ["required1", "subcommand", "required2", "--url", "--url"],
    [],
    [subcommandUsage, 'Error: --url: Requires a value, but got: "--url"'],
    1,
  );

  // Test invalid positional type value (should keep parsing best-effort even on invalid values)
  await testCase(
    ["invalid"],
    [],
    [rootUsage, "Error: <subcommand>: Is required, but was not provided"],
    1,
  );
  await testCase(
    ["invalid", "subcommand"],
    [],
    [
      subcommandUsage,
      'Error: <required1>: Invalid value: "invalid" (expected one of: "required1" | "required1-bis")',
    ],
    1,
  );
  await testCase(
    ["invalid", "subcommand", "required2"],
    [],
    [
      subcommandUsage,
      'Error: <required1>: Invalid value: "invalid" (expected one of: "required1" | "required1-bis")',
    ],
    1,
  );
  await testCase(
    ["required1", "subcommand", "invalid"],
    [],
    [
      subcommandUsage,
      'Error: <required2>: Invalid value: "invalid" (expected one of: "required2" | "required2-bis")',
    ],
    1,
  );
  await testCase(
    ["invalid", "subcommand", "invalid"],
    [],
    [
      subcommandUsage,
      'Error: <required1>: Invalid value: "invalid" (expected one of: "required1" | "required1-bis")',
    ],
    1,
  );

  // Test root command option invalid values (must not block parsing)
  await testCase(
    ["--single-value=dodo", "required1", "subcommand", "required2"],
    [],
    [
      subcommandUsage,
      'Error: --single-value: <enum(number)>: from: enum(string): Invalid value: "dodo" (expected one of: "42" | "43")',
    ],
    1,
  );
  await testCase(
    ["required1", "subcommand", "required2", "--single-value=44"],
    [],
    [
      subcommandUsage,
      'Error: --single-value: <enum(number)>: from: enum(string): Invalid value: "44" (expected one of: "42" | "43")',
    ],
    1,
  );

  // Test subcommand-only option failures
  await testCase(
    ["--url", "not-a-url", "required1", "subcommand", "required2"],
    [],
    [rootUsage, "Error: Unexpected unknown option: --url"],
    1,
  );
  await testCase(
    ["required1", "subcommand", "required2", "--url", "not-a-url"],
    [],
    [subcommandUsage, 'Error: --url: <url>: Unable to parse: "not-a-url"'],
    1,
  );

  // Test option multiple value parsing cases
  await testCase(
    [
      "required1",
      "subcommand",
      "required2",
      "--repeatable=42",
      "--repeatable",
      "43",
    ],
    ["Has executed root command", "Has executed subcommand"],
    [],
    0,
  );
  await testCase(
    [
      "required1",
      "subcommand",
      "required2",
      "--single-value=42",
      "--single-value",
      "43",
    ],
    [],
    [
      subcommandUsage,
      "Error: --single-value: Requires a single value, but got multiple",
    ],
    1,
  );
});

async function testCase(
  args: Array<string>,
  expectStdOut: Array<string>,
  expectStdErr: Array<string>,
  expectExit: number,
  colorMode?: "auto" | "env" | "always" | "never" | "mock",
) {
  const onLogStdOut = makeMocked<string, void>([
    null as unknown as void,
    null as unknown as void,
  ]);
  const onLogStdErr = makeMocked<string, void>([
    null as unknown as void,
    null as unknown as void,
  ]);
  const onExit = makeMocked<number, never>([null as never]);
  const cmd = commandWithSubcommands<null, void, void>(
    { description: "Root Description" },
    operation(
      {
        options: {
          optionFlag: optionFlag({
            long: "flag",
            description: "Option flag description",
          }),
          optionRepeatable: optionRepeatable({
            long: "repeatable",
            type: typeString,
            description: "Option repeatable description",
          }),
          optionSingleValue: optionSingleValue({
            long: "single-value",
            type: typeMapped(typeOneOf("enum(string)", ["42", "43"]), {
              content: "enum(number)",
              decoder: (value) => Number(value),
            }),
            description: "Option single value description",
            default: () => 42,
          }),
        },
        positionals: [
          positionalRequired({
            type: typeOneOf("required1", ["required1", "required1-bis"]),
            description: "Required1 positional description",
          }),
        ],
      },
      async function (_, _inputs) {
        console.log(`Has executed root command`);
      },
    ),
    {
      subcommand: command(
        { description: "Subcommand Description" },
        operation(
          {
            options: {
              optionExtra: optionRepeatable({
                long: "url",
                description: "Option url description",
                type: typeUrl,
              }),
            },
            positionals: [
              positionalRequired({
                type: typeOneOf("required2", ["required2", "required2-bis"]),
                description: "Required2 positional description",
              }),
              positionalOptional({
                type: typeNamed(typeString, "optional"),
                description: "Optional positional description",
                default: () => "world !",
              }),
              positionalVariadics({
                type: typeNamed(typeString, "variadic"),
                description: "Variadics positional description",
              }),
            ],
          },
          async function (_, _inputs) {
            console.log(`Has executed subcommand`);
          },
        ),
      ),
    },
  );
  console.log = onLogStdOut.call;
  console.error = onLogStdErr.call;
  await runAndExit("my-cli", args, null, cmd, {
    buildVersion: "1.0.0",
    onExit: onExit.call,
    colorMode: colorMode ?? "never",
  });
  expect({
    stdOut: onLogStdOut.history,
    stdErr: onLogStdErr.history,
  }).toEqual({
    stdOut: expectStdOut,
    stdErr: expectStdErr,
  });
  expect(onExit.history).toEqual([expectExit]);
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

async function mustFail(callback: () => Promise<unknown>) {
  let failed = false;
  try {
    await callback();
  } catch {
    failed = true;
  }
  if (!failed) {
    throw new Error(`Should have failed, but did not`);
  }
}

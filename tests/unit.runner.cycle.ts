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
  typeOneOf,
  typeString,
  typeUrl,
} from "../src";

// TODO - unit test for chained commands

it("run", async () => {
  const rootUsage = [
    "Usage: my-cli <REQUIRED1> <SUBCOMMAND>",
    "",
    "Root Description",
    "",
    "Positionals:",
    "  <REQUIRED1>  Required1 positional description",
    "",
    "Subcommands:",
    "  subcommand  Subcommand Description",
    "",
    "Options:",
    "  --flag[=no]                   Option flag description",
    "  --repeatable <STRING>         Option repeatable description",
    "  --single-value <NUMBER-ENUM>  Option single value description",
    "",
  ].join("\n");
  const subcommandUsage = [
    "Usage: my-cli <REQUIRED1> subcommand <REQUIRED2> [OPTIONAL] [VARIADICS]...",
    "",
    "Subcommand Description",
    "",
    "Positionals:",
    "  <REQUIRED1>     Required1 positional description",
    "  <REQUIRED2>     Required2 positional description",
    "  [OPTIONAL]      Optional positional description",
    "  [VARIADICS]...  Variadics positional description",
    "",
    "Options:",
    "  --flag[=no]                   Option flag description",
    "  --repeatable <STRING>         Option repeatable description",
    "  --single-value <NUMBER-ENUM>  Option single value description",
    "  --url <URL>                   Option url description",
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

  // Test multiple errors at once (first one should show only)
  await testCase(
    ["--invalid1", "--invalid2", "required1", "--invalid3"],
    [],
    [rootUsage, "Error: --invalid1: Unexpected unknown option"],
    1,
  );
  await testCase(
    ["required1", "unknown", "-wut", "--flag", "--single-value"],
    [],
    [rootUsage, 'Error: <SUBCOMMAND>: Invalid value: "unknown"'],
    1,
  );

  // Test missing required inputs
  await testCase(
    [],
    [],
    [rootUsage, "Error: <REQUIRED1>: Is required, but was not provided"],
    1,
  );
  await testCase(
    ["required1"],
    [],
    [rootUsage, "Error: <SUBCOMMAND>: Is required, but was not provided"],
    1,
  );
  await testCase(
    ["required1", "subcommand"],
    [],
    [subcommandUsage, "Error: <REQUIRED2>: Is required, but was not provided"],
    1,
  );

  // Test that flags become available when subcommand is known
  await testCase(
    ["--url", "https://example.com"],
    [],
    [rootUsage, "Error: --url: Unexpected unknown option"],
    1,
  );
  await testCase(
    ["required1", "--url", "https://example.com"],
    [],
    [rootUsage, "Error: --url: Unexpected unknown option"],
    1,
  );
  await testCase(
    ["required1", "subcommand", "--url", "https://example.com"],
    [],
    [subcommandUsage, "Error: <REQUIRED2>: Is required, but was not provided"],
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
    [subcommandUsage, 'Error: --flag: <BOOLEAN>: Boolean: Invalid value: "42"'],
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

  // Test option parsing errors
  await testCase(
    ["--invalid", "required1", "subcommand", "required2"],
    [],
    [rootUsage, "Error: --invalid: Unexpected unknown option"],
    1,
  );
  await testCase(
    ["required1", "subcommand", "required2", "--nope"],
    [],
    [subcommandUsage, "Error: --nope: Unexpected unknown option"],
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
    [rootUsage, "Error: <SUBCOMMAND>: Is required, but was not provided"],
    1,
  );
  await testCase(
    ["invalid", "subcommand"],
    [],
    [
      subcommandUsage,
      'Error: <REQUIRED1>: STRING-ENUM: Invalid value: "invalid" (expected one of: "required1" | "required1-bis")',
    ],
    1,
  );
  await testCase(
    ["invalid", "subcommand", "required2"],
    [],
    [
      subcommandUsage,
      'Error: <REQUIRED1>: STRING-ENUM: Invalid value: "invalid" (expected one of: "required1" | "required1-bis")',
    ],
    1,
  );
  await testCase(
    ["required1", "subcommand", "invalid"],
    [],
    [
      subcommandUsage,
      'Error: <REQUIRED2>: STRING-ENUM: Invalid value: "invalid" (expected one of: "required2" | "required2-bis")',
    ],
    1,
  );
  await testCase(
    ["invalid", "subcommand", "invalid"],
    [],
    [
      subcommandUsage,
      'Error: <REQUIRED1>: STRING-ENUM: Invalid value: "invalid" (expected one of: "required1" | "required1-bis")',
    ],
    1,
  );

  // Test root command option invalid values (must not block parsing)
  await testCase(
    ["--single-value=dodo", "required1", "subcommand", "required2"],
    [],
    [
      subcommandUsage,
      'Error: --single-value: <NUMBER-ENUM>: NUMBER-ENUM: from: STRING-ENUM: Invalid value: "dodo" (expected one of: "42" | "43")',
    ],
    1,
  );
  await testCase(
    ["required1", "subcommand", "required2", "--single-value=44"],
    [],
    [
      subcommandUsage,
      'Error: --single-value: <NUMBER-ENUM>: NUMBER-ENUM: from: STRING-ENUM: Invalid value: "44" (expected one of: "42" | "43")',
    ],
    1,
  );

  // Test subcommand-only option failures
  await testCase(
    ["--url", "not-a-url", "required1", "subcommand", "required2"],
    [],
    [rootUsage, "Error: --url: Unexpected unknown option"],
    1,
  );
  await testCase(
    ["required1", "subcommand", "required2", "--url", "not-a-url"],
    [],
    [subcommandUsage, 'Error: --url: <URL>: Url: Unable to parse: "not-a-url"'],
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
            type: typeMapped(typeOneOf("STRING-ENUM", ["42", "43"]), {
              content: "NUMBER-ENUM",
              decoder: (value) => Number(value),
            }),
            description: "Option single value description",
            default: () => 42,
          }),
        },
        positionals: [
          positionalRequired({
            type: typeOneOf("STRING-ENUM", ["required1", "required1-bis"]),
            label: "REQUIRED1",
            description: "Required1 positional description",
          }),
        ],
      },
      async () => {
        console.log("Has executed root command");
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
                type: typeOneOf("STRING-ENUM", ["required2", "required2-bis"]),
                label: "REQUIRED2",
                description: "Required2 positional description",
              }),
              positionalOptional({
                label: "OPTIONAL",
                type: typeString,
                description: "Optional positional description",
                default: () => "world !",
              }),
              positionalVariadics({
                label: "VARIADICS",
                type: typeString,
                description: "Variadics positional description",
              }),
            ],
          },
          async () => {
            console.log("Has executed subcommand");
          },
        ),
      ),
    },
  );
  console.log = onLogStdOut.call;
  console.error = onLogStdErr.call;
  await runAndExit("my-cli", args, null, cmd, {
    buildVersion: "1.0.0",
    useTtyColors: false,
    onExit: onExit.call,
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
    call: (p: P) => {
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

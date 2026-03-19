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
  runAsCliAndExit,
  typeNumber,
  typeOneOf,
  typeString,
  typeUrl,
} from "../src";

it("run", async () => {
  const rootUsage = [
    "Root Description",
    "",
    "Usage: my-cli <REQUIRED1> <SUBCOMMAND>",
    "",
    "Positionals:",
    "  <REQUIRED1>  Required1 positional description",
    "",
    "Subcommands:",
    "  subcommand  Subcommand Description",
    "",
    "Options:",
    "  --flag[=no]              Option flag description",
    "  --repeatable <STRING>    Option repeatable description",
    "  --single-value <NUMBER>  Option single value description",
    "",
  ].join("\n");
  const subcommandUsage = [
    "Subcommand Description",
    "",
    "Usage: my-cli <REQUIRED1> subcommand <REQUIRED2> [OPTIONAL] [VARIADICS]...",
    "",
    "Positionals:",
    "  <REQUIRED1>     Required1 positional description",
    "  <REQUIRED2>     Required2 positional description",
    "  [OPTIONAL]      Optional positional description",
    "  [VARIADICS]...  Variadics positional description",
    "",
    "Options:",
    "  --flag[=no]              Option flag description",
    "  --repeatable <STRING>    Option repeatable description",
    "  --single-value <NUMBER>  Option single value description",
    "  --url <URL>              Option url description",
    "",
  ].join("\n");

  await testCase(["required1", "subcommand", "required2"], [], [], 0);
  await testCase(["--version"], ["my-cli 1.0.0"], [], 0);

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

  await testCase(
    [],
    [],
    [rootUsage, "Error: Missing required positional argument: REQUIRED1"],
    1,
  );
  await testCase(
    ["required1"],
    [],
    [rootUsage, "Error: Missing required positional argument: SUBCOMMAND"],
    1,
  );
  await testCase(
    ["required1", "subcommand"],
    [],
    [subcommandUsage, "Error: Missing required positional argument: REQUIRED2"],
    1,
  );
  await testCase(
    ["required1", "subcommand", "invalid"],
    [],
    [
      subcommandUsage,
      'Error: REQUIRED2: Unexpected value: "invalid" (expected: "required2"|"required2-bis")',
    ],
    1,
  );

  await testCase(
    ["required1", "subcommand", "required2", "--nope"],
    [],
    [subcommandUsage, "Error: Unknown option: --nope"],
    1,
  );
  await testCase(
    ["required1", "subcommand", "required2", "--url"],
    [],
    [
      subcommandUsage,
      "Error: Option parsing: --url: requires a value, but got end of input",
    ],
    1,
  );
  await testCase(
    ["required1", "subcommand", "required2", "--url", "not-a-url"],
    [],
    [subcommandUsage, "Error: --url: URL: TypeError: Invalid URL"],
    1,
  );

  await testCase(
    ["required1", "--url", "https://example.com"],
    [],
    [rootUsage, `Error: Unknown option: --url`],
    1,
  );
  await testCase(
    ["required1", "subcommand", "--url", "https://example.com"],
    [],
    [subcommandUsage, "Error: Missing required positional argument: REQUIRED2"],
    1,
  );
  await testCase(
    ["required1", "subcommand", "required2", "--url", "https://example.com"],
    [],
    [],
    0,
  );

  await testCase(
    ["--invalid", "required1", "subcommand", "required2"],
    [],
    [rootUsage, `Error: Unknown option: --invalid`],
    1,
  );
  await testCase(
    ["--flag", "--flag", "required1", "subcommand", "required2"],
    [],
    [
      subcommandUsage,
      "Error: Option value for: --flag: must not be set multiple times",
    ],
    1,
  );
  await testCase(
    ["--flag=42", "required1", "subcommand", "required2"],
    [],
    [subcommandUsage, 'Error: --flag: BOOLEAN: Invalid value: "42"'],
    1,
  );
  await testCase(
    ["--flag=no", "required1", "subcommand", "required2"],
    [],
    [],
    0,
  );
  await testCase(
    ["--flag=yes", "required1", "subcommand", "required2"],
    [],
    [],
    0,
  );

  await testCase(
    [
      "required1",
      "subcommand",
      "required2",
      "--repeatable=42",
      "--repeatable",
      "43",
    ],
    [],
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
      "Error: Option value for: --single-value: must not be set multiple times",
    ],
    1,
  );
  await testCase(
    ["required1", "subcommand", "required2", "--single-value=44"],
    [],
    [
      subcommandUsage,
      'Error: --single-value: NUMBER: Unexpected value: "44" (expected: "42"|"43")',
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
  const cmd = commandWithSubcommands<null, null, void>(
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
            type: typeOneOf(typeNumber, [42, 43]),
            description: "Option single value description",
            default: () => 42,
          }),
        },
        positionals: [
          positionalRequired({
            type: typeString,
            label: "REQUIRED1",
            description: "Required1 positional description",
          }),
        ],
      },
      async () => {
        return null;
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
                type: typeOneOf(typeString, ["required2", "required2-bis"]),
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
          async () => {},
        ),
      ),
    },
  );
  const onLogStdOut = makeMocked<string, void>([
    null as unknown as void,
    null as unknown as void,
  ]);
  const onLogStdErr = makeMocked<string, void>([
    null as unknown as void,
    null as unknown as void,
  ]);
  const onExit = makeMocked<number, never>([null as never]);
  await runAsCliAndExit("my-cli", args, null, cmd, {
    buildVersion: "1.0.0",
    onExit: onExit.call,
    onLogStdOut: onLogStdOut.call,
    onLogStdErr: onLogStdErr.call,
    useColors: false,
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

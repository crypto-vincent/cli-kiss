import { it } from "@jest/globals";
import {
  argumentOptional,
  argumentRequired,
  argumentVariadics,
  command,
  commandWithSubcommands,
  execution,
  optionFlag,
  optionRepeatable,
  optionSingleValue,
  runAndExit,
  typeString,
  typeUrl,
} from "../src";

it("run", async () => {
  const rootUsage = [
    "Root Description",
    "",
    "Usage: my-cli <REQUIRED1> <SUBCOMMAND>",
    "",
    "Arguments:",
    "  <REQUIRED1>  Required1 argument description",
    "",
    "Subcommands:",
    "  subcommand  Subcommand Description",
    "",
    "Options:",
    "  --flag[=no]              Option flag description",
    "  --repeatable <STRING>    Option repeatable description",
    "  --single-value <STRING>  Option single value description",
    "",
  ].join("\n");
  const subcommandUsage = [
    "Subcommand Description",
    "",
    "Usage: my-cli <REQUIRED1> subcommand <REQUIRED2> [OPTIONAL] [VARIADICS]...",
    "",
    "Arguments:",
    "  <REQUIRED1>     Required1 argument description",
    "  <REQUIRED2>     Required2 argument description",
    "  [OPTIONAL]      Optional argument description",
    "  [VARIADICS]...  Variadics argument description",
    "",
    "Options:",
    "  --flag[=no]              Option flag description",
    "  --repeatable <STRING>    Option repeatable description",
    "  --single-value <STRING>  Option single value description",
    "  --url <URL>              Option url description",
    "",
  ].join("\n");

  // TODO - this should work! but it doesnt!
  // await testCase(["--version"], ["my-cli 1.0.0"], [], 0);
  // await testCase(["--help"], [rootUsage], [], 0);
  await testCase(["required1", "subcommand", "required2"], [], [], 0);

  await testCase(
    [],
    [],
    [rootUsage, "Error: Missing required argument: REQUIRED1"],
    1,
  );
  await testCase(
    ["required1"],
    [],
    [rootUsage, "Error: Missing required argument: SUBCOMMAND"],
    1,
  );
  await testCase(
    ["required1", "subcommand"],
    [],
    [subcommandUsage, "Error: Missing required argument: REQUIRED2"],
    1,
  );

  await testCase(
    ["required1", "subcommand", "required2", "--nope"],
    [],
    [subcommandUsage, "Error: Unknown flag or option: --nope"],
    1,
  );
  await testCase(
    ["required1", "subcommand", "required2", "--url"],
    [],
    [
      subcommandUsage,
      "Error: Option --url requires a value but none was provided",
    ],
    1,
  );
  await testCase(
    ["required1", "subcommand", "required2", "--url", "not-a-url"],
    [],
    [
      subcommandUsage,
      'Error: Failed to decode value "not-a-url" for --url: URL: TypeError: Invalid URL',
    ],
    1,
  );

  await testCase(
    ["required1", "--url", "https://example.com"],
    [],
    [rootUsage, `Error: Unknown flag or option: --url`],
    1,
  );
  await testCase(
    ["required1", "subcommand", "--url", "https://example.com"],
    [],
    [subcommandUsage, "Error: Missing required argument: REQUIRED2"],
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
    [rootUsage, `Error: Unknown flag or option: --invalid`],
    1,
  );
  await testCase(
    ["--flag", "--flag", "required1", "subcommand", "required2"],
    [],
    [rootUsage, "Error: Flag already set: --flag"],
    1,
  );
  await testCase(
    ["--flag=42", "required1", "subcommand", "required2"],
    [],
    [rootUsage, 'Error: Invalid value for flag: --flag: "42"'],
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
      'Error: Multiple values provided for option: --single-value, expected only one. Found: "42", "43"',
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
    execution(
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
            type: typeString,
            description: "Option single value description",
            default: () => "hello ?",
          }),
        },
        arguments: [
          argumentRequired({
            type: typeString,
            label: "REQUIRED1",
            description: "Required1 argument description",
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
        execution(
          {
            options: {
              optionExtra: optionRepeatable({
                long: "url",
                description: "Option url description",
                type: typeUrl,
              }),
            },
            arguments: [
              argumentRequired({
                type: typeString,
                label: "REQUIRED2",
                description: "Required2 argument description",
              }),
              argumentOptional({
                label: "OPTIONAL",
                type: typeString,
                description: "Optional argument description",
                default: () => "world !",
              }),
              argumentVariadics({
                label: "VARIADICS",
                type: typeString,
                description: "Variadics argument description",
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
  await runAndExit("my-cli", args, null, cmd, {
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

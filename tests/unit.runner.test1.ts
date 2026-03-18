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
    "Usage: my-cli <REQUIRED> <SUBCOMMAND>",
    "",
    "Arguments:",
    "  <REQUIRED>  Required argument description",
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
    "Usage: my-cli <REQUIRED> subcommand [OPTIONAL] [VARIADICS]...",
    "",
    "Arguments:",
    "  <REQUIRED>      Required argument description",
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

  await testCase(
    [],
    [],
    [rootUsage, "Error: Missing required argument: REQUIRED"],
    1,
  );
  await testCase(
    ["required"],
    [],
    [rootUsage, "Error: Missing required argument: SUBCOMMAND"],
    1,
  );
  await testCase(["required", "subcommand"], [], [], 0);

  // TODO - this should work! but it doesnt!
  // await testCase(["--version"], ["my-cli 1.0.0"], [], 0);
  // await testCase(["--help"], [rootUsage], [], 0);
  // await testCase(["required", "--help"], [rootUsage], [], 0);

  await testCase(
    ["required", "subcommand", "--help"],
    [subcommandUsage],
    [],
    0,
  );

  await testCase(
    ["required"],
    [],
    [rootUsage, "Error: Missing required argument: SUBCOMMAND"],
    1,
  );
  await testCase(
    ["required", "subcommand", "--nope"],
    [],
    [subcommandUsage, "Error: Unknown flag or option: --nope"],
    1,
  );
  await testCase(
    ["--invalid-flag"],
    [],
    [rootUsage, `Error: Unknown flag or option: --invalid-flag`],
    1,
  );

  await testCase(
    ["required", "subcommand", "--url"],
    [],
    [
      subcommandUsage,
      "Error: Option --url requires a value but none was provided",
    ],
    1,
  );
  await testCase(
    ["required", "subcommand", "--url", "not-a-url"],
    [],
    [
      subcommandUsage,
      'Error: Failed to decode value "not-a-url" for --url: URL: TypeError: Invalid URL',
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
            label: "REQUIRED",
            description: "Required argument description",
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

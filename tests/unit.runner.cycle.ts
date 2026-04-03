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
  type,
  typeChoice,
  typeConverted,
  typeUrl,
} from "../src";

it("run", async function () {
  const rootUsage = [
    "Usage: my-cli <req1> <subcommand>",
    "",
    "Root Description",
    "",
    "Positionals:",
    "  <req1>  Required1 positional description",
    "",
    "Subcommands:",
    "  sub  Subcommand Description",
    "",
    "Options:",
    "  -ff, --flag[=no]                    Option flag description",
    "  -r,  --repeatable <string> [*]      Option repeatable description",
    "  -s,  --single-value <enum(number)>  Option single value description",
    "",
  ].join("\n");
  const subUsage = [
    "Usage: my-cli <req1> sub <req2> [optional] [variadic]...",
    "",
    "Subcommand Description",
    "",
    "Positionals:",
    "  <req1>         Required1 positional description",
    "  <req2>         Required2 positional description",
    "  [optional]     Optional positional description",
    "  [variadic]...  Variadics positional description",
    "",
    "Options:",
    "  -ff, --flag[=no]                    Option flag description",
    "  -r,  --repeatable <string> [*]      Option repeatable description",
    "  -s,  --single-value <enum(number)>  Option single value description",
    "  -u,  --url <url> [*]                Option url description",
    "",
  ].join("\n");

  // Test that everything could work normally
  await testCase(
    ["req1", "sub", "req2"],
    ["Has executed root command", "Has executed sub"],
    [],
    0,
  );

  // Check that version flag takes precedence over execution
  await testCase(["--version"], ["my-cli 1.0.0"], [], 0);
  await testCase(["req1", "--version"], ["my-cli 1.0.0"], [], 0);
  await testCase(["req1", "sub", "--version"], ["my-cli 1.0.0"], [], 0);
  await testCase(["req1", "sub", "req2", "--version"], ["my-cli 1.0.0"], [], 0);

  // Check that help flag takes precedence over execution
  await testCase(["--help"], [rootUsage], [], 0);
  await testCase(["req1", "--help"], [rootUsage], [], 0);
  await testCase(["req1", "sub", "--help"], [subUsage], [], 0);
  await testCase(["req1", "sub", "req2", "--help"], [subUsage], [], 0);

  // Help takes precedence over version
  await testCase(["--version", "--help"], [rootUsage], [], 0);
  await testCase(["--help", "--version"], [rootUsage], [], 0);

  // Help still works after failed parsing (should show usage for the right command)
  await testCase(["--invalid", "--help"], [rootUsage], [], 0);
  await testCase(["invalid", "--help"], [rootUsage], [], 0);
  await testCase(["req1", "sub", "--invalid", "--help"], [subUsage], [], 0);
  await testCase(["req1", "sub", "invalid", "--help"], [subUsage], [], 0);

  // Weird help/version values inputs
  await testCase(
    ["--help=invalid"],
    [],
    [rootUsage, `Error: --help: value: Not a boolean: "invalid"`],
    1,
  );
  await testCase(
    ["--version=invalid"],
    [],
    [rootUsage, `Error: --version: value: Not a boolean: "invalid"`],
    1,
  );

  // Test multiple errors at once (first one should show only)
  await testCase(
    ["--invalid1", "--invalid2", "req1", "--invalid3"],
    [],
    [
      rootUsage,
      'Error: Unknown option: "--invalid1". Did you mean: --single-value, --help, --version, ... ?',
    ],
    1,
  );
  await testCase(
    ["req1", "unknown", "-wut", "--flag", "--single-value"],
    [],
    [
      rootUsage,
      'Error: <subcommand>: Unknown name: "unknown". Did you mean: sub ?',
    ],
    1,
  );

  // Test missing required inputs
  await testCase(
    [],
    [],
    [
      rootUsage,
      "Error: <req1>: Is required, but was not provided. (Required1 positional description)",
    ],
    1,
  );
  await testCase(
    ["req1"],
    [],
    [rootUsage, "Error: <subcommand>: Missing argument. Did you mean: sub ?"],
    1,
  );
  await testCase(
    ["req1", "sub"],
    [],
    [
      subUsage,
      "Error: <req2>: Is required, but was not provided. (Required2 positional description)",
    ],
    1,
  );

  // Test that flags become available when sub is known
  await testCase(
    ["--url", "https://example.com"],
    [],
    [
      rootUsage,
      'Error: Unknown option: "--url". Did you mean: --help, -r, --version, ... ?',
    ],
    1,
  );
  await testCase(
    ["req1", "--url", "https://example.com"],
    [],
    [
      rootUsage,
      'Error: Unknown option: "--url". Did you mean: --help, -r, --version, ... ?',
    ],
    1,
  );
  await testCase(
    ["req1", "sub", "--url", "https://example.com"],
    [],
    [
      subUsage,
      "Error: <req2>: Is required, but was not provided. (Required2 positional description)",
    ],
    1,
  );
  await testCase(
    ["req1", "sub", "req2", "--url", "https://example.com"],
    ["Has executed root command", "Has executed sub"],
    [],
    0,
  );

  // Test option as flag parsing cases
  await testCase(
    ["--flag", "--flag", "req1", "sub", "req2"],
    [],
    [subUsage, "Error: --flag: Must not be set multiple times"],
    1,
  );
  await testCase(
    ["--flag=42", "req1", "sub", "req2"],
    [],
    [subUsage, 'Error: --flag: value: Not a boolean: "42"'],
    1,
  );
  await testCase(
    ["--flag=no", "req1", "sub", "req2"],
    ["Has executed root command", "Has executed sub"],
    [],
    0,
  );
  await testCase(
    ["--flag=yes", "req1", "sub", "req2"],
    ["Has executed root command", "Has executed sub"],
    [],
    0,
  );
  await testCase(
    ["--flag", "req1", "sub", "req2"],
    ["Has executed root command", "Has executed sub"],
    [],
    0,
  );

  // Test option parsing errors
  await testCase(
    ["--invalid", "req1", "sub", "req2"],
    [],
    [
      rootUsage,
      'Error: Unknown option: "--invalid". Did you mean: --single-value, --help, --flag, ... ?',
    ],
    1,
  );
  await testCase(
    ["req1", "sub", "req2", "--nope"],
    [],
    [
      subUsage,
      'Error: Unknown option: "--nope". Did you mean: --help, --flag, --repeatable, ... ?',
    ],
    1,
  );
  await testCase(
    ["req1", "sub", "req2", "--url"],
    [],
    [subUsage, "Error: --url: Requires a value, but got end of input"],
    1,
  );
  await testCase(
    ["req1", "sub", "req2", "--url", "--", "url"],
    [],
    [subUsage, 'Error: --url: Requires a value before "--"'],
    1,
  );
  await testCase(
    ["req1", "sub", "req2", "--url", "--url"],
    [],
    [subUsage, 'Error: --url: Requires a value, but got: "--url"'],
    1,
  );

  // Test invalid positional type value (should keep parsing best-effort even on invalid values)
  await testCase(
    ["invalid"],
    [],
    [rootUsage, "Error: <subcommand>: Missing argument. Did you mean: sub ?"],
    1,
  );
  await testCase(
    ["invalid", "sub"],
    [],
    [
      subUsage,
      'Error: <req1>: Unknown value: "invalid". Did you mean: "req1-bis", "req1" ?',
    ],
    1,
  );
  await testCase(
    ["invalid", "sub", "req2"],
    [],
    [
      subUsage,
      'Error: <req1>: Unknown value: "invalid". Did you mean: "req1-bis", "req1" ?',
    ],
    1,
  );
  await testCase(
    ["req1", "sub", "invalid"],
    [],
    [
      subUsage,
      'Error: <req2>: Unknown value: "invalid". Did you mean: "req2-bis", "req2" ?',
    ],
    1,
  );
  await testCase(
    ["invalid", "sub", "invalid"],
    [],
    [
      subUsage,
      'Error: <req1>: Unknown value: "invalid". Did you mean: "req1-bis", "req1" ?',
    ],
    1,
  );

  // Test root command option invalid values (must not block parsing)
  await testCase(
    ["--single-value=dodo", "req1", "sub", "req2"],
    [],
    [
      subUsage,
      'Error: --single-value: <enum(number)>: from: enum(string): Unknown value: "dodo". Did you mean: "42", "43" ?',
    ],
    1,
  );
  await testCase(
    ["req1", "sub", "req2", "--single-value=44"],
    [],
    [
      subUsage,
      'Error: --single-value: <enum(number)>: from: enum(string): Unknown value: "44". Did you mean: "42", "43" ?',
    ],
    1,
  );

  // Test sub-only option failures
  await testCase(
    ["--url", "not-a-url", "req1", "sub", "req2"],
    [],
    [
      rootUsage,
      'Error: Unknown option: "--url". Did you mean: --help, -r, --version, ... ?',
    ],
    1,
  );
  await testCase(
    ["req1", "sub", "req2", "--url", "not-a-url"],
    [],
    [subUsage, 'Error: --url: <url>: Not an URL: "not-a-url"'],
    1,
  );

  // Test option multiple value parsing cases
  await testCase(
    ["req1", "sub", "req2", "--repeatable=42", "--repeatable", "43"],
    ["Has executed root command", "Has executed sub"],
    [],
    0,
  );
  await testCase(
    ["req1", "sub", "req2", "--single-value=42", "--single-value", "43"],
    [],
    [subUsage, "Error: --single-value: Must not be set multiple times"],
    1,
  );

  // Test suggestions
  await testCase(
    ["req1", "sub", "req2", "-f"],
    [],
    [subUsage, 'Error: Unknown option: "-f". Did you mean: -ff, -r, -s, ... ?'],
    1,
  );
  await testCase(
    ["req1", "sub", "req2", "-flag"],
    [],
    [
      subUsage,
      'Error: Unknown option: "-flag". Did you mean: --flag, -ff, --single-value, ... ?',
    ],
    1,
  );
  await testCase(
    ["req1", "sub", "req2", "--uri"],
    [],
    [
      subUsage,
      'Error: Unknown option: "--uri". Did you mean: --url, --version, -r, ... ?',
    ],
    1,
  );
  await testCase(
    ["req1", "sub", "req2", "--single-"],
    [],
    [
      subUsage,
      'Error: Unknown option: "--single-". Did you mean: --single-value, --help, --flag, ... ?',
    ],
    1,
  );
  await testCase(
    ["required-bis1", "sub", "req2"],
    [],
    [
      subUsage,
      'Error: <req1>: Unknown value: "required-bis1". Did you mean: "req1-bis", "req1" ?',
    ],
    1,
  );
  await testCase(
    ["req1", "subcomm"],
    [],
    [
      rootUsage,
      'Error: <subcommand>: Unknown name: "subcomm". Did you mean: sub ?',
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
            short: "ff",
            description: "Option flag description",
          }),
          optionRepeatable: optionRepeatable({
            long: "repeatable",
            short: "r",
            type: type(),
            description: "Option repeatable description",
          }),
          optionSingleValue: optionSingleValue({
            long: "single-value",
            short: "s",
            type: typeConverted(
              "enum(number)",
              typeChoice("enum(string)", ["42", "43"]),
              (value) => Number(value),
            ),
            description: "Option single value description",
            defaultIfNotSpecified: () => 42,
          }),
        },
        positionals: [
          positionalRequired({
            type: typeChoice("req1", ["req1", "req1-bis"]),
            description: "Required1 positional description",
          }),
        ],
      },
      async function (_, _inputs) {
        console.log(`Has executed root command`);
      },
    ),
    {
      sub: command(
        { description: "Subcommand Description" },
        operation(
          {
            options: {
              optionExtra: optionRepeatable({
                long: "url",
                short: "u",
                description: "Option url description",
                type: typeUrl(),
              }),
            },
            positionals: [
              positionalRequired({
                type: typeChoice("req2", ["req2", "req2-bis"]),
                description: "Required2 positional description",
              }),
              positionalOptional({
                type: type("optional"),
                description: "Optional positional description",
                default: () => "world !",
              }),
              positionalVariadics({
                type: type("variadic"),
                description: "Variadics positional description",
              }),
            ],
          },
          async function (_, _inputs) {
            console.log(`Has executed sub`);
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
    colorSetup: "never",
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

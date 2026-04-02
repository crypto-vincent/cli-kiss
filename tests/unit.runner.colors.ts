import { it } from "@jest/globals";
import {
  command,
  operation,
  optionRepeatable,
  positionalVariadics,
  runAndExit,
  type,
  TypoSupport,
  usageToStyledLines,
} from "../src";

const cliName = "my-cli";

it("run", async function () {
  const usage = {
    segments: [{ positional: "[string]..." }],
    information: { description: "Description" },
    subcommands: [],
    options: [{ long: "option", label: "<string>", annotation: " [*]" }],
    positionals: [{ label: "[string]...", description: "Variadics" }],
  };
  const usageNone = usageToStyledLines({
    cliName,
    usage,
    typoSupport: TypoSupport.none(),
  }).join("\n");
  const usageMock = usageToStyledLines({
    cliName,
    usage,
    typoSupport: TypoSupport.mock(),
  }).join("\n");
  const usageTty = usageToStyledLines({
    cliName,
    usage,
    typoSupport: TypoSupport.tty(),
  }).join("\n");

  await testCase("flag", ["--color=auto", "--help"], [usageTty], [], 0);
  await testCase("flag", ["--color=always", "--help"], [usageTty], [], 0);
  await testCase("flag", ["--color=never", "--help"], [usageNone], [], 0);
  await testCase("flag", ["--color=mock", "--help"], [usageMock], [], 0);
  await testCase("flag", ["--color", "--help"], [usageTty], [], 0);
  await testCase("flag", ["--help"], [usageTty], [], 0);
  await testCase("env", ["--help"], [usageTty], [], 0);
  await testCase("always", ["--help"], [usageTty], [], 0);
  await testCase("never", ["--help"], [usageNone], [], 0);
  await testCase("mock", ["--help"], [usageMock], [], 0);

  process.env["TERM"] = "dumb";
  await testCase("flag", ["--color=auto", "--help"], [usageNone], [], 0);
  await testCase("flag", ["--color=always", "--help"], [usageTty], [], 0);
  await testCase("flag", ["--color=never", "--help"], [usageNone], [], 0);
  await testCase("flag", ["--color=mock", "--help"], [usageMock], [], 0);
  await testCase("flag", ["--color", "--help"], [usageTty], [], 0);
  await testCase("flag", ["--help"], [usageNone], [], 0);
  await testCase("env", ["--help"], [usageNone], [], 0);
  await testCase("always", ["--help"], [usageTty], [], 0);
  await testCase("never", ["--help"], [usageNone], [], 0);
  await testCase("mock", ["--help"], [usageMock], [], 0);
  delete process.env["TERM"];

  process.env["NO_COLOR"] = "true";
  await testCase("flag", ["--color=auto", "--help"], [usageNone], [], 0);
  await testCase("flag", ["--color=always", "--help"], [usageTty], [], 0);
  await testCase("flag", ["--color=never", "--help"], [usageNone], [], 0);
  await testCase("flag", ["--color=mock", "--help"], [usageMock], [], 0);
  await testCase("flag", ["--color", "--help"], [usageTty], [], 0);
  await testCase("flag", ["--help"], [usageNone], [], 0);
  await testCase("env", ["--help"], [usageNone], [], 0);
  await testCase("always", ["--help"], [usageTty], [], 0);
  await testCase("never", ["--help"], [usageNone], [], 0);
  await testCase("mock", ["--help"], [usageMock], [], 0);
  delete process.env["NO_COLOR"];

  process.env["FORCE_COLOR"] = "1";
  await testCase("flag", ["--color=auto", "--help"], [usageTty], [], 0);
  await testCase("flag", ["--color=always", "--help"], [usageTty], [], 0);
  await testCase("flag", ["--color=never", "--help"], [usageNone], [], 0);
  await testCase("flag", ["--color=mock", "--help"], [usageMock], [], 0);
  await testCase("flag", ["--color", "--help"], [usageTty], [], 0);
  await testCase("flag", ["--help"], [usageTty], [], 0);
  await testCase("env", ["--help"], [usageTty], [], 0);
  await testCase("always", ["--help"], [usageTty], [], 0);
  await testCase("never", ["--help"], [usageNone], [], 0);
  await testCase("mock", ["--help"], [usageMock], [], 0);
  delete process.env["FORCE_COLOR"];

  process.env["FORCE_COLOR"] = "0";
  await testCase("flag", ["--color=auto", "--help"], [usageNone], [], 0);
  await testCase("flag", ["--color=always", "--help"], [usageTty], [], 0);
  await testCase("flag", ["--color=never", "--help"], [usageNone], [], 0);
  await testCase("flag", ["--color=mock", "--help"], [usageMock], [], 0);
  await testCase("flag", ["--color", "--help"], [usageTty], [], 0);
  await testCase("flag", ["--help"], [usageNone], [], 0);
  await testCase("env", ["--help"], [usageNone], [], 0);
  await testCase("always", ["--help"], [usageTty], [], 0);
  await testCase("never", ["--help"], [usageNone], [], 0);
  await testCase("mock", ["--help"], [usageMock], [], 0);
  delete process.env["FORCE_COLOR"];

  process.env["MOCK_COLOR"] = "true";
  await testCase("flag", ["--color=auto", "--help"], [usageMock], [], 0);
  await testCase("flag", ["--color=always", "--help"], [usageTty], [], 0);
  await testCase("flag", ["--color=never", "--help"], [usageNone], [], 0);
  await testCase("flag", ["--color=mock", "--help"], [usageMock], [], 0);
  await testCase("flag", ["--color", "--help"], [usageTty], [], 0);
  await testCase("flag", ["--help"], [usageMock], [], 0);
  await testCase("env", ["--help"], [usageMock], [], 0);
  await testCase("always", ["--help"], [usageTty], [], 0);
  await testCase("never", ["--help"], [usageNone], [], 0);
  await testCase("mock", ["--help"], [usageMock], [], 0);
  await testCase(
    "flag",
    ["--color=42"],
    [],
    [
      usageMock,
      '{{Error:}@darkRed}+ {{--color}@darkCyan}+: {{<color-mode>}@darkBlue}+: Invalid value: {{"42"}@darkYellow}+ (expected one of: {{"auto"}@darkYellow}+ | {{"always"}@darkYellow}+ | {{"never"}@darkYellow}+...)',
    ],
    1,
  );
  delete process.env["MOCK_COLOR"];

  const unexpected1 = "Error: Unexpected unknown option: --color";

  await testCase("never", ["--color=auto"], [], [usageNone, unexpected1], 1);
  await testCase("never", ["--color=always"], [], [usageNone, unexpected1], 1);
  await testCase("never", ["--color=never"], [], [usageNone, unexpected1], 1);
  await testCase("never", ["--color=mock"], [], [usageNone, unexpected1], 1);
  await testCase("never", ["--color"], [], [usageNone, unexpected1], 1);

  process.env["FORCE_COLOR"] = "0";
  await testCase("env", ["--color=auto"], [], [usageNone, unexpected1], 1);
  await testCase("env", ["--color=always"], [], [usageNone, unexpected1], 1);
  await testCase("env", ["--color=never"], [], [usageNone, unexpected1], 1);
  await testCase("env", ["--color=mock"], [], [usageNone, unexpected1], 1);
  await testCase("env", ["--color"], [], [usageNone, unexpected1], 1);
  delete process.env["FORCE_COLOR"];

  const unexpected2 =
    "{{Error:}@darkRed}+ Unexpected unknown option: {{--color}@darkYellow}+";

  await testCase("mock", ["--color=auto"], [], [usageMock, unexpected2], 1);
  await testCase("mock", ["--color=always"], [], [usageMock, unexpected2], 1);
  await testCase("mock", ["--color=never"], [], [usageMock, unexpected2], 1);
  await testCase("mock", ["--color=mock"], [], [usageMock, unexpected2], 1);
  await testCase("mock", ["--color"], [], [usageMock, unexpected2], 1);
});

async function testCase(
  colorSetup: "flag" | "env" | "always" | "never" | "mock",
  cliArgs: Array<string>,
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
  const cmd = command<null, void>(
    { description: "Description" },
    operation(
      {
        options: {
          value: optionRepeatable({ long: "option", type: type() }),
        },
        positionals: [
          positionalVariadics({ type: type(), description: "Variadics" }),
        ],
      },
      async function (_, { options: { value }, positionals: [rest] }) {
        console.log(
          `Has executed: ${JSON.stringify(value)}, ${JSON.stringify(rest)}`,
        );
      },
    ),
  );
  console.log = onLogStdOut.call;
  console.error = onLogStdErr.call;
  await runAndExit(cliName, cliArgs, null, cmd, {
    buildVersion: "1.0.0",
    onExit: onExit.call,
    colorSetup,
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

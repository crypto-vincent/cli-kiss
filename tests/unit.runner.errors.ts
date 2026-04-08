import { expect, it } from "@jest/globals";
import {
  command,
  operation,
  optionFlag,
  optionRepeatable,
  optionSingleValue,
  runAndExit,
  typeNumber,
  typeUrl,
} from "../src";

it("run", async function () {
  await testCase(
    ["hello"],
    '{{Error:}@darkRed}+ Unexpected argument: {{"hello"}@darkYellow}+',
  );
  await testCase(
    ["--nope"],
    '{{Error:}@darkRed}+ Unknown option: {{"--nope"}@darkYellow}+. Did you mean: {{--help}@darkCyan}+, {{--flag}@darkCyan}+, {{--repeatable}@darkCyan}+, {{...}-}* ?',
  );
  await testCase(
    ["--repeat"],
    '{{Error:}@darkRed}+ Unknown option: {{"--repeat"}@darkYellow}+. Did you mean: {{--repeatable}@darkCyan}+ ?',
  );
  await testCase(
    ["--single-value=a", "--single-value=b"],
    "{{Error:}@darkRed}+ {{--single-value}@darkCyan}+: Must not be set multiple times",
  );
  await testCase(
    ["--single-value"],
    "{{Error:}@darkRed}+ {{--single-value}@darkCyan}+: Requires a value, but got end of input",
  );
  await testCase(
    [],
    "{{Error:}@darkRed}+ {{--single-value}@darkCyan}+: {{<location>}@darkBlue}+: Is required, but was not set",
  );
  await testCase(
    ["--single-value=invalid"],
    '{{Error:}@darkRed}+ {{--single-value}@darkCyan}+: {{<location>}@darkBlue}+: Not an URL: {{"invalid"}@darkYellow}+',
  );
  await testCase(
    ["--repeatable=invalid"],
    '{{Error:}@darkRed}+ {{--repeatable}@darkCyan}+: {{<index>}@darkBlue}+: Not a number: {{"invalid"}@darkYellow}+',
  );
  await testCase(
    ["--flag", "-f"],
    "{{Error:}@darkRed}+ {{--flag}@darkCyan}+, {{-f}@darkCyan}+: Must not be set multiple times",
  );
  await testCase(
    ["--flag=invalid"],
    '{{Error:}@darkRed}+ {{--flag}@darkCyan}+: {{value}@darkMagenta}+: Not a boolean: {{"invalid"}@darkYellow}+',
  );
});

async function testCase(args: Array<string>, error: string) {
  const onLogStdOut = makeMocked<string, void>([]);
  const onLogStdErr = makeMocked<string, void>([null as unknown as void]);
  const onExit = makeMocked<number, never>([null as never]);
  const rootCommand = command<void, void>(
    { description: "" },
    operation(
      {
        options: {
          optionFlag: optionFlag({ long: "flag", short: "f" }),
          optionRepeatable: optionRepeatable({
            long: "repeatable",
            type: typeNumber("index"),
          }),
          optionSingleValue: optionSingleValue({
            long: "single-value",
            type: typeUrl("location"),
          }),
        },
        positionals: [],
      },
      async function () {},
    ),
  );
  console.log = onLogStdOut.call;
  console.error = onLogStdErr.call;
  await runAndExit("my-cli", args, null, rootCommand, {
    buildVersion: "1.0.0",
    usageOnError: false,
    colorSetup: "mock",
    onExit: onExit.call,
  });
  expect(onLogStdOut.history).toEqual([]);
  expect(onLogStdErr.history).toEqual([error]);
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

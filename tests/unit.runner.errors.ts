import { it } from "@jest/globals";
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

it("run", async () => {
  await testCase(
    ["hello"],
    '{{Error:}@darkRed}+ Unexpected argument: {{"hello"}@darkYellow}+',
  );
  await testCase(
    ["--flag", "--flag"],
    "{{Error:}@darkRed}+ {{--flag}@darkCyan}+: Must not be set multiple times",
  );
  await testCase(
    ["--flag=invalid"],
    '{{Error:}@darkRed}+ {{--flag}@darkCyan}+: {{<BOOLEAN>}@darkBlue}+: {{Boolean}@darkMagenta}+: Invalid value: {{"invalid"}@darkYellow}+',
  );
  await testCase(
    ["--single-value=invalid"],
    '{{Error:}@darkRed}+ {{--single-value}@darkCyan}+: {{<LOCATION>}@darkBlue}+: {{Url}@darkMagenta}+: Unable to parse: {{"invalid"}@darkYellow}+',
  );
  await testCase(
    ["--repeatable=invalid"],
    '{{Error:}@darkRed}+ {{--repeatable}@darkCyan}+: {{<INDEX>}@darkBlue}+: {{Number}@darkMagenta}+: Unable to parse: {{"invalid"}@darkYellow}+',
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
          optionFlag: optionFlag({
            long: "flag",
          }),
          optionSingleValue: optionSingleValue({
            label: "LOCATION",
            long: "single-value",
            type: typeUrl,
            default: () => undefined,
          }),
          optionRepeatable: optionRepeatable({
            label: "INDEX",
            long: "repeatable",
            type: typeNumber,
          }),
        },
        positionals: [],
      },
      async () => {},
    ),
  );
  console.log = onLogStdOut.call;
  console.error = onLogStdErr.call;
  await runAndExit("my-cli", args, null, rootCommand, {
    buildVersion: "1.0.0",
    usageOnError: false,
    useTtyColors: "mock",
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

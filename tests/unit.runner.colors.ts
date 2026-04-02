import { it } from "@jest/globals";
import {
  command,
  operation,
  runAndExit,
  RunColorMode,
  TypoSupport,
  usageToStyledLines,
} from "../src";

const cliName = "my-cli";
const usageBase = {
  segments: [],
  information: { description: "Description" },
  subcommands: [],
  options: [],
  positionals: [],
};
const usageNone = usageToStyledLines({
  cliName,
  usage: usageBase,
  typoSupport: TypoSupport.none(),
}).join("\n");
const usageMock = usageToStyledLines({
  cliName,
  usage: usageBase,
  typoSupport: TypoSupport.mock(),
}).join("\n");
const usageTty = usageToStyledLines({
  cliName,
  usage: usageBase,
  typoSupport: TypoSupport.tty(),
}).join("\n");

const unknownOptionNone =
  'Error: Unknown option: "--color": did you mean: --help, --version ?';
const unknownOptionMock =
  '{{Error:}@darkRed}+ Unknown option: {{"--color"}@darkYellow}+: did you mean: {{--help}@darkCyan}+, {{--version}@darkCyan}+ ?';

it("run", async function () {
  await withEnv("FORCE_COLOR", "false", async () => {
    if (process.stdout.isTTY) {
      await testAllHelpsSuccesses(usageTty);
    } else {
      await testAllHelpsSuccesses(usageNone);
    }

    await withEnv("FORCE_COLOR", "1", async () => {
      await withEnv("NO_COLOR", "1", async () => {
        await testAllHelpsSuccesses(usageNone);
      });
      await withEnv("NO_COLOR", "true", async () => {
        await testAllHelpsSuccesses(usageNone);
      });
      await withEnv("NO_COLOR", "", async () => {
        await testAllHelpsSuccesses(usageTty);
      });
      await withEnv("MOCK_COLOR", "", async () => {
        await testAllHelpsSuccesses(usageTty);
      });
      await withEnv("TERM", "dumb", async () => {
        await testAllHelpsSuccesses(usageTty);
      });
    });

    await withEnv("FORCE_COLOR", "2", async () => {
      await testAllHelpsSuccesses(usageTty);
    });
    await withEnv("FORCE_COLOR", "1", async () => {
      await testAllHelpsSuccesses(usageTty);
    });
    await withEnv("FORCE_COLOR", "0", async () => {
      await testAllHelpsSuccesses(usageNone);
    });
    await withEnv("MOCK_COLOR", "true", async () => {
      await testAllHelpsSuccesses(usageMock);
    });

    await withEnv("MOCK_COLOR", "1", async () => {
      await testCase(
        "flag",
        ["--color=42"],
        [],
        [
          usageMock,
          '{{Error:}@darkRed}+ {{--color}@darkCyan}+: {{<color-mode>}@darkBlue}+: Unknown value: {{"42"}@darkYellow}+: did you mean: {{"auto"}@darkYellow}+, {{"always"}@darkYellow}+, {{"never"}@darkYellow}+ ?',
        ],
        1,
      );
    });

    await withEnv("MOCK_COLOR", "1", async () => {
      await testAllFlagsFailures("env", usageMock, unknownOptionMock);
    });
    await withEnv("FORCE_COLOR", "0", async () => {
      await testAllFlagsFailures("env", usageNone, unknownOptionNone);
    });

    await testAllFlagsFailures("mock", usageMock, unknownOptionMock);
    await testAllFlagsFailures("never", usageNone, unknownOptionNone);
  });
});

async function testAllFlagsFailures(
  colorSetup: "flag" | RunColorMode,
  usageErr: string,
  message: string,
) {
  await testCase(colorSetup, ["--color=auto"], [], [usageErr, message], 1);
  await testCase(colorSetup, ["--color=always"], [], [usageErr, message], 1);
  await testCase(colorSetup, ["--color=never"], [], [usageErr, message], 1);
  await testCase(colorSetup, ["--color=mock"], [], [usageErr, message], 1);
  await testCase(colorSetup, ["--color"], [], [usageErr, message], 1);
}

async function testAllHelpsSuccesses(usageFromEnv: string) {
  await testCase("flag", ["--color=auto", "--help"], [usageFromEnv], [], 0);
  await testCase("flag", ["--color=always", "--help"], [usageTty], [], 0);
  await testCase("flag", ["--color=never", "--help"], [usageNone], [], 0);
  await testCase("flag", ["--color=mock", "--help"], [usageMock], [], 0);
  await testCase("flag", ["--color", "--help"], [usageTty], [], 0);
  await testCase("flag", ["--help"], [usageFromEnv], [], 0);
  await testCase("env", ["--help"], [usageFromEnv], [], 0);
  await testCase("always", ["--help"], [usageTty], [], 0);
  await testCase("never", ["--help"], [usageNone], [], 0);
  await testCase("mock", ["--help"], [usageMock], [], 0);
}

async function testCase(
  colorSetup: "flag" | RunColorMode,
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
    operation({ options: {}, positionals: [] }, async function () {}),
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

async function withEnv(
  envName: string,
  envValue: string,
  callback: () => Promise<void>,
) {
  let beforeEnvValue = undefined;
  if (envName in process.env) {
    beforeEnvValue = process.env[envName];
  }
  process.env[envName] = envValue;
  await callback();
  if (beforeEnvValue === undefined) {
    delete process.env[envName];
  } else {
    process.env[envName] = beforeEnvValue;
  }
}

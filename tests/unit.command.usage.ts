import { it } from "@jest/globals";
import {
  Command,
  command,
  commandWithSubcommands,
  execution,
  optionFlag,
  optionRepeatable,
  optionSingleValue,
  parameterOptional,
  parameterRequired,
  parameterVariadics,
  ReaderArgs,
  typeCommaList,
  typeCommaTuple,
  typeNumber,
  typeString,
  TypoSupport,
  usageToStyledLines,
} from "../src";

const cmd = commandWithSubcommands<string, any, any>(
  {
    description: "Root command description",
    details: [
      "Root command details.",
      "Second line of root command details.",
    ].join(" "),
  },
  execution(
    {
      options: {
        booleanFlag: optionFlag({
          short: "b",
          long: "boolean-flag",
          description: "Root boolean-flag description",
        }),
        stringOption: optionSingleValue({
          short: "s",
          long: "string-option",
          type: typeString,
          default: () => undefined,
          label: "COOL-STUFF",
          description: "Root string-option description",
        }),
        complexOption: optionRepeatable({
          long: "complex-option",
          type: typeCommaTuple([typeNumber, typeCommaList(typeString)]),
          description: "Root complex-option description",
        }),
      },
      parameters: [
        parameterRequired({
          label: "POS-1",
          description: "Required parameter number 1",
          type: typeNumber,
        }),
        parameterRequired({
          label: "POS-2",
          description: "Required parameter number 2",
          type: typeNumber,
        }),
      ],
    },
    async (context, inputs) => {
      return { at: "root", context, inputs };
    },
  ),
  {
    sub1: command(
      {
        description: "Subcommand 1 description",
        details: [
          "Subcommand 1 details.",
          "Second line of subcommand 1 details.",
        ].join(" "),
      },
      execution(
        {
          options: {},
          parameters: [
            parameterRequired({
              label: "POS-STRING",
              description: "Required parameter string",
              type: typeString,
            }),
          ],
        },
        async (context, inputs) => {
          return { at: "sub1", context, inputs };
        },
      ),
    ),
    sub2: command(
      {
        description: "Subcommand 2 description",
        details: [
          "Subcommand 2 details.",
          "Second line of subcommand 2 details.",
        ].join(" "),
      },
      execution(
        {
          options: {
            duduValue: optionSingleValue({
              long: "dudu",
              type: typeString,
              default: () => "duduDefault",
              description: "Dudu option description",
            }),
          },
          parameters: [
            parameterRequired({
              label: "POS-NUMBER",
              description: "Required parameter number",
              type: typeNumber,
            }),
            parameterOptional({
              label: "OPT-POS",
              description: "Optional parameter string",
              type: typeString,
              default: () => "42",
            }),
            parameterVariadics({
              label: "VARIADIC",
              description: "Variadic parameters strings",
              type: typeString,
            }),
          ],
        },
        async (context, inputs) => {
          return { at: "sub2", context, inputs };
        },
      ),
    ),
  },
);

it("run", async () => {
  const usage1 = await getUsage([], cmd);
  const usage2 = await getUsage(["50", "51", "sub1"], cmd);
  const usage3 = await getUsage(["40", "41", "sub2", "--doesn't-exist"], cmd);

  /*
  console.log(usage1.join("\n"));
  console.log(usage2.join("\n"));
  console.log(usage3.join("\n"));
   */

  expect(usage1).toStrictEqual([
    "{Root command description}+",
    "{{Root command details. Second line of root command details.}-}*",
    "",
    "{{Usage:}@darkMagenta}+ {{my-cli}@darkCyan}+ {{<POS-1>}@darkBlue}+ {{<POS-2>}@darkBlue}+ {{<SUBCOMMAND>}@darkCyan}+",
    "",
    "{{Parameters:}@darkGreen}+",
    "  {{<POS-1>}@darkBlue}+  Required parameter number 1",
    "  {{<POS-2>}@darkBlue}+  Required parameter number 2",
    "",
    "{{Subcommands:}@darkGreen}+",
    "  {{sub1}@darkCyan}+  Subcommand 1 description",
    "  {{sub2}@darkCyan}+  Subcommand 2 description",
    "",
    "{{Options:}@darkGreen}+",
    "  {{-b}@darkCyan}+, {{--boolean-flag}@darkCyan}+{{[=no]}-}*                           Root boolean-flag description",
    "  {{-s}@darkCyan}+, {{--string-option}@darkCyan}+ {{<COOL-STUFF>}@darkBlue}+                  Root string-option description",
    "      {{--complex-option}@darkCyan}+ {{<NUMBER,STRING[,STRING]...>}@darkBlue}+  Root complex-option description",
    "",
  ]);
  expect(usage2).toStrictEqual([
    "{Subcommand 1 description}+",
    "{{Subcommand 1 details. Second line of subcommand 1 details.}-}*",
    "",
    "{{Usage:}@darkMagenta}+ {{my-cli}@darkCyan}+ {{<POS-1>}@darkBlue}+ {{<POS-2>}@darkBlue}+ {{sub1}@darkCyan}+ {{<POS-STRING>}@darkBlue}+",
    "",
    "{{Parameters:}@darkGreen}+",
    "  {{<POS-1>}@darkBlue}+       Required parameter number 1",
    "  {{<POS-2>}@darkBlue}+       Required parameter number 2",
    "  {{<POS-STRING>}@darkBlue}+  Required parameter string",
    "",
    "{{Options:}@darkGreen}+",
    "  {{-b}@darkCyan}+, {{--boolean-flag}@darkCyan}+{{[=no]}-}*                           Root boolean-flag description",
    "  {{-s}@darkCyan}+, {{--string-option}@darkCyan}+ {{<COOL-STUFF>}@darkBlue}+                  Root string-option description",
    "      {{--complex-option}@darkCyan}+ {{<NUMBER,STRING[,STRING]...>}@darkBlue}+  Root complex-option description",
    "",
  ]);
  expect(usage3).toStrictEqual([
    "{Subcommand 2 description}+",
    "{{Subcommand 2 details. Second line of subcommand 2 details.}-}*",
    "",
    "{{Usage:}@darkMagenta}+ {{my-cli}@darkCyan}+ {{<POS-1>}@darkBlue}+ {{<POS-2>}@darkBlue}+ {{sub2}@darkCyan}+ {{<POS-NUMBER>}@darkBlue}+ {{[OPT-POS]}@darkBlue}+ {{[VARIADIC]...}@darkBlue}+",
    "",
    "{{Parameters:}@darkGreen}+",
    "  {{<POS-1>}@darkBlue}+        Required parameter number 1",
    "  {{<POS-2>}@darkBlue}+        Required parameter number 2",
    "  {{<POS-NUMBER>}@darkBlue}+   Required parameter number",
    "  {{[OPT-POS]}@darkBlue}+      Optional parameter string",
    "  {{[VARIADIC]...}@darkBlue}+  Variadic parameters strings",
    "",
    "{{Options:}@darkGreen}+",
    "  {{-b}@darkCyan}+, {{--boolean-flag}@darkCyan}+{{[=no]}-}*                           Root boolean-flag description",
    "  {{-s}@darkCyan}+, {{--string-option}@darkCyan}+ {{<COOL-STUFF>}@darkBlue}+                  Root string-option description",
    "      {{--complex-option}@darkCyan}+ {{<NUMBER,STRING[,STRING]...>}@darkBlue}+  Root complex-option description",
    "      {{--dudu}@darkCyan}+ {{<STRING>}@darkBlue}+                               Dudu option description",
    "",
  ]);
});

async function getUsage<Context, Result>(
  args: Array<string>,
  command: Command<Context, Result>,
) {
  const readerArgs = new ReaderArgs(args);
  const commandRunner = command.createRunnerFromArgs(readerArgs);
  /*
  try {
    const interpreterInstance = interpreterFactory.createInterpreterInstance();
    console.log(await interpreterInstance.executeWithContext({} as Context));
  } catch (error) {
    console.error("Error during execution:", error);
  }
  */
  return usageToStyledLines({
    cliName: "my-cli",
    commandUsage: commandRunner.generateUsage(),
    typoSupport: TypoSupport.mock(),
  });
}

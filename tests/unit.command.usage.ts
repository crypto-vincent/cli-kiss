import { it } from "@jest/globals";
import {
  command,
  Command,
  commandChained,
  commandWithSubcommands,
  operation,
  optionFlag,
  optionRepeatable,
  optionSingleValue,
  positionalOptional,
  positionalRequired,
  positionalVariadics,
  ReaderArgs,
  typeList,
  typeNumber,
  typeString,
  typeTuple,
  TypoSupport,
  usageToStyledLines,
} from "../src";

const rootCommand = commandChained<any, any, any>(
  {
    description: "Root command description",
    details: ["Root command details.", "Root second line of command details."],
    examples: [
      {
        explanation: "Example usage of the root command",
        commandArgs: [{ positional: "42" }, { option: { short: "b" } }],
      },
    ],
  },
  operation(
    {
      options: {
        booleanFlag: optionFlag({
          short: "b",
          long: "boolean-flag",
          description: "boolean-flag description",
        }),
      },
      positionals: [
        positionalRequired({
          label: "POS-1",
          description: "Required positional number 1",
          type: typeNumber,
        }),
      ],
    },
    async (context, inputs) => {
      return { at: "root", context, inputs };
    },
  ),
  commandWithSubcommands<any, any, any>(
    {
      description: "Mid command description",
      details: ["Mid command details.", "Mid second line of command details."],
      examples: [
        {
          explanation: "Example usage of the mid command",
          commandArgs: [
            { positional: "42" },
            { option: { short: "b" } },
            { positional: "43" },
          ],
        },
      ],
    },
    operation(
      {
        options: {
          stringOption: optionSingleValue({
            short: "s",
            long: "string-option",
            type: typeString,
            default: () => undefined,
            label: "COOL-STUFF",
            description: "string-option description",
          }),
          complexOption: optionRepeatable({
            long: "complex-option",
            type: typeTuple([typeNumber, typeList(typeString)]),
            description: "complex-option description",
          }),
        },
        positionals: [
          positionalRequired({
            label: "POS-2",
            description: "Required positional number 2",
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
            "Subcommand 1 second line of details.",
          ],
          examples: [
            {
              explanation: "Example usage of subcommand 1",
              commandArgs: [
                { option: { short: "b" } },
                { positional: "42" },
                { positional: "43" },
                { subcommand: "sub1" },
                { positional: "valid" },
              ],
            },
          ],
        },
        operation(
          {
            options: {},
            positionals: [
              positionalRequired({
                label: "POS-STRING",
                description: "Required positional string",
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
          hint: "Subcommand 2 hint",
          details: [
            "Subcommand 2 details.",
            "Subcommand 2 second line of details.",
          ],
          examples: [
            {
              explanation: "Example usage of subcommand 2",
              commandArgs: [
                { positional: "40" },
                { positional: "41" },
                { subcommand: "sub2" },
                { option: { long: "dudu", value: "hello" } },
                { positional: "50" },
              ],
            },
          ],
        },
        operation(
          {
            options: {
              duduValue: optionSingleValue({
                long: "dudu",
                type: typeString,
                default: () => "duduDefault",
                hint: "Dudu option hint",
                description: "Dudu option description",
              }),
            },
            positionals: [
              positionalRequired({
                label: "POS-NUMBER",
                description: "Required positional number",
                type: typeNumber,
              }),
              positionalOptional({
                label: "OPT-POS",
                description: "Optional positional string",
                hint: "Optional positional hint",
                type: typeString,
                default: () => "42",
              }),
              positionalVariadics({
                label: "VARIADIC",
                description: "Variadic positionals strings",
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
  ),
);

it("run", async () => {
  const usage1 = await getUsage([], rootCommand);
  const usage2 = await getUsage(["50"], rootCommand);
  const usage3 = await getUsage(["50", "51"], rootCommand);
  const usage4 = await getUsage(["50", "51", "sub1"], rootCommand);
  const usage5 = await getUsage(["50", "51", "sub1", "valid"], rootCommand);
  const usage6 = await getUsage(
    ["40", "41", "sub2", "--doesn't-exist"],
    rootCommand,
  );
  const usage7 = await getUsage(
    ["40", "41", "sub2", "not-a-number"],
    rootCommand,
  );

  /*
  console.log(usage1.join("\n"));
  console.log(usage2.join("\n"));
  console.log(usage3.join("\n"));
  console.log(usage4.join("\n"));
  console.log(usage5.join("\n"));
  console.log(usage6.join("\n"));
  console.log(usage7.join("\n"));
   */

  const usageRoot = [
    "{{Usage:}@darkMagenta}+ {{my-cli}@darkCyan}+ {{<POS-1>}@darkBlue}+ {{[REST]...}@darkBlue}+",
    "",
    "{Root command description}+",
    "{{Root command details.}-}*",
    "{{Root second line of command details.}-}*",
    "",
    "{{Positionals:}@darkGreen}+",
    "  {{<POS-1>}@darkBlue}+  Required positional number 1",
    "",
    "{{Options:}@darkGreen}+",
    "  {{-b}@darkCyan}+, {{--boolean-flag}@darkCyan}+{{[=no]}-}*  boolean-flag description",
    "",
    "{{Examples:}@darkGreen}+",
    " {{# Example usage of the root command}-}*",
    " {{my-cli}@darkCyan}+ {{42}@darkBlue}+ {{-b}@darkCyan}+",
    "",
  ];
  const usageMid = [
    "{{Usage:}@darkMagenta}+ {{my-cli}@darkCyan}+ {{<POS-1>}@darkBlue}+ {{<POS-2>}@darkBlue}+ {{<SUBCOMMAND>}@darkBlue}+",
    "",
    "{Mid command description}+",
    "{{Mid command details.}-}*",
    "{{Mid second line of command details.}-}*",
    "",
    "{{Positionals:}@darkGreen}+",
    "  {{<POS-1>}@darkBlue}+  Required positional number 1",
    "  {{<POS-2>}@darkBlue}+  Required positional number 2",
    "",
    "{{Subcommands:}@darkGreen}+",
    "  {{sub1}@darkCyan}+  Subcommand 1 description",
    "  {{sub2}@darkCyan}+  Subcommand 2 description {{(Subcommand 2 hint)}-}*",
    "",
    "{{Options:}@darkGreen}+",
    "  {{-b}@darkCyan}+, {{--boolean-flag}@darkCyan}+{{[=no]}-}*                           boolean-flag description",
    "  {{-s}@darkCyan}+, {{--string-option}@darkCyan}+ {{<COOL-STUFF>}@darkBlue}+                  string-option description",
    "      {{--complex-option}@darkCyan}+ {{<NUMBER,STRING[,STRING]...>}@darkBlue}+  complex-option description",
    "",
    "{{Examples:}@darkGreen}+",
    " {{# Example usage of the mid command}-}*",
    " {{my-cli}@darkCyan}+ {{42}@darkBlue}+ {{-b}@darkCyan}+ {{43}@darkBlue}+",
    "",
  ];
  const usageSub1 = [
    "{{Usage:}@darkMagenta}+ {{my-cli}@darkCyan}+ {{<POS-1>}@darkBlue}+ {{<POS-2>}@darkBlue}+ {{sub1}@darkCyan}+ {{<POS-STRING>}@darkBlue}+",
    "",
    "{Subcommand 1 description}+",
    "{{Subcommand 1 details.}-}*",
    "{{Subcommand 1 second line of details.}-}*",
    "",
    "{{Positionals:}@darkGreen}+",
    "  {{<POS-1>}@darkBlue}+       Required positional number 1",
    "  {{<POS-2>}@darkBlue}+       Required positional number 2",
    "  {{<POS-STRING>}@darkBlue}+  Required positional string",
    "",
    "{{Options:}@darkGreen}+",
    "  {{-b}@darkCyan}+, {{--boolean-flag}@darkCyan}+{{[=no]}-}*                           boolean-flag description",
    "  {{-s}@darkCyan}+, {{--string-option}@darkCyan}+ {{<COOL-STUFF>}@darkBlue}+                  string-option description",
    "      {{--complex-option}@darkCyan}+ {{<NUMBER,STRING[,STRING]...>}@darkBlue}+  complex-option description",
    "",
    "{{Examples:}@darkGreen}+",
    " {{# Example usage of subcommand 1}-}*",
    " {{my-cli}@darkCyan}+ {{-b}@darkCyan}+ {{42}@darkBlue}+ {{43}@darkBlue}+ {{sub1}@darkCyan}+ {{valid}@darkBlue}+",
    "",
  ];
  const usageSub2 = [
    "{{Usage:}@darkMagenta}+ {{my-cli}@darkCyan}+ {{<POS-1>}@darkBlue}+ {{<POS-2>}@darkBlue}+ {{sub2}@darkCyan}+ {{<POS-NUMBER>}@darkBlue}+ {{[OPT-POS]}@darkBlue}+ {{[VARIADIC]...}@darkBlue}+",
    "",
    "{Subcommand 2 description}+ {{(Subcommand 2 hint)}-}*",
    "{{Subcommand 2 details.}-}*",
    "{{Subcommand 2 second line of details.}-}*",
    "",
    "{{Positionals:}@darkGreen}+",
    "  {{<POS-1>}@darkBlue}+        Required positional number 1",
    "  {{<POS-2>}@darkBlue}+        Required positional number 2",
    "  {{<POS-NUMBER>}@darkBlue}+   Required positional number",
    "  {{[OPT-POS]}@darkBlue}+      Optional positional string {{(Optional positional hint)}-}*",
    "  {{[VARIADIC]...}@darkBlue}+  Variadic positionals strings",
    "",
    "{{Options:}@darkGreen}+",
    "  {{-b}@darkCyan}+, {{--boolean-flag}@darkCyan}+{{[=no]}-}*                           boolean-flag description",
    "  {{-s}@darkCyan}+, {{--string-option}@darkCyan}+ {{<COOL-STUFF>}@darkBlue}+                  string-option description",
    "      {{--complex-option}@darkCyan}+ {{<NUMBER,STRING[,STRING]...>}@darkBlue}+  complex-option description",
    "      {{--dudu}@darkCyan}+ {{<STRING>}@darkBlue}+                               Dudu option description {{(Dudu option hint)}-}*",
    "",
    "{{Examples:}@darkGreen}+",
    " {{# Example usage of subcommand 2}-}*",
    " {{my-cli}@darkCyan}+ {{40}@darkBlue}+ {{41}@darkBlue}+ {{sub2}@darkCyan}+ {{--dudu}@darkCyan}+{{=}-}*{{hello}@darkBlue}+ {{50}@darkBlue}+",
    "",
  ];

  expect(usage1).toStrictEqual(usageRoot);
  expect(usage2).toStrictEqual(usageMid);
  expect(usage3).toStrictEqual(usageMid);
  expect(usage4).toStrictEqual(usageSub1);
  expect(usage5).toStrictEqual(usageSub1);
  expect(usage6).toStrictEqual(usageSub2);
  expect(usage7).toStrictEqual(usageSub2);
});

async function getUsage<Context, Result>(
  args: Array<string>,
  command: Command<Context, Result>,
) {
  const readerArgs = new ReaderArgs(args);
  const commandDecoder = command.consumeAndMakeDecoder(readerArgs);
  /*
  try {
    const interpreter = commandDecoder.decodeAndMakeInterpreter();
    const result = await interpreter.executeWithContext(
      "" as unknown as Context,
    );
    console.log(result);
  } catch (error) {
    console.log(TypoSupport.tty().computeStyledErrorMessage(error));
  }
    */
  return usageToStyledLines({
    cliName: "my-cli",
    commandUsage: commandDecoder.generateUsage(),
    typoSupport: TypoSupport.mock(),
  });
}

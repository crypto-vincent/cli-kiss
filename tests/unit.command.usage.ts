import { expect, it } from "@jest/globals";
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
  type,
  typeChoice,
  typeList,
  typeNumber,
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
        choiceOption: optionSingleValue({
          long: "choice-option",
          type: typeChoice("choice", ["unset", "choice1", "choice2"]),
          description: "choice-option description",
          fallbackValueIfAbsent: () => "unset",
        }),
        booleanFlag: optionFlag({
          short: "b",
          long: "boolean-flag",
          description: "boolean-flag description",
        }),
      },
      positionals: [
        positionalRequired({
          description: "Required positional number 1",
          type: typeNumber("pos-1"),
        }),
      ],
    },
    async function (context, inputs) {
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
            type: type("cool-stuff"),
            fallbackValueIfAbsent: () => undefined,
            description: "string-option description",
          }),
          complexOption: optionRepeatable({
            long: "complex-option",
            type: typeTuple([typeNumber(), typeList(type("string"))]),
            description: "complex-option description",
          }),
        },
        positionals: [
          positionalRequired({
            description: "Required positional number 2",
            type: typeNumber("pos-2"),
          }),
        ],
      },
      async function (context, inputs) {
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
                description: "Required positional string",
                type: type("pos-3.1"),
              }),
            ],
          },
          async function (context, inputs) {
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
                { option: { long: "dudu", inlined: "hello" } },
                { positional: "50" },
              ],
            },
            {
              explanation: "Example usage of subcommand 2",
              commandArgs: [
                { positional: "40" },
                { positional: "41" },
                { subcommand: "sub2" },
                { option: { long: "dudu", separated: ["hello"] } },
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
                type: type("dudu-value"),
                fallbackValueIfAbsent: () => "duduDefault",
                hint: "Dudu option hint",
                description: "Dudu option description",
              }),
              impliable: optionSingleValue({
                long: "impliable",
                type: type("text"),
                impliedValueIfNotInlined: () => "implied",
                fallbackValueIfAbsent: () => "absent",
              }),
            },
            positionals: [
              positionalRequired({
                description: "Required positional number",
                type: typeNumber("pos-3.2"),
              }),
              positionalOptional({
                description: "Optional positional string",
                hint: "Optional positional hint",
                type: type("pos-4"),
                default: () => "42",
              }),
              positionalVariadics({
                description: "Variadic positionals strings",
                type: type("pos-5"),
              }),
            ],
          },
          async function (context, inputs) {
            return { at: "sub2", context, inputs };
          },
        ),
      ),
    },
  ),
);

it("run", async function () {
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

  const usageRoot = [
    "{{Usage:}@darkMagenta}+ {{my-cli}@darkCyan}+ {{<pos-1>}@darkBlue}+ {{[REST]...}@darkBlue}+",
    "",
    "{Root command description}+",
    "{{Root command details.}-}*",
    "{{Root second line of command details.}-}*",
    "",
    "{{Positionals:}@darkGreen}+",
    "  {{<pos-1>}@darkBlue}+  Required positional number 1",
    "",
    "{{Options:}@darkGreen}+",
    "      {{--choice-option}@darkCyan}+ {{<choice>}@darkBlue}+  choice-option description",
    "  {{-b}@darkCyan}+, {{--boolean-flag}@darkCyan}+{{[=no]}-}*       boolean-flag description",
    "",
    "{{Examples:}@darkGreen}+",
    " {{# Example usage of the root command}-}*",
    " {{my-cli}@darkCyan}+ {{42}@darkBlue}+ {{-b}@darkCyan}+",
    "",
  ];
  const usageMid = [
    "{{Usage:}@darkMagenta}+ {{my-cli}@darkCyan}+ {{<pos-1>}@darkBlue}+ {{<pos-2>}@darkBlue}+ {{<subcommand>}@darkBlue}+",
    "",
    "{Mid command description}+",
    "{{Mid command details.}-}*",
    "{{Mid second line of command details.}-}*",
    "",
    "{{Positionals:}@darkGreen}+",
    "  {{<pos-1>}@darkBlue}+  Required positional number 1",
    "  {{<pos-2>}@darkBlue}+  Required positional number 2",
    "",
    "{{Subcommands:}@darkGreen}+",
    "  {{sub1}@darkCyan}+  Subcommand 1 description",
    "  {{sub2}@darkCyan}+  Subcommand 2 description {{(Subcommand 2 hint)}-}*",
    "",
    "{{Options:}@darkGreen}+",
    "      {{--choice-option}@darkCyan}+ {{<choice>}@darkBlue}+                          choice-option description",
    "  {{-b}@darkCyan}+, {{--boolean-flag}@darkCyan}+{{[=no]}-}*                               boolean-flag description",
    "  {{-s}@darkCyan}+, {{--string-option}@darkCyan}+ {{<cool-stuff>}@darkBlue}+                      string-option description",
    "      {{--complex-option}@darkCyan}+ {{<number,string[,string]...>}@darkBlue}+{{ [*]}-}*  complex-option description",
    "",
    "{{Examples:}@darkGreen}+",
    " {{# Example usage of the mid command}-}*",
    " {{my-cli}@darkCyan}+ {{42}@darkBlue}+ {{-b}@darkCyan}+ {{43}@darkBlue}+",
    "",
  ];
  const usageSub1 = [
    "{{Usage:}@darkMagenta}+ {{my-cli}@darkCyan}+ {{<pos-1>}@darkBlue}+ {{<pos-2>}@darkBlue}+ {{sub1}@darkCyan}+ {{<pos-3.1>}@darkBlue}+",
    "",
    "{Subcommand 1 description}+",
    "{{Subcommand 1 details.}-}*",
    "{{Subcommand 1 second line of details.}-}*",
    "",
    "{{Positionals:}@darkGreen}+",
    "  {{<pos-1>}@darkBlue}+    Required positional number 1",
    "  {{<pos-2>}@darkBlue}+    Required positional number 2",
    "  {{<pos-3.1>}@darkBlue}+  Required positional string",
    "",
    "{{Options:}@darkGreen}+",
    "      {{--choice-option}@darkCyan}+ {{<choice>}@darkBlue}+                          choice-option description",
    "  {{-b}@darkCyan}+, {{--boolean-flag}@darkCyan}+{{[=no]}-}*                               boolean-flag description",
    "  {{-s}@darkCyan}+, {{--string-option}@darkCyan}+ {{<cool-stuff>}@darkBlue}+                      string-option description",
    "      {{--complex-option}@darkCyan}+ {{<number,string[,string]...>}@darkBlue}+{{ [*]}-}*  complex-option description",
    "",
    "{{Examples:}@darkGreen}+",
    " {{# Example usage of subcommand 1}-}*",
    " {{my-cli}@darkCyan}+ {{-b}@darkCyan}+ {{42}@darkBlue}+ {{43}@darkBlue}+ {{sub1}@darkCyan}+ {{valid}@darkBlue}+",
    "",
  ];
  const usageSub2 = [
    "{{Usage:}@darkMagenta}+ {{my-cli}@darkCyan}+ {{<pos-1>}@darkBlue}+ {{<pos-2>}@darkBlue}+ {{sub2}@darkCyan}+ {{<pos-3.2>}@darkBlue}+ {{[pos-4]}@darkBlue}+ {{[pos-5]...}@darkBlue}+",
    "",
    "{Subcommand 2 description}+ {{(Subcommand 2 hint)}-}*",
    "{{Subcommand 2 details.}-}*",
    "{{Subcommand 2 second line of details.}-}*",
    "",
    "{{Positionals:}@darkGreen}+",
    "  {{<pos-1>}@darkBlue}+     Required positional number 1",
    "  {{<pos-2>}@darkBlue}+     Required positional number 2",
    "  {{<pos-3.2>}@darkBlue}+   Required positional number",
    "  {{[pos-4]}@darkBlue}+     Optional positional string {{(Optional positional hint)}-}*",
    "  {{[pos-5]...}@darkBlue}+  Variadic positionals strings",
    "",
    "{{Options:}@darkGreen}+",
    "      {{--choice-option}@darkCyan}+ {{<choice>}@darkBlue}+                          choice-option description",
    "  {{-b}@darkCyan}+, {{--boolean-flag}@darkCyan}+{{[=no]}-}*                               boolean-flag description",
    "  {{-s}@darkCyan}+, {{--string-option}@darkCyan}+ {{<cool-stuff>}@darkBlue}+                      string-option description",
    "      {{--complex-option}@darkCyan}+ {{<number,string[,string]...>}@darkBlue}+{{ [*]}-}*  complex-option description",
    "      {{--dudu}@darkCyan}+ {{<dudu-value>}@darkBlue}+                               Dudu option description {{(Dudu option hint)}-}*",
    "      {{--impliable}@darkCyan}+{{[=text]}-}*",
    "",
    "{{Examples:}@darkGreen}+",
    " {{# Example usage of subcommand 2}-}*",
    " {{my-cli}@darkCyan}+ {{40}@darkBlue}+ {{41}@darkBlue}+ {{sub2}@darkCyan}+ {{--dudu}@darkCyan}+{{=}-}*{{hello}@darkBlue}+ {{50}@darkBlue}+",
    " {{# Example usage of subcommand 2}-}*",
    " {{my-cli}@darkCyan}+ {{40}@darkBlue}+ {{41}@darkBlue}+ {{sub2}@darkCyan}+ {{--dudu}@darkCyan}+ {{hello}@darkBlue}+ {{50}@darkBlue}+",
    "",
  ];

  /*
  console.log(usage1.join("\n"));
  console.log(usage2.join("\n"));
  console.log(usage3.join("\n"));
  console.log(usage4.join("\n"));
  console.log(usage5.join("\n"));
  console.log(usage6.join("\n"));
  console.log(usage7.join("\n"));
   */

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
  return usageToStyledLines({
    cliName: "my-cli",
    usage: commandDecoder.generateUsage(),
    typoSupport: TypoSupport.mock(),
  });
}

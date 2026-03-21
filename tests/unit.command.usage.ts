import { it } from "@jest/globals";
import {
  command,
  Command,
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

const cmd = commandWithSubcommands<string, any, any>(
  {
    description: "Root command description",
    details: ["Root command details.", "Second line of root command details."],
  },
  operation(
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
          type: typeTuple([typeNumber, typeList(typeString)]),
          description: "Root complex-option description",
        }),
      },
      positionals: [
        positionalRequired({
          label: "POS-1",
          description: "Required positional number 1",
          type: typeNumber,
        }),
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
          "Second line of subcommand 1 details.",
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
          "Second line of subcommand 2 details.",
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
    "{{Usage:}@darkMagenta}+ {{my-cli}@darkCyan}+ {{<POS-1>}@darkBlue}+ {{<POS-2>}@darkBlue}+ {{<SUBCOMMAND>}@darkBlue}+",
    "",
    "{Root command description}+",
    "{{Root command details.}-}*",
    "{{Second line of root command details.}-}*",
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
    "  {{-b}@darkCyan}+, {{--boolean-flag}@darkCyan}+{{[=no]}-}*                           Root boolean-flag description",
    "  {{-s}@darkCyan}+, {{--string-option}@darkCyan}+ {{<COOL-STUFF>}@darkBlue}+                  Root string-option description",
    "      {{--complex-option}@darkCyan}+ {{<NUMBER,STRING[,STRING]...>}@darkBlue}+  Root complex-option description",
    "",
  ]);
  expect(usage2).toStrictEqual([
    "{{Usage:}@darkMagenta}+ {{my-cli}@darkCyan}+ {{<POS-1>}@darkBlue}+ {{<POS-2>}@darkBlue}+ {{sub1}@darkCyan}+ {{<POS-STRING>}@darkBlue}+",
    "",
    "{Subcommand 1 description}+",
    "{{Subcommand 1 details.}-}*",
    "{{Second line of subcommand 1 details.}-}*",
    "",
    "{{Positionals:}@darkGreen}+",
    "  {{<POS-1>}@darkBlue}+       Required positional number 1",
    "  {{<POS-2>}@darkBlue}+       Required positional number 2",
    "  {{<POS-STRING>}@darkBlue}+  Required positional string",
    "",
    "{{Options:}@darkGreen}+",
    "  {{-b}@darkCyan}+, {{--boolean-flag}@darkCyan}+{{[=no]}-}*                           Root boolean-flag description",
    "  {{-s}@darkCyan}+, {{--string-option}@darkCyan}+ {{<COOL-STUFF>}@darkBlue}+                  Root string-option description",
    "      {{--complex-option}@darkCyan}+ {{<NUMBER,STRING[,STRING]...>}@darkBlue}+  Root complex-option description",
    "",
  ]);
  expect(usage3).toStrictEqual([
    "{{Usage:}@darkMagenta}+ {{my-cli}@darkCyan}+ {{<POS-1>}@darkBlue}+ {{<POS-2>}@darkBlue}+ {{sub2}@darkCyan}+ {{<POS-NUMBER>}@darkBlue}+ {{[OPT-POS]}@darkBlue}+ {{[VARIADIC]...}@darkBlue}+",
    "",
    "{Subcommand 2 description}+ {{(Subcommand 2 hint)}-}*",
    "{{Subcommand 2 details.}-}*",
    "{{Second line of subcommand 2 details.}-}*",
    "",
    "{{Positionals:}@darkGreen}+",
    "  {{<POS-1>}@darkBlue}+        Required positional number 1",
    "  {{<POS-2>}@darkBlue}+        Required positional number 2",
    "  {{<POS-NUMBER>}@darkBlue}+   Required positional number",
    "  {{[OPT-POS]}@darkBlue}+      Optional positional string {{(Optional positional hint)}-}*",
    "  {{[VARIADIC]...}@darkBlue}+  Variadic positionals strings",
    "",
    "{{Options:}@darkGreen}+",
    "  {{-b}@darkCyan}+, {{--boolean-flag}@darkCyan}+{{[=no]}-}*                           Root boolean-flag description",
    "  {{-s}@darkCyan}+, {{--string-option}@darkCyan}+ {{<COOL-STUFF>}@darkBlue}+                  Root string-option description",
    "      {{--complex-option}@darkCyan}+ {{<NUMBER,STRING[,STRING]...>}@darkBlue}+  Root complex-option description",
    "      {{--dudu}@darkCyan}+ {{<STRING>}@darkBlue}+                               Dudu option description {{(Dudu option hint)}-}*",
    "",
  ]);
});

async function getUsage<Context, Result>(
  args: Array<string>,
  command: Command<Context, Result>,
) {
  const readerArgs = new ReaderArgs(args);
  const commandFactory = command.createFactory(readerArgs);
  return usageToStyledLines({
    cliName: "my-cli",
    commandUsage: commandFactory.generateUsage(),
    typoSupport: TypoSupport.mock(),
  });
}

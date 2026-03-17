import { it } from "@jest/globals";
import {
  argumentOptional,
  argumentRequired,
  argumentVariadics,
  Command,
  command,
  commandWithSubcommands,
  execution,
  optionFlag,
  optionRepeatable,
  optionSingleValue,
  ReaderTokenizer,
  typeNumber,
  typeString,
} from "../src";
import { usageToPrintableLines } from "../src/lib/Usage";

const cmd = commandWithSubcommands<string, any, any>(
  {
    title: "Root command title",
    description: [
      "Root command description",
      "Second line of root command description",
    ],
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
        numberOption: optionRepeatable({
          short: "n",
          long: "number-option",
          type: typeNumber,
          description: "Root number-option description",
        }),
      },
      arguments: [
        argumentRequired({
          label: "POS-1",
          description: "First positional argument",
          type: typeNumber,
        }),
        argumentRequired({
          label: "POS-2",
          description: "Second positional argument",
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
        title: "Subcommand 1 title",
        description: [
          "Subcommand 1 description",
          "Second line of subcommand 1 description",
        ],
      },
      execution(
        {
          options: {},
          arguments: [
            argumentRequired({
              label: "POS-STRING",
              description: "Positional string argument",
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
        title: "Subcommand 2 title",
        description: [
          "Subcommand 2 description",
          "Second line of subcommand 2 description",
        ],
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
          arguments: [
            argumentRequired({
              label: "POS-NUMBER",
              description: "Positional number argument",
              type: typeNumber,
            }),
            argumentOptional({
              label: "OPT-POS",
              description: "Optional positional argument",
              type: typeString,
              default: () => "42",
            }),
            argumentVariadics({
              label: "VARIADIC-POSS",
              description: "Variadic positional arguments",
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
  const usage1 = getUsage([], cmd);
  expect(usage1).toStrictEqual([
    "",
    "{Root command title}+",
    "{Root command description}@grey",
    "{Second line of root command description}@grey",
    "",
    "{Usage:}@green+ {my-cli}@cyan+ {<POS-1>}@cyan {<POS-2>}@cyan {<SUBCOMMAND>}@cyan+",
    "",
    "{Arguments:}@green+",
    " {<POS-1>}@cyan  {First positional argument}+",
    " {<POS-2>}@cyan  {Second positional argument}+",
    "",
    "{Options:}@green+",
    " {-b}@cyan+{,} {--boolean-flag}@cyan+{[=yes|no]}@grey       {Root boolean-flag description}+",
    " {-s}@cyan+{,} {--string-option }@cyan+{<COOL-STUFF>}@cyan  {Root string-option description}+",
    " {-n}@cyan+{,} {--number-option }@cyan+{<NUMBER>}@cyan      {Root number-option description}+",
    "",
    "{Subcommands:}@green+",
    " {sub1}@cyan+  {Subcommand 1 title}+",
    " {sub2}@cyan+  {Subcommand 2 title}+",
    "",
  ]);

  const usage2 = getUsage(["50", "51", "sub1", "final"], cmd);
  expect(usage2).toStrictEqual([
    "",
    "{Subcommand 1 title}+",
    "{Subcommand 1 description}@grey",
    "{Second line of subcommand 1 description}@grey",
    "",
    "{Usage:}@green+ {my-cli}@cyan+ {<POS-1>}@cyan {<POS-2>}@cyan {sub1}@cyan+ {<POS-STRING>}@cyan",
    "",
    "{Arguments:}@green+",
    " {<POS-1>}@cyan       {First positional argument}+",
    " {<POS-2>}@cyan       {Second positional argument}+",
    " {<POS-STRING>}@cyan  {Positional string argument}+",
    "",
    "{Options:}@green+",
    " {-b}@cyan+{,} {--boolean-flag}@cyan+{[=yes|no]}@grey       {Root boolean-flag description}+",
    " {-s}@cyan+{,} {--string-option }@cyan+{<COOL-STUFF>}@cyan  {Root string-option description}+",
    " {-n}@cyan+{,} {--number-option }@cyan+{<NUMBER>}@cyan      {Root number-option description}+",
    "",
  ]);

  const usage3 = getUsage(
    [
      "40",
      "41",
      "sub2",
      "--string-option=hello",
      "--number-option",
      "123",
      "--number-option",
      "1234",
      "88.88",
      "a,b",
      "final",
      "--boolean-flag",
    ],
    cmd,
  );
  expect(usage3).toStrictEqual([
    "",
    "{Subcommand 2 title}+",
    "{Subcommand 2 description}@grey",
    "{Second line of subcommand 2 description}@grey",
    "",
    "{Usage:}@green+ {my-cli}@cyan+ {<POS-1>}@cyan {<POS-2>}@cyan {sub2}@cyan+ {<POS-NUMBER>}@cyan {[OPT-POS]}@cyan {[VARIADIC-POSS...]}@cyan",
    "",
    "{Arguments:}@green+",
    " {<POS-1>}@cyan             {First positional argument}+",
    " {<POS-2>}@cyan             {Second positional argument}+",
    " {<POS-NUMBER>}@cyan        {Positional number argument}+",
    " {[OPT-POS]}@cyan           {Optional positional argument}+",
    " {[VARIADIC-POSS...]}@cyan  {Variadic positional arguments}+",
    "",
    "{Options:}@green+",
    " {-b}@cyan+{,} {--boolean-flag}@cyan+{[=yes|no]}@grey       {Root boolean-flag description}+",
    " {-s}@cyan+{,} {--string-option }@cyan+{<COOL-STUFF>}@cyan  {Root string-option description}+",
    " {-n}@cyan+{,} {--number-option }@cyan+{<NUMBER>}@cyan      {Root number-option description}+",
    "     {--dudu }@cyan+{<STRING>}@cyan               {Dudu option description}+",
    "",
  ]);
});

function getUsage<Context, Result>(
  argv: Array<string>,
  command: Command<Context, Result>,
) {
  const commandRunner = command.prepareRunner(new ReaderTokenizer(argv));
  return usageToPrintableLines({
    cliName: "my-cli",
    commandUsage: commandRunner.computeUsage(),
    typoSupport: "mock",
  });
}

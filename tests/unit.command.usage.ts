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
  typeCommaList,
  typeCommaTuple,
  typeNumber,
  typeString,
} from "../src";
import { usageToPrintableLines } from "../src/lib/Usage";

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
        description: "Subcommand 1 description",
        details: [
          "Subcommand 1 details.",
          "Second line of subcommand 1 details.",
        ].join(" "),
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
              label: "VARIADIC",
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
  const usage1 = await getUsage([], cmd);
  // console.log(usage1.join("\n"));
  expect(usage1).toStrictEqual([
    "{Root command description}+",
    "{Root command details. Second line of root command details.}@brightBlack",
    "",
    "{Usage:}@brightMagenta+ {my-cli}@brightCyan+ {<POS-1>}@brightBlue {<POS-2>}@brightBlue {<SUBCOMMAND>}@brightCyan+",
    "",
    "{Arguments:}@brightGreen+",
    "{  }{<POS-1>}@brightBlue{  }{First positional argument}+",
    "{  }{<POS-2>}@brightBlue{  }{Second positional argument}+",
    "",
    "{Subcommands:}@brightGreen+",
    "{  }{sub1}@brightCyan+{  }{Subcommand 1 description}+",
    "{  }{sub2}@brightCyan+{  }{Subcommand 2 description}+",
    "",
    "{Options:}@brightGreen+",
    "{  }{-b}@brightCyan+{, }{--boolean-flag}@brightCyan+                              {  }{Root boolean-flag description}+",
    "{  }{-s}@brightCyan+{, }{--string-option }@brightCyan+{<COOL-STUFF>}@brightBlue                {  }{Root string-option description}+",
    "{  }    {--complex-option }@brightCyan+{<NUMBER,STRING[,STRING...]>}@brightBlue{  }{Root complex-option description}+",
    "",
  ]);

  const usage2 = await getUsage(["50", "51", "sub1", "final"], cmd);
  expect(usage2).toStrictEqual([
    "{Subcommand 1 description}+",
    "{Subcommand 1 details. Second line of subcommand 1 details.}@brightBlack",
    "",
    "{Usage:}@brightMagenta+ {my-cli}@brightCyan+ {<POS-1>}@brightBlue {<POS-2>}@brightBlue {sub1}@brightCyan+ {<POS-STRING>}@brightBlue",
    "",
    "{Arguments:}@brightGreen+",
    "{  }{<POS-1>}@brightBlue     {  }{First positional argument}+",
    "{  }{<POS-2>}@brightBlue     {  }{Second positional argument}+",
    "{  }{<POS-STRING>}@brightBlue{  }{Positional string argument}+",
    "",
    "{Options:}@brightGreen+",
    "{  }{-b}@brightCyan+{, }{--boolean-flag}@brightCyan+                              {  }{Root boolean-flag description}+",
    "{  }{-s}@brightCyan+{, }{--string-option }@brightCyan+{<COOL-STUFF>}@brightBlue                {  }{Root string-option description}+",
    "{  }    {--complex-option }@brightCyan+{<NUMBER,STRING[,STRING...]>}@brightBlue{  }{Root complex-option description}+",
    "",
  ]);

  const usage3 = await getUsage(
    [
      "40",
      "41",
      "sub2",
      "--complex-option=42,hello,world",
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
    "{Subcommand 2 description}+",
    "{Subcommand 2 details. Second line of subcommand 2 details.}@brightBlack",
    "",
    "{Usage:}@brightMagenta+ {my-cli}@brightCyan+ {<POS-1>}@brightBlue {<POS-2>}@brightBlue {sub2}@brightCyan+ {<POS-NUMBER>}@brightBlue {[OPT-POS]}@brightBlue {[VARIADIC...]}@brightBlue",
    "",
    "{Arguments:}@brightGreen+",
    "{  }{<POS-1>}@brightBlue      {  }{First positional argument}+",
    "{  }{<POS-2>}@brightBlue      {  }{Second positional argument}+",
    "{  }{<POS-NUMBER>}@brightBlue {  }{Positional number argument}+",
    "{  }{[OPT-POS]}@brightBlue    {  }{Optional positional argument}+",
    "{  }{[VARIADIC...]}@brightBlue{  }{Variadic positional arguments}+",
    "",
    "{Options:}@brightGreen+",
    "{  }{-b}@brightCyan+{, }{--boolean-flag}@brightCyan+                              {  }{Root boolean-flag description}+",
    "{  }{-s}@brightCyan+{, }{--string-option }@brightCyan+{<COOL-STUFF>}@brightBlue                {  }{Root string-option description}+",
    "{  }    {--complex-option }@brightCyan+{<NUMBER,STRING[,STRING...]>}@brightBlue{  }{Root complex-option description}+",
    "{  }    {--dudu }@brightCyan+{<STRING>}@brightBlue                             {  }{Dudu option description}+",
    "",
  ]);
});

async function getUsage<Context, Result>(
  args: Array<string>,
  command: Command<Context, Result>,
) {
  const readerTokenizer = new ReaderTokenizer(args);
  const commandInterpreter = command.buildInterpreter(readerTokenizer);
  /*
  try {
    console.log(await commandInterpreter.execute({} as Context));
  } catch (error) {
    console.error("Error during execution:", error);
  }
    */
  return usageToPrintableLines({
    cliName: "my-cli",
    commandUsage: commandInterpreter.computeUsage(),
    typoSupport: "mock",
  });
}

import { it } from "@jest/globals";
import {
  argumentOptional,
  argumentRequired,
  argumentVariadics,
  Command,
  command,
  commandWithSubcommands,
  optionFlag,
  optionRepeatable,
  optionSingleValue,
  processor,
  ReaderTokenizer,
  typeNumber,
  typeString,
} from "../src";
import { usageFormatter } from "../src/lib/Usage";

const cmd = commandWithSubcommands<string, any, any>(
  "Root command description",
  processor(
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
          label: "COOL_STUFF",
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
          label: "POSITIONAL-1",
          description: "First positional argument",
          type: typeNumber,
        }),
        argumentRequired({
          label: "POSITIONAL-2",
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
      "Subcommand 1 description",
      processor(
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
      "Subcommand 2 description",
      processor(
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
              label: "OPT-POSITIONAL",
              description: "Optional positional argument",
              type: typeString,
              default: () => "42",
            }),
            argumentVariadics({
              label: "VARIADIC-POSITIONALS",
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
  const res0 = getUsage([], cmd);
  console.log(res0);

  const res1 = getUsage(["50", "51", "sub1", "final"], cmd);
  console.log(res1);
  //expect(res1).toStrictEqual({});

  const res2 = getUsage(
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
  console.log(res2);
});

function getUsage<Context, Result>(
  argv: Array<string>,
  command: Command<Context, Result>,
) {
  const commandRunner = command.prepareRunner(
    new ReaderTokenizer(["node", "script", ...argv]),
  );
  return usageFormatter("my-cli", commandRunner.computeUsage());
}

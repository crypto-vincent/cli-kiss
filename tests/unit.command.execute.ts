import { expect, it } from "@jest/globals";
import {
  Command,
  command,
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
} from "../src";

const rootCommand = commandWithSubcommands<string, any, any>(
  { description: "Root command description" },
  operation(
    {
      options: {
        booleanFlag: optionFlag({ long: "boolean-flag", default: () => false }),
        stringOption: optionSingleValue({
          long: "string-option",
          type: typeString,
          default: () => undefined,
        }),
        numberOption: optionRepeatable({
          long: "number-option",
          type: typeList(typeNumber),
        }),
      },
      positionals: [
        positionalRequired({ type: typeNumber }),
        positionalRequired({ type: typeNumber }),
      ],
    },
    async (context, inputs) => {
      return { at: "root", context, inputs };
    },
  ),
  {
    sub1: command(
      { description: "Subcommand 1 description" },
      operation(
        {
          options: {},
          positionals: [positionalRequired({ type: typeString })],
        },
        async (context, inputs) => {
          return { at: "sub1", context, inputs };
        },
      ),
    ),
    sub2: command(
      { description: "Subcommand 2 description" },
      operation(
        {
          options: {},
          positionals: [
            positionalRequired({ type: typeNumber }),
            positionalOptional({ type: typeString, default: () => "42" }),
            positionalVariadics({ type: typeString }),
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
  const res1 = await executeInterpreted(
    ["50", "51", "sub1", "final"],
    "Run Context Input",
    rootCommand,
  );
  expect(res1).toStrictEqual({
    context: {
      context: "Run Context Input",
      inputs: {
        options: {
          booleanFlag: false,
          stringOption: undefined,
          numberOption: [],
        },
        positionals: [50, 51],
      },
      at: "root",
    },
    inputs: {
      options: {},
      positionals: ["final"],
    },
    at: "sub1",
  });

  const res2 = await executeInterpreted(
    [
      "40",
      "41",
      "sub2",
      "--string-option=hello",
      "--number-option",
      "123.1,123.2",
      "--number-option",
      "123.3",
      "88.88",
      "a,b",
      "final",
      "--boolean-flag",
    ],
    "Run Context Input",
    rootCommand,
  );
  expect(res2).toStrictEqual({
    context: {
      context: "Run Context Input",
      inputs: {
        options: {
          booleanFlag: true,
          stringOption: "hello",
          numberOption: [[123.1, 123.2], [123.3]],
        },
        positionals: [40, 41],
      },
      at: "root",
    },
    inputs: {
      options: {},
      positionals: [88.88, "a,b", ["final"]],
    },
    at: "sub2",
  });
});

async function executeInterpreted<Context, Result>(
  positionals: Array<string>,
  context: Context,
  command: Command<Context, Result>,
) {
  const readerArgs = new ReaderArgs(positionals);
  const commandRunner = command.createRunnerFromArgs(readerArgs);
  return await commandRunner.executeWithContext(context);
}

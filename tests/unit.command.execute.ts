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
  typeList,
  typeNumber,
  typeString,
} from "../src";

const rootCommand = commandChained(
  { description: "?" },
  operation(
    {
      options: { flag: optionFlag({ short: "b", long: "boolean-flag" }) },
      positionals: [positionalRequired({ label: "POS-1", type: typeNumber })],
    },
    async (context, inputs) => {
      return { at: "root", context, inputs };
    },
  ),
  commandWithSubcommands<any, any, any>(
    { description: "?" },
    operation(
      {
        options: {
          string: optionSingleValue({
            long: "string-option",
            type: typeString,
            default: () => undefined,
          }),
          number: optionRepeatable({
            long: "number-option",
            type: typeList(typeNumber),
          }),
        },
        positionals: [positionalRequired({ type: typeNumber })],
      },
      async (context, inputs) => {
        return { at: "mid", context, inputs };
      },
    ),
    {
      sub1: command(
        { description: "?" },
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
        { description: "?" },
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
  ),
);

it("run", async () => {
  const res1 = await executeInterpreted(
    ["50", "51", "sub1", "final"],
    "Run Context Input",
    rootCommand,
  );
  expect(res1).toStrictEqual({
    at: "sub1",
    context: {
      at: "mid",
      context: {
        at: "root",
        context: "Run Context Input",
        inputs: {
          options: { flag: false },
          positionals: [50],
        },
      },
      inputs: {
        options: { string: undefined, number: [] },
        positionals: [51],
      },
    },
    inputs: {
      options: {},
      positionals: ["final"],
    },
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
    at: "sub2",
    context: {
      at: "mid",
      context: {
        at: "root",
        context: "Run Context Input",
        inputs: {
          options: { flag: true },
          positionals: [40],
        },
      },
      inputs: {
        options: { string: "hello", number: [[123.1, 123.2], [123.3]] },
        positionals: [41],
      },
    },
    inputs: {
      options: {},
      positionals: [88.88, "a,b", ["final"]],
    },
  });
});

async function executeInterpreted<Context, Result>(
  args: Array<string>,
  context: Context,
  command: Command<Context, Result>,
) {
  const readerArgs = new ReaderArgs(args);
  const commandDecoder = command.consumeAndMakeDecoder(readerArgs);
  const commandInterpreter = commandDecoder.decodeAndMakeInterpreter();
  return await commandInterpreter.executeWithContext(context);
}

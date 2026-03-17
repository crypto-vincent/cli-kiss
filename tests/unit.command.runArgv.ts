import { expect, it } from "@jest/globals";
import {
  argumentOptional,
  argumentRequired,
  argumentVariadics,
  command,
  commandWithSubcommands,
  execution,
  optionFlag,
  optionRepeatable,
  optionSingleValue,
  runCommand,
  typeCommaList,
  typeNumber,
  typeString,
} from "../src";

const cmd = commandWithSubcommands<string, any, any>(
  { description: "Root command description" },
  execution(
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
          type: typeCommaList(typeNumber),
        }),
      },
      arguments: [
        argumentRequired({ type: typeNumber }),
        argumentRequired({ type: typeNumber }),
      ],
    },
    async (context, inputs) => {
      return { at: "root", context, inputs };
    },
  ),
  {
    sub1: command(
      { description: "Subcommand 1 description" },
      execution(
        {
          options: {},
          arguments: [argumentRequired({ type: typeString })],
        },
        async (context, inputs) => {
          return { at: "sub1", context, inputs };
        },
      ),
    ),
    sub2: command(
      { description: "Subcommand 2 description" },
      execution(
        {
          options: {},
          arguments: [
            argumentRequired({ type: typeNumber }),
            argumentOptional({ type: typeString, default: () => "42" }),
            argumentVariadics({ type: typeString }),
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
  const res1 = await runCommand(
    "script",
    ["50", "51", "sub1", "final"],
    "Run Context Input",
    cmd,
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
        arguments: [50, 51],
      },
      at: "root",
    },
    inputs: {
      options: {},
      arguments: ["final"],
    },
    at: "sub1",
  });

  const res2 = await runCommand(
    "script",
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
    cmd,
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
        arguments: [40, 41],
      },
      at: "root",
    },
    inputs: {
      options: {},
      arguments: [88.88, "a,b", ["final"]],
    },
    at: "sub2",
  });
});

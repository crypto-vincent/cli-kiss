import { expect, it } from "@jest/globals";
import {
  argumentOptional,
  argumentRequired,
  argumentVariadics,
  command,
  commandWithSubcommands,
  optionFlag,
  optionRepeatable,
  optionSingleValue,
  processor,
  runWithArgv,
  typeNumber,
  typeString,
} from "../src";

const cmd = commandWithSubcommands<string, any, any>(
  "Root command description",
  processor(
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
          type: typeNumber,
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
      "Subcommand 1 description",
      processor(
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
      "Subcommand 2 description",
      processor(
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
  const res1 = await runWithArgv(
    ["node", "script", "50", "51", "sub1", "final"],
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

  const res2 = await runWithArgv(
    [
      "node",
      "script",
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
          numberOption: [123, 1234],
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

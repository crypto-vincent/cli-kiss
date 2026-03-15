import { expect, it } from "@jest/globals";
import { run } from "../src";
import { argSingle } from "../src/Arg";
import {
  commandSimple,
  commandWithSubcommands,
  commandWithVariadics,
} from "../src/Command";
import { flag } from "../src/Flag";
import { optionMultipleValues, optionSingleValue } from "../src/Option";
import { variadics } from "../src/Variadics";

const decoderString = (arg: string) => String(arg);
const decoderNumber = (arg: string) => Number(arg);
const decoderBigInt = (arg: string) => BigInt(arg);

const cmd = commandWithSubcommands({
  flags: {
    booleanFlag: flag({ long: "boolean-flag" }),
  },
  options: {
    stringOption: optionSingleValue({
      long: "string-option",
      decoder: decoderString,
    }),
    numberOption: optionMultipleValues({
      long: "number-option",
      decoder: decoderNumber,
    }),
  },
  args: [
    argSingle({ name: "positional1", decoder: decoderNumber }),
    argSingle({ name: "positional2", decoder: decoderBigInt }),
  ],
  handler: async (inputs) => {
    console.log("root process", inputs);
    return "root result";
  },
  subcommands: {
    sub1: commandSimple({
      flags: {},
      options: {},
      args: [argSingle({ name: "subPositional1", decoder: decoderNumber })],
      handler: async (inputs) => {
        console.log("sub1 process", inputs);
        return "sub1 result";
      },
    }),
    sub2: commandWithVariadics({
      flags: {},
      options: {},
      args: [argSingle({ name: "subPositional1", decoder: decoderNumber })],
      variadics: variadics([], { decoder: (value) => value }),
      handler: async (inputs) => {
        console.log("sub2 process", inputs);
        return "sub2 result";
      },
    }),
  },
});

it("run", async () => {
  const res = await run(
    [
      "node",
      "script",
      "40",
      "41",
      "sub2",
      "--string-option=hello",
      "--number-option",
      "123",
      "88.88",
      "a,b",
      "--boolean-flag",
    ],
    "dudu",
    cmd,
  );
  console.log("Final:", res);
  expect(true).toBe(true);
});

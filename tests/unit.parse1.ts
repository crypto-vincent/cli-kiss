import { expect, it } from "@jest/globals";
import {
  argSingle,
  commandWithFixedArgs,
  commandWithSubcommand,
  commandWithVariadics,
  flag,
  optionMultipleValues,
  optionSingleValue,
  runWithArgv,
  variadics,
} from "../src";

// TODO - support completions generation ??

const decoderString = (arg: string) => String(arg);
const decoderNumber = (arg: string) => Number(arg);

const cmd = commandWithSubcommand({
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
    argSingle({ name: "positional2", decoder: decoderNumber }),
  ],
  handler: async (context: string, inputs) => {
    return { root: { context, inputs } };
  },
  subcommands: {
    sub1: commandWithFixedArgs({
      flags: {},
      options: {},
      args: [argSingle({ name: "subPositional1", decoder: decoderNumber })],
      handler: async (context: {}, inputs) => {
        return { sub: { context, inputs }, from: "sub1" };
      },
    }),
    sub2: commandWithVariadics({
      flags: {},
      options: {},
      args: [argSingle({ name: "subPositional1", decoder: decoderNumber })],
      variadics: variadics({
        optionals: [{ decoder: (value) => value }],
        rests: { decoder: (value) => value },
      }),
      handler: async (context: {}, inputs) => {
        return { sub: { context, inputs }, from: "sub2" };
      },
    }),
  },
});

it("run", async () => {
  const res = await runWithArgv(
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
      "final",
    ],
    "Run Context Input",
    cmd,
  );
  expect(res).toStrictEqual({
    from: "sub2",
    sub: {
      context: {
        root: {
          context: "Run Context Input",
          inputs: {
            flags: { booleanFlag: true },
            options: { stringOption: "hello", numberOption: [123] },
            args: [40, 41],
          },
        },
      },
      inputs: {
        flags: {},
        options: {},
        args: [88.88],
        variadics: { optionals: ["a,b"], rests: ["final"] },
      },
    },
  });
});

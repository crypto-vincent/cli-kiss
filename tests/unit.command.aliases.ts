import { expect, it } from "@jest/globals";
import {
  command,
  operation,
  optionFlag,
  optionRepeatable,
  optionSingleValue,
  ReaderArgs,
  type,
} from "../src";

it("run", async function () {
  const cmd = command(
    { description: "Description" },
    operation(
      {
        options: {
          option: optionRepeatable({
            long: "option",
            type: type(),
            aliases: {
              longs: ["option-alias1", "option-alias2"],
              shorts: ["pts", "o"],
            },
          }),
          flag1: optionFlag({
            long: "flag1",
            aliases: {
              longs: ["flag1-alias"],
              shorts: ["fa"],
            },
          }),
          flag2: optionFlag({
            long: "flag2",
            aliases: {
              longs: ["flag2-alias"],
              shorts: ["fb"],
            },
          }),
          weird: optionRepeatable({
            long: "2",
            aliases: {
              shorts: ["2o"],
            },
            type: type(),
          }),
          v1: optionSingleValue({
            long: "v1",
            aliases: {
              shorts: ["va"],
            },
            type: type(),
            impliedValueIfNotInlined: () => "bypass",
            fallbackValueIfAbsent: () => undefined,
          }),
          v2: optionSingleValue({
            long: "v2",
            aliases: {
              shorts: ["vb"],
            },
            type: type(),
            impliedValueIfNotInlined: () => "bypass",
            fallbackValueIfAbsent: () => undefined,
          }),
        },
        positionals: [],
      },
      async function (_context, inputs) {
        return inputs;
      },
    ),
  );
  const readerArgs = new ReaderArgs([
    "--option=1.1",
    "--option-alias1=1.2",
    "--option-alias2",
    "1.3",
    "-pts=1.4",
    "-vbva=42",
    "-o",
    "1.5",
    "--flag1-alias",
    "--2=woops",
    "-fb2o=1.6",
  ]);
  const decoder = cmd.consumeAndMakeDecoder(readerArgs);
  const interpreter = decoder.decodeAndMakeInterpreter();
  const output = await interpreter.executeWithContext({});
  expect(output).toStrictEqual({
    options: {
      option: ["1.1", "1.2", "1.3", "1.4", "1.5"],
      flag1: true,
      flag2: true,
      weird: ["woops", "1.6"],
      v1: "42",
      v2: "bypass",
    },
    positionals: [],
  });
});

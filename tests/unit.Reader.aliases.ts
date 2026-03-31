import { expect, it } from "@jest/globals";
import { ReaderArgs, ReaderOptionParsing } from "../src";

it("run", async function () {
  const readerArgs = new ReaderArgs([
    "--option=1.1",
    "--option-alias1=1.2",
    "--option-alias2",
    "1.3",
    "-pts=1.4",
    "-o",
    "1.5",
    "--flag1-alias",
    "-fa2=woops",
    "-fa2o=1.6",
  ]);

  const kOption = readerArgs.registerOption({
    longs: ["option", "option-alias1", "option-alias2"],
    shorts: ["pts", "o"],
    parsing: optionValueFixedUniqueParsing,
  });
  const kFlag1 = readerArgs.registerOption({
    longs: ["flag1", "flag1-alias"],
    shorts: [],
    parsing: optionFlagParsing,
  });
  const kFlag2 = readerArgs.registerOption({
    longs: ["flag2"],
    shorts: ["fa2"],
    parsing: optionFlagParsing,
  });

  expect(readerArgs.consumePositional()).toStrictEqual(undefined);

  expect(readerArgs.getOptionValues(kOption)).toStrictEqual([
    { inlined: "1.1", separated: [] },
    { inlined: "1.2", separated: [] },
    { inlined: null, separated: ["1.3"] },
    { inlined: "1.4", separated: [] },
    { inlined: null, separated: ["1.5"] },
    { inlined: "1.6", separated: [] },
  ]);
  expect(readerArgs.getOptionValues(kFlag1)).toStrictEqual([
    { inlined: null, separated: [] },
  ]);
  expect(readerArgs.getOptionValues(kFlag2)).toStrictEqual([
    { inlined: "woops", separated: [] },
    { inlined: null, separated: [] },
  ]);
});

const optionFlagParsing: ReaderOptionParsing = {
  consumeShortGroup: false,
  consumeNextArg: () => false,
};

const optionValueFixedUniqueParsing: ReaderOptionParsing = {
  consumeShortGroup: true,
  consumeNextArg: (inlined, separated) =>
    inlined === null && separated.length === 0,
};

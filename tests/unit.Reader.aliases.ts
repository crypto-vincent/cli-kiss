import { expect, it } from "@jest/globals";
import { ReaderArgs } from "../src";

it("run", async () => {
  const readerArgs = new ReaderArgs([
    "--option=1.1",
    "--option-alias1=1.2",
    "--option-alias2",
    "1.3",
    "-pts=1.4",
    "-o",
    "1.5",
    "--flag-alias",
    "-fa2=woops",
    "-fa2o=1.6",
  ]);

  const kOption = readerArgs.registerOption({
    longs: ["option", "option-alias1", "option-alias2"],
    shorts: ["pts", "o"],
    valued: true,
  });
  const kFlag1 = readerArgs.registerOption({
    longs: ["flag1", "flag-alias"],
    shorts: [],
    valued: false,
  });
  const kFlag2 = readerArgs.registerOption({
    longs: ["flag2"],
    shorts: ["fa2"],
    valued: false,
  });

  expect(readerArgs.consumePositional()).toStrictEqual(undefined);

  expect(readerArgs.getOptionValues(kOption)).toStrictEqual([
    "1.1",
    "1.2",
    "1.3",
    "1.4",
    "1.5",
    "1.6",
  ]);

  expect(readerArgs.getOptionValues(kFlag1)).toStrictEqual(["true"]);
  expect(readerArgs.getOptionValues(kFlag2)).toStrictEqual(["woops", "true"]);
});

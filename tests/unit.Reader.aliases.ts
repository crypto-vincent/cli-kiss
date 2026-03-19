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
    "-fa2",
  ]);

  const ko = readerArgs.registerOption({
    longs: ["option", "option-alias1", "option-alias2"],
    shorts: ["pts", "o"],
    valued: true,
  });
  const kf1 = readerArgs.registerOption({
    longs: ["flag1", "flag-alias"],
    shorts: [],
    valued: false,
  });
  const kf2 = readerArgs.registerOption({
    longs: ["flag2"],
    shorts: ["fa2"],
    valued: false,
  });

  expect(readerArgs.consumePositional()).toStrictEqual(undefined);

  expect(readerArgs.getOptionValues(ko)).toStrictEqual([
    "1.1",
    "1.2",
    "1.3",
    "1.4",
    "1.5",
  ]);

  expect(readerArgs.getOptionValues(kf1)).toStrictEqual(true);
  expect(readerArgs.getOptionValues(kf2)).toStrictEqual(true);
});

import { expect, it } from "@jest/globals";
import { ReaderTokenizer } from "../src";

it("run", async () => {
  const readerTokenizer = new ReaderTokenizer([
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

  readerTokenizer.registerOption({
    key: "option",
    longs: ["option", "option-alias1", "option-alias2"],
    shorts: ["pts", "o"],
  });

  readerTokenizer.registerFlag({
    key: "flag1",
    longs: ["flag1", "flag-alias"],
    shorts: [],
  });
  readerTokenizer.registerFlag({
    key: "flag2",
    longs: ["flag2"],
    shorts: ["fa2"],
  });

  expect(readerTokenizer.consumePositional()).toStrictEqual(undefined);

  expect(readerTokenizer.consumeOption("option")).toStrictEqual([
    "1.1",
    "1.2",
    "1.3",
    "1.4",
    "1.5",
  ]);

  expect(readerTokenizer.consumeFlag("flag1")).toStrictEqual(true);
  expect(readerTokenizer.consumeFlag("flag2")).toStrictEqual(true);
});

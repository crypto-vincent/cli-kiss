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

  readerArgs.registerOption({
    key: "option",
    longs: ["option", "option-alias1", "option-alias2"],
    shorts: ["pts", "o"],
  });

  readerArgs.registerFlag({
    key: "flag1",
    longs: ["flag1", "flag-alias"],
    shorts: [],
  });
  readerArgs.registerFlag({
    key: "flag2",
    longs: ["flag2"],
    shorts: ["fa2"],
  });

  expect(readerArgs.consumePositional()).toStrictEqual(undefined);

  expect(readerArgs.readOption("option")).toStrictEqual([
    "1.1",
    "1.2",
    "1.3",
    "1.4",
    "1.5",
  ]);

  expect(readerArgs.readFlag("flag1")).toStrictEqual(true);
  expect(readerArgs.readFlag("flag2")).toStrictEqual(true);
});

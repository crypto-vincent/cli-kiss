import { expect, it } from "@jest/globals";
import { Reader } from "../src";

it("run", async () => {
  const reader = new Reader([
    "node",
    "script.js",
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

  reader.registerOption({
    key: "option",
    longs: ["option", "option-alias1", "option-alias2"],
    shorts: ["pts", "o"],
  });

  reader.registerFlag({
    key: "flag1",
    longs: ["flag1", "flag-alias"],
    shorts: [],
  });
  reader.registerFlag({
    key: "flag2",
    longs: ["flag2"],
    shorts: ["fa2"],
  });

  expect(reader.consumePositional()).toStrictEqual(undefined);

  expect(reader.consumeOption("option")).toStrictEqual([
    "1.1",
    "1.2",
    "1.3",
    "1.4",
    "1.5",
  ]);

  expect(reader.consumeFlag("flag1")).toStrictEqual(true);
  expect(reader.consumeFlag("flag2")).toStrictEqual(true);
});

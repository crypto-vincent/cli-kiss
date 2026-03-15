import { expect, it } from "@jest/globals";
import { Reader } from "../src/Reader";

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
  ]);

  reader.registerOption({
    key: "option",
    longs: ["option", "option-alias1", "option-alias2"],
    shorts: ["pts", "o"],
  });

  reader.registerFlag({
    key: "flag",
    longs: ["flag", "flag-alias"],
    shorts: [],
  });

  expect(reader.consumePositional()).toStrictEqual(undefined);

  expect(reader.consumeFlag("flag")).toStrictEqual(true);
  expect(reader.consumeOption("option")).toStrictEqual([
    "1.1",
    "1.2",
    "1.3",
    "1.4",
    "1.5",
  ]);
});

import { expect, it } from "@jest/globals";
import { Reader } from "../src/Reader";

it("run", async () => {
  const stream = new Reader([
    "node",
    "script.js",
    "--boolean-flag",
    "dodo",
    "--no-negative-flag",
    "123",
    "-abc",
    "5",
    "6",
    "--",
    "--not-a-flag",
    "-efg",
  ]);

  stream.registerFlagName("boolean-flag");
  stream.registerFlagName("negative-flag");
  stream.registerFlagName("unset-flag");
  stream.registerFlagName("a");
  stream.registerFlagName("b");
  stream.registerFlagName("c");

  expect(stream.consumePositional()).toStrictEqual("dodo");
  expect(stream.consumePositional()).toStrictEqual("123");
  expect(stream.consumePositional()).toStrictEqual("5");
  expect(stream.consumePositional()).toStrictEqual("6");
  expect(stream.consumePositional()).toStrictEqual("--not-a-flag");
  expect(stream.consumePositional()).toStrictEqual("-efg");
  expect(stream.consumePositional()).toStrictEqual(undefined);

  expect(stream.consumeFlag("boolean-flag")).toStrictEqual(true);
  expect(stream.consumeFlag("negative-flag")).toStrictEqual(false);
  expect(stream.consumeFlag("unset-flag")).toStrictEqual(false);
  expect(stream.consumeFlag("a")).toStrictEqual(true);
  expect(stream.consumeFlag("b")).toStrictEqual(true);
  expect(stream.consumeFlag("c")).toStrictEqual(true);
});

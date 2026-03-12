import { expect, it } from "@jest/globals";
import { Reader } from "../src/Reader";

it("run", async () => {
  const stream = new Reader([
    "node",
    "script.js",
    "--boolean-flag",
    "dodo",
    "--string-option=hello",
    "--number-option",
    "123",
    "-abc",
    "5",
    "6",
    "extra1",
    "extra2",
    "--",
    "--not-a-flag",
    "-efg",
  ]);

  stream.registerFlagName("boolean-flag");

  stream.registerOptionName("string-option");
  stream.registerOptionName("number-option");

  stream.registerFlagName("a");
  stream.registerFlagName("b");
  stream.registerOptionName("c");

  stream.registerOptionName("not-a-flag");
  stream.registerFlagName("e");
  stream.registerFlagName("f");
  stream.registerFlagName("g");

  expect(stream.consumePositional()).toStrictEqual("dodo");
  expect(stream.consumePositional()).toStrictEqual("6");
  expect(stream.consumePositional()).toStrictEqual("extra1");
  expect(stream.consumePositional()).toStrictEqual("extra2");
  expect(stream.consumePositional()).toStrictEqual("--not-a-flag");
  expect(stream.consumePositional()).toStrictEqual("-efg");
  expect(stream.consumePositional()).toStrictEqual(undefined);

  expect(stream.consumeFlag("boolean-flag")).toStrictEqual(true);
  expect(stream.consumeFlag("a")).toStrictEqual(true);
  expect(stream.consumeFlag("b")).toStrictEqual(true);

  expect(stream.consumeOption("string-option")).toStrictEqual("hello");
  expect(stream.consumeOption("number-option")).toStrictEqual("123");
  expect(stream.consumeOption("c")).toStrictEqual("5");
});

import { expect, it } from "@jest/globals";
import { Reader } from "../src/Reader";

it("run", async () => {
  const stream = new Reader([
    "node",
    "script.js",
    "--first-option",
    "dodo",
    "--string-option=hello",
    "--number-option",
    "123",
    "-c",
    "5",
    "6",
    "extra1",
    "extra2",
    "--",
    "--not-a-flag",
    "-efg",
  ]);

  stream.registerOptionName("first-option");
  stream.registerOptionName("string-option");
  stream.registerOptionName("number-option");
  stream.registerOptionName("c");

  expect(stream.consumePositional()).toStrictEqual("6");
  expect(stream.consumePositional()).toStrictEqual("extra1");
  expect(stream.consumePositional()).toStrictEqual("extra2");
  expect(stream.consumePositional()).toStrictEqual("--not-a-flag");
  expect(stream.consumePositional()).toStrictEqual("-efg");
  expect(stream.consumePositional()).toStrictEqual(undefined);

  expect(stream.consumeOption("first-option")).toStrictEqual("dodo");
  expect(stream.consumeOption("string-option")).toStrictEqual("hello");
  expect(stream.consumeOption("number-option")).toStrictEqual("123");
  expect(stream.consumeOption("c")).toStrictEqual("5");
});

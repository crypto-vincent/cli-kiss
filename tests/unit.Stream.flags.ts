import { expect, it } from "@jest/globals";
import { Stream } from "../src/Stream";

it("run", async () => {
  const stream = new Stream([
    "node",
    "script.js",
    "--boolean-flag",
    "dodo",
    "123",
    "-abc",
    "5",
    "6",
    "--",
    "--not-a-flag",
    "-efg",
  ]);

  stream.registerFlagName("boolean-flag");
  stream.registerFlagName("number-option");
  stream.registerFlagName("a");
  stream.registerFlagName("b");
  stream.registerFlagName("c");

  expect(stream.dump()).toEqual({
    parsedIndex: 11,
    parsedDouble: true,
    parsedFlags: new Map([
      ["boolean-flag", true],
      ["a", true],
      ["b", true],
      ["c", true],
    ]),
    parsedOptions: new Map(),
    positionals: ["dodo", "123", "5", "6", "--not-a-flag", "-efg"],
  });
});

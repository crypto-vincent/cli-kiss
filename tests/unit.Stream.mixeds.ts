import { expect, it } from "@jest/globals";
import { Stream } from "../src/Stream";

it("run", async () => {
  const stream = new Stream([
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

  const dudu = stream.dump();
  console.log(dudu);

  expect(dudu).toEqual({
    parsedIndex: 15,
    parsedDouble: true,
    parsedFlags: new Map([
      ["boolean-flag", true],
      ["a", true],
      ["b", true],
    ]),
    parsedOptions: new Map([
      ["string-option", "hello"],
      ["number-option", "123"],
      ["c", "5"],
    ]),
    positionals: ["dodo", "6", "extra1", "extra2", "--not-a-flag", "-efg"],
  });
});

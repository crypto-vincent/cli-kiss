import { expect, it } from "@jest/globals";
import { Stream } from "../src/Stream";

it("run", async () => {
  const stream = new Stream([
    "node",
    "script.js",
    "--first-flag",
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

  stream.registerOptionName("first-flag");
  stream.registerOptionName("string-option");
  stream.registerOptionName("number-option");
  stream.registerOptionName("c");

  const dudu = stream.dump();
  console.log(dudu);

  expect(dudu).toEqual({
    parsedIndex: 15,
    parsedDouble: true,
    parsedFlags: new Map(),
    parsedOptions: new Map([
      ["first-flag", "dodo"],
      ["string-option", "hello"],
      ["number-option", "123"],
      ["c", "5"],
    ]),
    positionals: ["6", "extra1", "extra2", "--not-a-flag", "-efg"],
  });
});

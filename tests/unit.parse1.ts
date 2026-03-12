import { expect, it } from "@jest/globals";
import { commandTree, run } from "../src";
import { command } from "../src/Parser";

const firstCommand = command(
  {
    flags: {
      booleanFlag: { long: "boolean-flag" },
    },
    options: {
      stringOption: { long: "string-option", decoder: (arg) => arg },
      numberOption: { long: "number-option", decoder: (arg) => String(arg) },
    },
    requireds: [
      { name: "positional1", decoder: (arg) => Number(arg) },
      { name: "positional2", decoder: (arg) => BigInt(arg) },
    ],
    optionals: [{ name: "optional1", decoder: (arg) => arg }],
  },
  async (input: string, args, _rest) => {
    console.log("Command1:", { input, args });
    return { parsed: 42n };
  },
);

const dada = commandTree(firstCommand, {
  sub1: command(
    { flags: {}, options: {}, requireds: [], optionals: [] },
    async (input, args, _rest) => {
      console.log("Subcommand 1:", { input, args });
      return "sub1 result";
    },
  ),
});

it("run", async () => {
  console.log(process.argv);
  const res = await run(
    [
      "node",
      "script",
      "40",
      "41",
      "42",
      "sub1",
      "--boolean-flag",
      "--string-option=hello",
      "--number-option",
      "123",
    ],
    "dudu",
    dada,
  );
  console.log("Result:", res);
  expect(true).toBe(true);
});

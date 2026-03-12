import { expect, it } from "@jest/globals";
import { commandTree, run } from "../src";
import { command } from "../src/Parser";

const firstCommand = command(
  {
    /*
    flags: {
      booleanFlag: {
        long: "boolean-flag",
      },
    },
    */
    options: {
      stringOption: {
        long: "string-option",
        decoder: async (input: string) => input,
      },
      numberOption: {
        long: "number-option",
        decoder: async (input: string) => String(input),
      },
    },
    requireds: [
      { name: "positional1", decoder: async (input: string) => Number(input) },
      { name: "positional2", decoder: async (input: string) => BigInt(input) },
    ],
    optionals: [{ name: "optional1", decoder: async (input: string) => input }],
  },
  async (input: string, args, _rest) => {
    console.log("Command1:", { input, args });
    return { parsed: 42n };
  },
);

const dada = commandTree(firstCommand, {
  sub1: command({}, async (input, args, _rest) => {
    console.log("Subcommand 1:", { input, args });
    return "sub1 result";
  }),
});

it("run", async () => {
  console.log(process.argv);
  const res = await run(["arg1", "arg2"], "dudu", dada);
  console.log("Result:", res);
  expect(true).toBe(true);
});

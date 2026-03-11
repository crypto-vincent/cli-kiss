import { expect, it } from "@jest/globals";
import { run } from "../src";
import { command } from "../src/Parser";

const parser = command(
  {
    flags: {
      booleanFlag: {
        long: "boolean-flag",
      },
    },
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
      {
        name: "positional1",
        decoder: async (input: string) => Number(input),
      },
      {
        name: "positional2",
        decoder: async (input: string) => BigInt(input),
      },
    ],
    optionals: [
      {
        name: "optional1",
        decoder: async (input: string) => input,
      },
    ],
  },
  async (input: string, args) => {
    console.log("Command1:", { input, args });
    return { parsed: 42n };
  },
);

it("run", async () => {
  console.log(process.argv);
  await run(["arg1", "arg2"], "dudu", parser);
  expect(true).toBe(true);
});

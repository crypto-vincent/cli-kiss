import { expect, it } from "@jest/globals";
import { run } from "../src";
import { Parser } from "../src/Parser";
import {
  Command,
  ContinationSubcommands,
  ContinuationRest,
} from "../src/command";

const command = new Command(
  new Parser(
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
    (args) => {
      console.log("parser.args", args);
      return { parsed: 42n };
    },
  ),
  async (context, inputs) => {
    console.log("root process", { context, inputs });
    return "root result";
  },
  new ContinationSubcommands({
    sub1: new Command(
      new Parser(
        {
          flags: {},
          options: {},
          requireds: [
            { name: "subPositional1", decoder: (arg) => Number(arg) },
          ],
          optionals: [],
        },
        (args) => {
          console.log("sub1 parser.args", args);
          return {};
        },
      ),
      async (context, inputs) => {
        console.log("sub1 process", { context, inputs });
        return "sub1 result";
      },
      new ContinuationRest(),
    ),
  }),
);

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
      "--string-option=hello",
      "--number-option",
      "123",
      "88.88",
      "a,b",
      "--boolean-flag",
    ],
    "dudu",
    command,
  );
  console.log("Final:", res);
  expect(true).toBe(true);
});

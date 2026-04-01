import { expect, it } from "@jest/globals";
import { ReaderArgs } from "../src";

it("run", async function () {
  const readerArgs1 = new ReaderArgs(["--val=1", "A", "B", "STOP", "C"]);
  const kOptionVariadicStop = readerArgs1.registerOption({
    longs: ["val"],
    shorts: [],
    parsing: {
      consumeShortGroup: true,
      consumeNextArg: (_inlined, separated, nextArg) =>
        nextArg !== undefined && separated[separated.length - 1] !== "STOP",
    },
  });
  expect(readerArgs1.consumePositional()).toStrictEqual("C");
  expect(readerArgs1.consumePositional()).toStrictEqual(undefined);
  expect(readerArgs1.getOptionValues(kOptionVariadicStop)).toStrictEqual([
    { inlined: "1", separated: ["A", "B", "STOP"] },
  ]);

  const readerArgs2 = new ReaderArgs(["--val=1", "A", "B", "C"]);
  const kOptionVariadicFull = readerArgs2.registerOption({
    longs: ["val"],
    shorts: [],
    parsing: {
      consumeShortGroup: true,
      consumeNextArg: (_inlined, _separated, nextArg) => nextArg !== undefined,
    },
  });
  expect(readerArgs2.consumePositional()).toStrictEqual(undefined);
  expect(readerArgs2.getOptionValues(kOptionVariadicFull)).toStrictEqual([
    { inlined: "1", separated: ["A", "B", "C"] },
  ]);

  const readerArgs3 = new ReaderArgs(["--val=2", "A", "B", "--val=1", "C"]);
  const kOptionVariadicKeyed = readerArgs3.registerOption({
    longs: ["val"],
    shorts: [],
    parsing: {
      consumeShortGroup: true,
      consumeNextArg: (inlined, separated) =>
        separated.length < Number(inlined ?? "0"),
    },
  });
  expect(readerArgs3.consumePositional()).toStrictEqual(undefined);
  expect(readerArgs3.getOptionValues(kOptionVariadicKeyed)).toStrictEqual([
    { inlined: "2", separated: ["A", "B"] },
    { inlined: "1", separated: ["C"] },
  ]);
});

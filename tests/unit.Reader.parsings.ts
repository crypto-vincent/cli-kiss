import { expect, it } from "@jest/globals";
import { ReaderArgs } from "../src";

it("run", async function () {
  const readerArgs1 = new ReaderArgs(["--val=1", "A", "B", "STOP", "C"]);
  const kOptionVariadicStop = readerArgs1.registerOptionLong({
    key: "val",
    nextGuard: (value, nextArg) =>
      nextArg !== undefined &&
      value.separated[value.separated.length - 1] !== "STOP",
  });
  expect(readerArgs1.consumePositional()).toStrictEqual("C");
  expect(readerArgs1.consumePositional()).toStrictEqual(undefined);
  expect(kOptionVariadicStop().values).toStrictEqual([
    { inlined: "1", separated: ["A", "B", "STOP"] },
  ]);

  const readerArgs2 = new ReaderArgs(["--val=1", "A", "B", "C"]);
  const kOptionVariadicFull = readerArgs2.registerOptionLong({
    key: "val",
    nextGuard: (_value, nextArg) => nextArg !== undefined,
  });
  expect(readerArgs2.consumePositional()).toStrictEqual(undefined);
  expect(kOptionVariadicFull().values).toStrictEqual([
    { inlined: "1", separated: ["A", "B", "C"] },
  ]);

  const readerArgs3 = new ReaderArgs(["--val=2", "A", "B", "--val=1", "C"]);
  const kOptionVariadicKeyed = readerArgs3.registerOptionLong({
    key: "val",
    nextGuard: (value) => value.separated.length < Number(value.inlined ?? "0"),
  });
  expect(readerArgs3.consumePositional()).toStrictEqual(undefined);
  expect(kOptionVariadicKeyed().values).toStrictEqual([
    { inlined: "2", separated: ["A", "B"] },
    { inlined: "1", separated: ["C"] },
  ]);
});

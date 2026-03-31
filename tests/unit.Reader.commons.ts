import { expect, it } from "@jest/globals";
import { ReaderArgs, ReaderOptionParsing } from "../src";

it("run", async function () {
  const stream = new ReaderArgs([
    "positional-0",
    "--no-flag-no",
    "--flag-normal",
    "--flag-positive=true",
    "--flag-negative=false",
    "positional-1",
    "--option-split",
    "1.1",
    "--option-split",
    "1.2",
    "--option-join=2.1",
    "--option-join=2.2",
    "-ab",
    "3.1",
    "-cd=4.1",
    "-ef5.1",
    "positional-2",
    "-gh=FALSE",
    "-ij=TRUE",
    "-b",
    "3.2",
    "-d=4.2",
    "-f5.2",
    "positional-3",
    "--",
    "--not-a-flag(positional)",
    "-mn(positional)",
    "--",
    "positional-4",
  ]);

  expect(stream.consumePositional()).toStrictEqual("positional-0");

  const kFlagUnset = stream.registerOption({
    longs: ["flag-unset"],
    shorts: [],
    parsing: optionFlagParsing,
  });
  const kFlagNo = stream.registerOption({
    longs: ["no-flag-no"],
    shorts: [],
    parsing: optionFlagParsing,
  });
  const kFlagNormal = stream.registerOption({
    longs: ["flag-normal"],
    shorts: [],
    parsing: optionFlagParsing,
  });
  const kFlagPositive = stream.registerOption({
    longs: ["flag-positive"],
    shorts: [],
    parsing: optionFlagParsing,
  });
  const kFlagNegative = stream.registerOption({
    longs: ["flag-negative"],
    shorts: [],
    parsing: optionFlagParsing,
  });

  expect(stream.consumePositional()).toStrictEqual("positional-1");

  const kOptionUnset = stream.registerOption({
    longs: ["option-unset"],
    shorts: [],
    parsing: optionValueFixedUniqueParsing,
  });
  const kOptionSplit = stream.registerOption({
    longs: ["option-split"],
    shorts: [],
    parsing: optionValueFixedUniqueParsing,
  });
  const kOptionJoin = stream.registerOption({
    longs: ["option-join"],
    shorts: [],
    parsing: optionValueFixedUniqueParsing,
  });

  const kA = stream.registerOption({
    longs: [],
    shorts: ["a"],
    parsing: optionFlagParsing,
  });
  const kB = stream.registerOption({
    longs: [],
    shorts: ["b"],
    parsing: optionValueFixedUniqueParsing,
  });

  const kC = stream.registerOption({
    longs: [],
    shorts: ["c"],
    parsing: optionFlagParsing,
  });
  const kD = stream.registerOption({
    longs: [],
    shorts: ["d"],
    parsing: optionValueFixedUniqueParsing,
  });

  const kE = stream.registerOption({
    longs: [],
    shorts: ["e"],
    parsing: optionFlagParsing,
  });
  const kF = stream.registerOption({
    longs: [],
    shorts: ["f"],
    parsing: optionValueFixedUniqueParsing,
  });

  expect(stream.consumePositional()).toStrictEqual("positional-2");

  const kG = stream.registerOption({
    longs: [],
    shorts: ["g"],
    parsing: optionFlagParsing,
  });
  const kH = stream.registerOption({
    longs: [],
    shorts: ["h"],
    parsing: optionFlagParsing,
  });

  const kI = stream.registerOption({
    longs: [],
    shorts: ["i"],
    parsing: optionFlagParsing,
  });
  const kJ = stream.registerOption({
    longs: [],
    shorts: ["j"],
    parsing: optionFlagParsing,
  });

  expect(stream.consumePositional()).toStrictEqual("positional-3");

  expect(stream.consumePositional()).toStrictEqual("--not-a-flag(positional)");
  expect(stream.consumePositional()).toStrictEqual("-mn(positional)");
  expect(stream.consumePositional()).toStrictEqual("--");
  expect(stream.consumePositional()).toStrictEqual("positional-4");
  expect(stream.consumePositional()).toStrictEqual(undefined);

  expect(stream.getOptionValues(kFlagUnset)).toStrictEqual([]);
  expect(stream.getOptionValues(kFlagNo)).toStrictEqual([
    { inlined: null, separated: [] },
  ]);
  expect(stream.getOptionValues(kFlagNormal)).toStrictEqual([
    { inlined: null, separated: [] },
  ]);
  expect(stream.getOptionValues(kFlagPositive)).toStrictEqual([
    { inlined: "true", separated: [] },
  ]);
  expect(stream.getOptionValues(kFlagNegative)).toStrictEqual([
    { inlined: "false", separated: [] },
  ]);

  expect(stream.getOptionValues(kOptionUnset)).toStrictEqual([]);
  expect(stream.getOptionValues(kOptionSplit)).toStrictEqual([
    { inlined: null, separated: ["1.1"] },
    { inlined: null, separated: ["1.2"] },
  ]);
  expect(stream.getOptionValues(kOptionJoin)).toStrictEqual([
    { inlined: "2.1", separated: [] },
    { inlined: "2.2", separated: [] },
  ]);

  expect(stream.getOptionValues(kA)).toStrictEqual([
    { inlined: null, separated: [] },
  ]);
  expect(stream.getOptionValues(kB)).toStrictEqual([
    { inlined: null, separated: ["3.1"] },
    { inlined: null, separated: ["3.2"] },
  ]);

  expect(stream.getOptionValues(kC)).toStrictEqual([
    { inlined: null, separated: [] },
  ]);
  expect(stream.getOptionValues(kD)).toStrictEqual([
    { inlined: "4.1", separated: [] },
    { inlined: "4.2", separated: [] },
  ]);

  expect(stream.getOptionValues(kE)).toStrictEqual([
    { inlined: null, separated: [] },
  ]);
  expect(stream.getOptionValues(kF)).toStrictEqual([
    { inlined: "5.1", separated: [] },
    { inlined: "5.2", separated: [] },
  ]);

  expect(stream.getOptionValues(kG)).toStrictEqual([
    { inlined: null, separated: [] },
  ]);
  expect(stream.getOptionValues(kH)).toStrictEqual([
    { inlined: "FALSE", separated: [] },
  ]);

  expect(stream.getOptionValues(kI)).toStrictEqual([
    { inlined: null, separated: [] },
  ]);
  expect(stream.getOptionValues(kJ)).toStrictEqual([
    { inlined: "TRUE", separated: [] },
  ]);
});

const optionFlagParsing: ReaderOptionParsing = {
  consumeShortGroup: false,
  consumeNextArg: () => false,
};

const optionValueFixedUniqueParsing: ReaderOptionParsing = {
  consumeShortGroup: true,
  consumeNextArg: (inlined, separated) =>
    inlined === null && separated.length === 0,
};

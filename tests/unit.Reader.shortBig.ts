import { expect, it } from "@jest/globals";
import { ReaderArgs, ReaderOptionParsing } from "../src";

it("run", async function () {
  const stream = new ReaderArgs([
    "positional-0",
    "-aasof-normal",
    "-bbsof-positive=true",
    "-ccsof-negative=false",
    "positional-1",
    "-ddsov-split",
    "1.1",
    "-eesov-split",
    "1.2",
    "-ffsov-join=2.1",
    "-ggsov-join=2.2",
    "positional-2",
  ]);

  expect(stream.consumePositional()).toStrictEqual("positional-0");

  const kSofUnset = stream.registerOption({
    longs: [],
    shorts: ["sof-unset"],
    parsing: optionFlagParsing,
  });
  const kSofNormal = stream.registerOption({
    shorts: ["sof-normal"],
    longs: [],
    parsing: optionFlagParsing,
  });
  const kSofPositive = stream.registerOption({
    longs: [],
    shorts: ["sof-positive"],
    parsing: optionFlagParsing,
  });
  const kSofNegative = stream.registerOption({
    longs: [],
    shorts: ["sof-negative"],
    parsing: optionFlagParsing,
  });

  const kAa = stream.registerOption({
    longs: [],
    shorts: ["aa"],
    parsing: optionFlagParsing,
  });
  const kBb = stream.registerOption({
    longs: [],
    shorts: ["bb"],
    parsing: optionFlagParsing,
  });
  const kCc = stream.registerOption({
    longs: [],
    shorts: ["cc"],
    parsing: optionFlagParsing,
  });

  expect(stream.consumePositional()).toStrictEqual("positional-1");

  const kSovSplit = stream.registerOption({
    longs: [],
    shorts: ["sov-split"],
    parsing: optionValueFixedUniqueParsing,
  });
  const kSovJoin = stream.registerOption({
    longs: [],
    shorts: ["sov-join"],
    parsing: optionValueFixedUniqueParsing,
  });
  const kSovUnset = stream.registerOption({
    longs: [],
    shorts: ["sov-unset"],
    parsing: optionValueFixedUniqueParsing,
  });

  const kDd = stream.registerOption({
    longs: [],
    shorts: ["dd"],
    parsing: optionFlagParsing,
  });
  const kEe = stream.registerOption({
    longs: [],
    shorts: ["ee"],
    parsing: optionFlagParsing,
  });
  const kFf = stream.registerOption({
    longs: [],
    shorts: ["ff"],
    parsing: optionFlagParsing,
  });
  const kGg = stream.registerOption({
    longs: [],
    shorts: ["gg"],
    parsing: optionFlagParsing,
  });

  expect(stream.consumePositional()).toStrictEqual("positional-2");

  expect(stream.getOptionValues(kSofUnset)).toStrictEqual([]);
  expect(stream.getOptionValues(kSofNormal)).toStrictEqual([
    { inlined: null, separated: [] },
  ]);
  expect(stream.getOptionValues(kSofPositive)).toStrictEqual([
    { inlined: "true", separated: [] },
  ]);
  expect(stream.getOptionValues(kSofNegative)).toStrictEqual([
    { inlined: "false", separated: [] },
  ]);

  expect(stream.getOptionValues(kAa)).toStrictEqual([
    { inlined: null, separated: [] },
  ]);
  expect(stream.getOptionValues(kBb)).toStrictEqual([
    { inlined: null, separated: [] },
  ]);
  expect(stream.getOptionValues(kCc)).toStrictEqual([
    { inlined: null, separated: [] },
  ]);

  expect(stream.getOptionValues(kSovUnset)).toStrictEqual([]);
  expect(stream.getOptionValues(kSovSplit)).toStrictEqual([
    { inlined: null, separated: ["1.1"] },
    { inlined: null, separated: ["1.2"] },
  ]);
  expect(stream.getOptionValues(kSovJoin)).toStrictEqual([
    { inlined: "2.1", separated: [] },
    { inlined: "2.2", separated: [] },
  ]);

  expect(stream.getOptionValues(kDd)).toStrictEqual([
    { inlined: null, separated: [] },
  ]);
  expect(stream.getOptionValues(kEe)).toStrictEqual([
    { inlined: null, separated: [] },
  ]);
  expect(stream.getOptionValues(kFf)).toStrictEqual([
    { inlined: null, separated: [] },
  ]);
  expect(stream.getOptionValues(kGg)).toStrictEqual([
    { inlined: null, separated: [] },
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

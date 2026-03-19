import { expect, it } from "@jest/globals";
import { ReaderArgs } from "../src";

it("run", async () => {
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
    "-ffsov-join=2",
    "positional-2",
  ]);

  expect(stream.consumePositional()).toStrictEqual("positional-0");

  const kSofNormal = stream.registerOption({
    shorts: ["sof-normal"],
    longs: [],
    valued: false,
  });
  const kSofPositive = stream.registerOption({
    longs: [],
    shorts: ["sof-positive"],
    valued: false,
  });
  const kSofNegative = stream.registerOption({
    longs: [],
    shorts: ["sof-negative"],
    valued: false,
  });
  const kSofUnset = stream.registerOption({
    longs: [],
    shorts: ["sof-unset"],
    valued: false,
  });

  const kAa = stream.registerOption({
    longs: [],
    shorts: ["aa"],
    valued: false,
  });
  const kBb = stream.registerOption({
    longs: [],
    shorts: ["bb"],
    valued: false,
  });
  const kCc = stream.registerOption({
    longs: [],
    shorts: ["cc"],
    valued: false,
  });

  expect(stream.consumePositional()).toStrictEqual("positional-1");

  const kSovSplit = stream.registerOption({
    longs: [],
    shorts: ["sov-split"],
    valued: true,
  });
  const kSovJoin = stream.registerOption({
    longs: [],
    shorts: ["sov-join"],
    valued: true,
  });
  const kSovUnset = stream.registerOption({
    longs: [],
    shorts: ["sov-unset"],
    valued: true,
  });

  const kDd = stream.registerOption({
    longs: [],
    shorts: ["dd"],
    valued: false,
  });
  const kEe = stream.registerOption({
    longs: [],
    shorts: ["ee"],
    valued: false,
  });
  const kFf = stream.registerOption({
    longs: [],
    shorts: ["ff"],
    valued: false,
  });

  expect(stream.consumePositional()).toStrictEqual("positional-2");

  expect(stream.getOptionValues(kSofNormal)).toStrictEqual(["true"]);
  expect(stream.getOptionValues(kSofPositive)).toStrictEqual(["true"]);
  expect(stream.getOptionValues(kSofNegative)).toStrictEqual(["false"]);
  expect(stream.getOptionValues(kSofUnset)).toStrictEqual([]);

  expect(stream.getOptionValues(kAa)).toStrictEqual(["true"]);
  expect(stream.getOptionValues(kBb)).toStrictEqual(["true"]);
  expect(stream.getOptionValues(kCc)).toStrictEqual(["true"]);

  expect(stream.getOptionValues(kSovUnset)).toStrictEqual([]);
  expect(stream.getOptionValues(kSovSplit)).toStrictEqual(["1.1", "1.2"]);
  expect(stream.getOptionValues(kSovJoin)).toStrictEqual(["2"]);

  expect(stream.getOptionValues(kDd)).toStrictEqual(["true"]);
  expect(stream.getOptionValues(kEe)).toStrictEqual(["true"]);
  expect(stream.getOptionValues(kFf)).toStrictEqual(["true"]);
});

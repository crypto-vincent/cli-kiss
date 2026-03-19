import { expect, it } from "@jest/globals";
import { ReaderArgs } from "../src";

it("run", async () => {
  const stream = new ReaderArgs([
    "positional-0",
    "--flag-normal",
    "--flag-positive=true",
    "--flag-negative=false",
    "positional-1",
    "--option-split",
    "1.1",
    "--option-split",
    "1.2",
    "--option-join=2",
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

  const kFlagNormal = stream.registerOption({
    longs: ["flag-normal"],
    shorts: [],
    valued: false,
  });
  const kFlagPositive = stream.registerOption({
    longs: ["flag-positive"],
    shorts: [],
    valued: false,
  });
  const kFlagNegative = stream.registerOption({
    longs: ["flag-negative"],
    shorts: [],
    valued: false,
  });
  const kFlagUnset = stream.registerOption({
    longs: ["flag-unset"],
    shorts: [],
    valued: false,
  });

  expect(stream.consumePositional()).toStrictEqual("positional-1");

  const kOptionSplit = stream.registerOption({
    longs: ["option-split"],
    shorts: [],
    valued: true,
  });
  const kOptionJoin = stream.registerOption({
    longs: ["option-join"],
    shorts: [],
    valued: true,
  });
  const kOptionUnset = stream.registerOption({
    longs: ["option-unset"],
    shorts: [],
    valued: true,
  });

  const kA = stream.registerOption({
    longs: [],
    shorts: ["a"],
    valued: false,
  });
  const kB = stream.registerOption({
    longs: [],
    shorts: ["b"],
    valued: true,
  });

  const kC = stream.registerOption({
    longs: [],
    shorts: ["c"],
    valued: false,
  });
  const kD = stream.registerOption({
    longs: [],
    shorts: ["d"],
    valued: true,
  });

  const kE = stream.registerOption({
    longs: [],
    shorts: ["e"],
    valued: false,
  });
  const kF = stream.registerOption({
    longs: [],
    shorts: ["f"],
    valued: true,
  });

  expect(stream.consumePositional()).toStrictEqual("positional-2");

  const kG = stream.registerOption({
    longs: [],
    shorts: ["g"],
    valued: false,
  });
  const kH = stream.registerOption({
    longs: [],
    shorts: ["h"],
    valued: false,
  });

  const kI = stream.registerOption({
    longs: [],
    shorts: ["i"],
    valued: false,
  });
  const kJ = stream.registerOption({
    longs: [],
    shorts: ["j"],
    valued: false,
  });

  expect(stream.consumePositional()).toStrictEqual("positional-3");

  expect(stream.consumePositional()).toStrictEqual("--not-a-flag(positional)");
  expect(stream.consumePositional()).toStrictEqual("-mn(positional)");
  expect(stream.consumePositional()).toStrictEqual("--");
  expect(stream.consumePositional()).toStrictEqual("positional-4");
  expect(stream.consumePositional()).toStrictEqual(undefined);

  expect(stream.getOptionValues(kFlagNormal)).toStrictEqual(["true"]);
  expect(stream.getOptionValues(kFlagPositive)).toStrictEqual(["true"]);
  expect(stream.getOptionValues(kFlagNegative)).toStrictEqual(["false"]);
  expect(stream.getOptionValues(kFlagUnset)).toStrictEqual([]);

  expect(stream.getOptionValues(kOptionUnset)).toStrictEqual([]);
  expect(stream.getOptionValues(kOptionSplit)).toStrictEqual(["1.1", "1.2"]);
  expect(stream.getOptionValues(kOptionJoin)).toStrictEqual(["2"]);

  expect(stream.getOptionValues(kA)).toStrictEqual(["true"]);
  expect(stream.getOptionValues(kB)).toStrictEqual(["3.1", "3.2"]);

  expect(stream.getOptionValues(kC)).toStrictEqual(["true"]);
  expect(stream.getOptionValues(kD)).toStrictEqual(["4.1", "4.2"]);

  expect(stream.getOptionValues(kE)).toStrictEqual(["true"]);
  expect(stream.getOptionValues(kF)).toStrictEqual(["5.1", "5.2"]);

  expect(stream.getOptionValues(kG)).toStrictEqual(["true"]);
  expect(stream.getOptionValues(kH)).toStrictEqual(["FALSE"]);

  expect(stream.getOptionValues(kI)).toStrictEqual(["true"]);
  expect(stream.getOptionValues(kJ)).toStrictEqual(["TRUE"]);
});

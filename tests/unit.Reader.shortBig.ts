import { expect, it } from "@jest/globals";
import { ReaderArgs, ReaderOptionNextGuard } from "../src";

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

  const kSofUnset = stream.registerOptionShort({
    key: "sof-unset",
    nextGuard: optionFlagNextGuard,
    consumeGroupRestAsValue: false,
  });
  const kSofNormal = stream.registerOptionShort({
    key: "sof-normal",
    nextGuard: optionFlagNextGuard,
    consumeGroupRestAsValue: false,
  });
  const kSofPositive = stream.registerOptionShort({
    key: "sof-positive",
    nextGuard: optionFlagNextGuard,
    consumeGroupRestAsValue: false,
  });
  const kSofNegative = stream.registerOptionShort({
    key: "sof-negative",
    nextGuard: optionFlagNextGuard,
    consumeGroupRestAsValue: false,
  });

  const kAa = stream.registerOptionShort({
    key: "aa",
    nextGuard: optionFlagNextGuard,
    consumeGroupRestAsValue: false,
  });
  const kBb = stream.registerOptionShort({
    key: "bb",
    nextGuard: optionFlagNextGuard,
    consumeGroupRestAsValue: false,
  });
  const kCc = stream.registerOptionShort({
    key: "cc",
    nextGuard: optionFlagNextGuard,
    consumeGroupRestAsValue: false,
  });

  expect(stream.consumePositional()).toStrictEqual("positional-1");

  const kSovSplit = stream.registerOptionShort({
    key: "sov-split",
    nextGuard: optionValuedNextGuard,
    consumeGroupRestAsValue: true,
  });
  const kSovJoin = stream.registerOptionShort({
    key: "sov-join",
    nextGuard: optionValuedNextGuard,
    consumeGroupRestAsValue: true,
  });
  const kSovUnset = stream.registerOptionShort({
    key: "sov-unset",
    nextGuard: optionValuedNextGuard,
    consumeGroupRestAsValue: true,
  });

  const kDd = stream.registerOptionShort({
    key: "dd",
    nextGuard: optionFlagNextGuard,
    consumeGroupRestAsValue: false,
  });
  const kEe = stream.registerOptionShort({
    key: "ee",
    nextGuard: optionFlagNextGuard,
    consumeGroupRestAsValue: false,
  });

  const kFf = stream.registerOptionShort({
    key: "ff",
    nextGuard: optionFlagNextGuard,
    consumeGroupRestAsValue: false,
  });
  const kGg = stream.registerOptionShort({
    key: "gg",
    nextGuard: optionFlagNextGuard,
    consumeGroupRestAsValue: false,
  });

  expect(stream.consumePositional()).toStrictEqual("positional-2");

  expect(kSofUnset()).toStrictEqual([]);
  expect(kSofNormal()).toStrictEqual([{ inlined: null, separated: [] }]);
  expect(kSofPositive()).toStrictEqual([{ inlined: "true", separated: [] }]);
  expect(kSofNegative()).toStrictEqual([{ inlined: "false", separated: [] }]);

  expect(kAa()).toStrictEqual([{ inlined: null, separated: [] }]);
  expect(kBb()).toStrictEqual([{ inlined: null, separated: [] }]);
  expect(kCc()).toStrictEqual([{ inlined: null, separated: [] }]);

  expect(kSovUnset()).toStrictEqual([]);
  expect(kSovSplit()).toStrictEqual([
    { inlined: null, separated: ["1.1"] },
    { inlined: null, separated: ["1.2"] },
  ]);
  expect(kSovJoin()).toStrictEqual([
    { inlined: "2.1", separated: [] },
    { inlined: "2.2", separated: [] },
  ]);

  expect(kDd()).toStrictEqual([{ inlined: null, separated: [] }]);
  expect(kEe()).toStrictEqual([{ inlined: null, separated: [] }]);
  expect(kFf()).toStrictEqual([{ inlined: null, separated: [] }]);
  expect(kGg()).toStrictEqual([{ inlined: null, separated: [] }]);
});

const optionFlagNextGuard: ReaderOptionNextGuard = () => false;
const optionValuedNextGuard: ReaderOptionNextGuard = (value) =>
  value.inlined === null && value.separated.length === 0;

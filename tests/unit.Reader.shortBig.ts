import { expect, it } from "@jest/globals";
import {
  ReaderArgs,
  ReaderOptionNextGuard,
  ReaderOptionRestGuard,
} from "../src";

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
    restGuard: optionFlagRestGuard,
    nextGuard: optionFlagNextGuard,
  });
  const kSofNormal = stream.registerOptionShort({
    key: "sof-normal",
    restGuard: optionFlagRestGuard,
    nextGuard: optionFlagNextGuard,
  });
  const kSofPositive = stream.registerOptionShort({
    key: "sof-positive",
    restGuard: optionFlagRestGuard,
    nextGuard: optionFlagNextGuard,
  });
  const kSofNegative = stream.registerOptionShort({
    key: "sof-negative",
    restGuard: optionFlagRestGuard,
    nextGuard: optionFlagNextGuard,
  });

  const kAa = stream.registerOptionShort({
    key: "aa",
    restGuard: optionFlagRestGuard,
    nextGuard: optionFlagNextGuard,
  });
  const kBb = stream.registerOptionShort({
    key: "bb",
    restGuard: optionFlagRestGuard,
    nextGuard: optionFlagNextGuard,
  });
  const kCc = stream.registerOptionShort({
    key: "cc",
    restGuard: optionFlagRestGuard,
    nextGuard: optionFlagNextGuard,
  });

  expect(stream.consumePositional()).toStrictEqual("positional-1");

  const kSovSplit = stream.registerOptionShort({
    key: "sov-split",
    restGuard: optionValuedRestGuard,
    nextGuard: optionValuedNextGuard,
  });
  const kSovJoin = stream.registerOptionShort({
    key: "sov-join",
    restGuard: optionValuedRestGuard,
    nextGuard: optionValuedNextGuard,
  });
  const kSovUnset = stream.registerOptionShort({
    key: "sov-unset",
    restGuard: optionValuedRestGuard,
    nextGuard: optionValuedNextGuard,
  });

  const kDd = stream.registerOptionShort({
    key: "dd",
    restGuard: optionFlagRestGuard,
    nextGuard: optionFlagNextGuard,
  });
  const kEe = stream.registerOptionShort({
    key: "ee",
    restGuard: optionFlagRestGuard,
    nextGuard: optionFlagNextGuard,
  });

  const kFf = stream.registerOptionShort({
    key: "ff",
    restGuard: optionFlagRestGuard,
    nextGuard: optionFlagNextGuard,
  });
  const kGg = stream.registerOptionShort({
    key: "gg",
    restGuard: optionFlagRestGuard,
    nextGuard: optionFlagNextGuard,
  });

  expect(stream.consumePositional()).toStrictEqual("positional-2");

  expect(kSofUnset().values).toStrictEqual([]);
  expect(kSofNormal().values).toStrictEqual([{ inlined: null, separated: [] }]);
  expect(kSofPositive().values).toStrictEqual([
    { inlined: "true", separated: [] },
  ]);
  expect(kSofNegative().values).toStrictEqual([
    { inlined: "false", separated: [] },
  ]);

  expect(kAa().values).toStrictEqual([{ inlined: null, separated: [] }]);
  expect(kBb().values).toStrictEqual([{ inlined: null, separated: [] }]);
  expect(kCc().values).toStrictEqual([{ inlined: null, separated: [] }]);

  expect(kSovUnset().values).toStrictEqual([]);
  expect(kSovSplit().values).toStrictEqual([
    { inlined: null, separated: ["1.1"] },
    { inlined: null, separated: ["1.2"] },
  ]);
  expect(kSovJoin().values).toStrictEqual([
    { inlined: "2.1", separated: [] },
    { inlined: "2.2", separated: [] },
  ]);

  expect(kDd().values).toStrictEqual([{ inlined: null, separated: [] }]);
  expect(kEe().values).toStrictEqual([{ inlined: null, separated: [] }]);
  expect(kFf().values).toStrictEqual([{ inlined: null, separated: [] }]);
  expect(kGg().values).toStrictEqual([{ inlined: null, separated: [] }]);
});

const optionFlagRestGuard: ReaderOptionRestGuard = () => false;
const optionFlagNextGuard: ReaderOptionNextGuard = () => false;

const optionValuedRestGuard: ReaderOptionRestGuard = () => true;
const optionValuedNextGuard: ReaderOptionNextGuard = (value) =>
  value.inlined === null && value.separated.length === 0;

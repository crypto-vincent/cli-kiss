import { expect, it } from "@jest/globals";
import {
  ReaderArgs,
  ReaderOptionNextGuard,
  ReaderOptionRestGuard,
} from "../src";

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

  const kFlagUnset = stream.registerOptionLong({
    key: "flag-unset",
    nextGuard: optionFlagNextGuard,
  });
  const kFlagNo = stream.registerOptionLong({
    key: "no-flag-no",
    nextGuard: optionFlagNextGuard,
  });
  const kFlagNormal = stream.registerOptionLong({
    key: "flag-normal",
    nextGuard: optionFlagNextGuard,
  });
  const kFlagPositive = stream.registerOptionLong({
    key: "flag-positive",
    nextGuard: optionFlagNextGuard,
  });
  const kFlagNegative = stream.registerOptionLong({
    key: "flag-negative",
    nextGuard: optionFlagNextGuard,
  });

  expect(stream.consumePositional()).toStrictEqual("positional-1");

  const kOptionUnset = stream.registerOptionLong({
    key: "option-unset",
    nextGuard: optionValuedNextGuard,
  });
  const kOptionSplit = stream.registerOptionLong({
    key: "option-split",
    nextGuard: optionValuedNextGuard,
  });
  const kOptionJoin = stream.registerOptionLong({
    key: "option-join",
    nextGuard: optionValuedNextGuard,
  });

  const kA = stream.registerOptionShort({
    key: "a",
    restGuard: optionFlagRestGuard,
    nextGuard: optionFlagNextGuard,
  });
  const kB = stream.registerOptionShort({
    key: "b",
    restGuard: optionValuedRestGuard,
    nextGuard: optionValuedNextGuard,
  });

  const kC = stream.registerOptionShort({
    key: "c",
    restGuard: optionFlagRestGuard,
    nextGuard: optionFlagNextGuard,
  });
  const kD = stream.registerOptionShort({
    key: "d",
    restGuard: optionValuedRestGuard,
    nextGuard: optionValuedNextGuard,
  });

  const kE = stream.registerOptionShort({
    key: "e",
    restGuard: optionFlagRestGuard,
    nextGuard: optionFlagNextGuard,
  });
  const kF = stream.registerOptionShort({
    key: "f",
    restGuard: optionValuedRestGuard,
    nextGuard: optionValuedNextGuard,
  });

  expect(stream.consumePositional()).toStrictEqual("positional-2");

  const kG = stream.registerOptionShort({
    key: "g",
    restGuard: optionFlagRestGuard,
    nextGuard: optionFlagNextGuard,
  });
  const kH = stream.registerOptionShort({
    key: "h",
    restGuard: optionValuedRestGuard,
    nextGuard: optionValuedNextGuard,
  });

  const kI = stream.registerOptionShort({
    key: "i",
    restGuard: optionFlagRestGuard,
    nextGuard: optionFlagNextGuard,
  });
  const kJ = stream.registerOptionShort({
    key: "j",
    restGuard: optionValuedRestGuard,
    nextGuard: optionValuedNextGuard,
  });

  expect(stream.consumePositional()).toStrictEqual("positional-3");

  expect(stream.consumePositional()).toStrictEqual("--not-a-flag(positional)");
  expect(stream.consumePositional()).toStrictEqual("-mn(positional)");
  expect(stream.consumePositional()).toStrictEqual("--");
  expect(stream.consumePositional()).toStrictEqual("positional-4");
  expect(stream.consumePositional()).toStrictEqual(undefined);

  expect(kFlagUnset()).toStrictEqual([]);
  expect(kFlagNo()).toStrictEqual([{ inlined: null, separated: [] }]);
  expect(kFlagNormal()).toStrictEqual([{ inlined: null, separated: [] }]);
  expect(kFlagPositive()).toStrictEqual([{ inlined: "true", separated: [] }]);
  expect(kFlagNegative()).toStrictEqual([{ inlined: "false", separated: [] }]);

  expect(kOptionUnset()).toStrictEqual([]);
  expect(kOptionSplit()).toStrictEqual([
    { inlined: null, separated: ["1.1"] },
    { inlined: null, separated: ["1.2"] },
  ]);
  expect(kOptionJoin()).toStrictEqual([
    { inlined: "2.1", separated: [] },
    { inlined: "2.2", separated: [] },
  ]);

  expect(kA()).toStrictEqual([{ inlined: null, separated: [] }]);
  expect(kB()).toStrictEqual([
    { inlined: null, separated: ["3.1"] },
    { inlined: null, separated: ["3.2"] },
  ]);

  expect(kC()).toStrictEqual([{ inlined: null, separated: [] }]);
  expect(kD()).toStrictEqual([
    { inlined: "4.1", separated: [] },
    { inlined: "4.2", separated: [] },
  ]);

  expect(kE()).toStrictEqual([{ inlined: null, separated: [] }]);
  expect(kF()).toStrictEqual([
    { inlined: "5.1", separated: [] },
    { inlined: "5.2", separated: [] },
  ]);

  expect(kG()).toStrictEqual([{ inlined: null, separated: [] }]);
  expect(kH()).toStrictEqual([{ inlined: "FALSE", separated: [] }]);

  expect(kI()).toStrictEqual([{ inlined: null, separated: [] }]);
  expect(kJ()).toStrictEqual([{ inlined: "TRUE", separated: [] }]);
});

const optionFlagRestGuard: ReaderOptionRestGuard = () => false;
const optionFlagNextGuard: ReaderOptionNextGuard = () => false;

const optionValuedRestGuard: ReaderOptionRestGuard = () => true;
const optionValuedNextGuard: ReaderOptionNextGuard = (value) =>
  value.inlined === null && value.separated.length === 0;

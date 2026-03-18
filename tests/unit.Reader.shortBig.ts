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

  stream.registerFlag({
    key: "sof-normal",
    shorts: ["sof-normal"],
    longs: [],
  });
  stream.registerFlag({
    key: "sof-positive",
    longs: [],
    shorts: ["sof-positive"],
  });
  stream.registerFlag({
    key: "sof-negative",
    longs: [],
    shorts: ["sof-negative"],
  });
  stream.registerFlag({
    key: "sof-unset",
    longs: [],
    shorts: ["sof-unset"],
  });

  stream.registerFlag({ key: "aa", longs: [], shorts: ["aa"] });
  stream.registerFlag({ key: "bb", longs: [], shorts: ["bb"] });
  stream.registerFlag({ key: "cc", longs: [], shorts: ["cc"] });

  expect(stream.consumePositional()).toStrictEqual("positional-1");

  stream.registerOption({
    key: "sov-split",
    longs: [],
    shorts: ["sov-split"],
  });
  stream.registerOption({
    key: "sov-join",
    longs: [],
    shorts: ["sov-join"],
  });
  stream.registerOption({
    key: "sov-unset",
    longs: [],
    shorts: ["sov-unset"],
  });

  stream.registerFlag({ key: "dd", longs: [], shorts: ["dd"] });
  stream.registerFlag({ key: "ee", longs: [], shorts: ["ee"] });
  stream.registerFlag({ key: "ff", longs: [], shorts: ["ff"] });

  expect(stream.consumePositional()).toStrictEqual("positional-2");

  expect(stream.readFlag("sof-normal")).toStrictEqual(true);
  expect(stream.readFlag("sof-positive")).toStrictEqual(true);
  expect(stream.readFlag("sof-negative")).toStrictEqual(false);
  expect(stream.readFlag("sof-unset")).toStrictEqual(undefined);

  expect(stream.readFlag("aa")).toStrictEqual(true);
  expect(stream.readFlag("bb")).toStrictEqual(true);
  expect(stream.readFlag("cc")).toStrictEqual(true);

  expect(stream.readOption("sov-unset")).toStrictEqual([]);
  expect(stream.readOption("sov-split")).toStrictEqual(["1.1", "1.2"]);
  expect(stream.readOption("sov-join")).toStrictEqual(["2"]);

  expect(stream.readFlag("dd")).toStrictEqual(true);
  expect(stream.readFlag("ee")).toStrictEqual(true);
  expect(stream.readFlag("ff")).toStrictEqual(true);
});

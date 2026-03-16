import { expect, it } from "@jest/globals";
import { Reader } from "../src";

it("run", async () => {
  const stream = new Reader([
    "node",
    "script.js",
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

  expect(stream.consumeFlag("sof-normal")).toStrictEqual(true);
  expect(stream.consumeFlag("sof-positive")).toStrictEqual(true);
  expect(stream.consumeFlag("sof-negative")).toStrictEqual(false);
  expect(stream.consumeFlag("sof-unset")).toStrictEqual(false);

  expect(stream.consumeFlag("aa")).toStrictEqual(true);
  expect(stream.consumeFlag("bb")).toStrictEqual(true);
  expect(stream.consumeFlag("cc")).toStrictEqual(true);

  expect(stream.consumeOption("sov-unset")).toStrictEqual([]);
  expect(stream.consumeOption("sov-split")).toStrictEqual(["1.1", "1.2"]);
  expect(stream.consumeOption("sov-join")).toStrictEqual(["2"]);

  expect(stream.consumeFlag("dd")).toStrictEqual(true);
  expect(stream.consumeFlag("ee")).toStrictEqual(true);
  expect(stream.consumeFlag("ff")).toStrictEqual(true);
});

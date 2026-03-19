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

  const kfne = stream.registerOption({
    shorts: ["sof-normal"],
    longs: [],
    valued: false,
  });
  const kfpo = stream.registerOption({
    longs: [],
    shorts: ["sof-positive"],
    valued: false,
  });
  const kfne = stream.registerOption({
    longs: [],
    shorts: ["sof-negative"],
    valued: false,
  });
  const kfue = stream.registerOption({
    longs: [],
    shorts: ["sof-unset"],
    valued: false,
  });

  stream.registerOption({
    key: "aa",
    longs: [],
    shorts: ["aa"],
    valued: false,
  });
  stream.registerOption({
    key: "bb",
    longs: [],
    shorts: ["bb"],
    valued: false,
  });
  stream.registerOption({
    key: "cc",
    longs: [],
    shorts: ["cc"],
    valued: false,
  });

  expect(stream.consumePositional()).toStrictEqual("positional-1");

  stream.registerOption({
    key: "sov-split",
    longs: [],
    shorts: ["sov-split"],
    valued: true,
  });
  stream.registerOption({
    key: "sov-join",
    longs: [],
    shorts: ["sov-join"],
    valued: true,
  });
  stream.registerOption({
    key: "sov-unset",
    longs: [],
    shorts: ["sov-unset"],
    valued: true,
  });

  stream.registerOption({
    key: "dd",
    longs: [],
    shorts: ["dd"],
    valued: false,
  });
  stream.registerOption({
    key: "ee",
    longs: [],
    shorts: ["ee"],
    valued: false,
  });
  stream.registerOption({
    key: "ff",
    longs: [],
    shorts: ["ff"],
    valued: false,
  });

  expect(stream.consumePositional()).toStrictEqual("positional-2");

  expect(stream.getOptionValues("sof-normal")).toStrictEqual(true);
  expect(stream.getOptionValues("sof-positive")).toStrictEqual(true);
  expect(stream.getOptionValues("sof-negative")).toStrictEqual(false);
  expect(stream.getOptionValues("sof-unset")).toStrictEqual(undefined);

  expect(stream.getOptionValues("aa")).toStrictEqual(true);
  expect(stream.getOptionValues("bb")).toStrictEqual(true);
  expect(stream.getOptionValues("cc")).toStrictEqual(true);

  expect(stream.getOptionValues("sov-unset")).toStrictEqual([]);
  expect(stream.getOptionValues("sov-split")).toStrictEqual(["1.1", "1.2"]);
  expect(stream.getOptionValues("sov-join")).toStrictEqual(["2"]);

  expect(stream.getOptionValues("dd")).toStrictEqual(true);
  expect(stream.getOptionValues("ee")).toStrictEqual(true);
  expect(stream.getOptionValues("ff")).toStrictEqual(true);
});

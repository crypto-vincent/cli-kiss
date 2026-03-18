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
    "--not-a-flag",
    "-mn",
    "--",
    "positional-4",
  ]);

  expect(stream.consumePositional()).toStrictEqual("positional-0");

  stream.registerFlag({
    key: "flag-normal",
    longs: ["flag-normal"],
    shorts: [],
  });
  stream.registerFlag({
    key: "flag-positive",
    longs: ["flag-positive"],
    shorts: [],
  });
  stream.registerFlag({
    key: "flag-negative",
    longs: ["flag-negative"],
    shorts: [],
  });
  stream.registerFlag({
    key: "flag-unset",
    longs: ["flag-unset"],
    shorts: [],
  });

  expect(stream.consumePositional()).toStrictEqual("positional-1");

  stream.registerOption({
    key: "option-split",
    longs: ["option-split"],
    shorts: [],
  });
  stream.registerOption({
    key: "option-join",
    longs: ["option-join"],
    shorts: [],
  });
  stream.registerOption({
    key: "option-unset",
    longs: ["option-unset"],
    shorts: [],
  });

  stream.registerFlag({ key: "a", longs: [], shorts: ["a"] });
  stream.registerOption({ key: "b", longs: [], shorts: ["b"] });

  stream.registerFlag({ key: "c", longs: [], shorts: ["c"] });
  stream.registerOption({ key: "d", longs: [], shorts: ["d"] });

  stream.registerFlag({ key: "e", longs: [], shorts: ["e"] });
  stream.registerOption({ key: "f", longs: [], shorts: ["f"] });

  expect(stream.consumePositional()).toStrictEqual("positional-2");

  stream.registerFlag({ key: "g", longs: [], shorts: ["g"] });
  stream.registerFlag({ key: "h", longs: [], shorts: ["h"] });

  stream.registerFlag({ key: "i", longs: [], shorts: ["i"] });
  stream.registerFlag({ key: "j", longs: [], shorts: ["j"] });

  expect(stream.consumePositional()).toStrictEqual("positional-3");

  expect(stream.consumePositional()).toStrictEqual("--not-a-flag");
  expect(stream.consumePositional()).toStrictEqual("-mn");
  expect(stream.consumePositional()).toStrictEqual("--");
  expect(stream.consumePositional()).toStrictEqual("positional-4");
  expect(stream.consumePositional()).toStrictEqual(undefined);

  expect(stream.consumeFlag("flag-normal")).toStrictEqual(true);
  expect(stream.consumeFlag("flag-positive")).toStrictEqual(true);
  expect(stream.consumeFlag("flag-negative")).toStrictEqual(false);
  expect(stream.consumeFlag("flag-unset")).toStrictEqual(undefined);

  expect(stream.consumeOption("option-unset")).toStrictEqual([]);
  expect(stream.consumeOption("option-split")).toStrictEqual(["1.1", "1.2"]);
  expect(stream.consumeOption("option-join")).toStrictEqual(["2"]);

  expect(stream.consumeFlag("a")).toStrictEqual(true);
  expect(stream.consumeOption("b")).toStrictEqual(["3.1", "3.2"]);

  expect(stream.consumeFlag("c")).toStrictEqual(true);
  expect(stream.consumeOption("d")).toStrictEqual(["4.1", "4.2"]);

  expect(stream.consumeFlag("e")).toStrictEqual(true);
  expect(stream.consumeOption("f")).toStrictEqual(["5.1", "5.2"]);

  expect(stream.consumeFlag("g")).toStrictEqual(true);
  expect(stream.consumeFlag("h")).toStrictEqual(false);

  expect(stream.consumeFlag("i")).toStrictEqual(true);
  expect(stream.consumeFlag("j")).toStrictEqual(true);
});

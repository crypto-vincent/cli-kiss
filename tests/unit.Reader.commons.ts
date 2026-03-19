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

  const kfno = stream.registerOption({
    longs: ["flag-normal"],
    shorts: [],
    valued: false,
  });
  const kfpo = stream.registerOption({
    longs: ["flag-positive"],
    shorts: [],
    valued: false,
  });
  const kfne = stream.registerOption({
    longs: ["flag-negative"],
    shorts: [],
    valued: false,
  });
  const kfun = stream.registerOption({
    longs: ["flag-unset"],
    shorts: [],
    valued: false,
  });

  expect(stream.consumePositional()).toStrictEqual("positional-1");

  const kos = stream.registerOption({
    longs: ["option-split"],
    shorts: [],
    valued: true,
  });
  const koj = stream.registerOption({
    longs: ["option-join"],
    shorts: [],
    valued: true,
  });
  const kou = stream.registerOption({
    longs: ["option-unset"],
    shorts: [],
    valued: true,
  });

  const kfsa = stream.registerOption({
    longs: [],
    shorts: ["a"],
    valued: false,
  });
  const kfsb = stream.registerOption({
    longs: [],
    shorts: ["b"],
    valued: false,
  });

  const kfsc = stream.registerOption({
    longs: [],
    shorts: ["c"],
    valued: false,
  });
  const kfsd = stream.registerOption({
    longs: [],
    shorts: ["d"],
    valued: false,
  });

  const kfse = stream.registerOption({
    longs: [],
    shorts: ["e"],
    valued: false,
  });
  const kfsf = stream.registerOption({
    longs: [],
    shorts: ["f"],
    valued: false,
  });

  expect(stream.consumePositional()).toStrictEqual("positional-2");

  const kfsg = stream.registerOption({
    longs: [],
    shorts: ["g"],
    valued: false,
  });
  const kfsh = stream.registerOption({
    longs: [],
    shorts: ["h"],
    valued: false,
  });

  const kfsi = stream.registerOption({
    longs: [],
    shorts: ["i"],
    valued: false,
  });
  const kfsj = stream.registerOption({
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

  expect(stream.getOptionValues(kfno)).toStrictEqual(true);
  expect(stream.getOptionValues(kfpo)).toStrictEqual(true);
  expect(stream.getOptionValues(kfne)).toStrictEqual(false);
  expect(stream.getOptionValues(kfun)).toStrictEqual(undefined);

  expect(stream.getOptionValues(kou)).toStrictEqual([]);
  expect(stream.getOptionValues(kos)).toStrictEqual(["1.1", "1.2"]);
  expect(stream.getOptionValues(koj)).toStrictEqual(["2"]);

  expect(stream.getOptionValues(kfsa)).toStrictEqual(true);
  expect(stream.getOptionValues(kfsb)).toStrictEqual(["3.1", "3.2"]);

  expect(stream.getOptionValues(kfsc)).toStrictEqual(true);
  expect(stream.getOptionValues(kfsd)).toStrictEqual(["4.1", "4.2"]);

  expect(stream.getOptionValues(kfse)).toStrictEqual(true);
  expect(stream.getOptionValues(kfsf)).toStrictEqual(["5.1", "5.2"]);

  expect(stream.getOptionValues(kfsg)).toStrictEqual(true);
  expect(stream.getOptionValues(kfsh)).toStrictEqual(false);

  expect(stream.getOptionValues(kfsi)).toStrictEqual(true);
  expect(stream.getOptionValues(kfsj)).toStrictEqual(true);
});

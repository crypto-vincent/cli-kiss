import { it } from "@jest/globals";
import { ReaderArgs } from "../src";
import { fuzzedAlternatives } from "../src/lib/Fuzzed";

it("run", async function () {
  expect(fuzzedAlternatives("--inst", ["--install", "--flag", "--blah"])).toBe([
    "--install",
  ]);
  expect(fuzzedAlternatives("instlal", ["install", "dudu", "--blah"])).toBe([
    "install",
  ]);

  expect(fuzzedAlternatives("cat", ["cut"])).toBe(["cut"]);
  expect(fuzzedAlternatives("cat", ["cats"])).toBe(["cats"]);
  expect(fuzzedAlternatives("acb", ["abc"])).toBe(["abc"]);

  const reader = new ReaderArgs(["--inst"]);

  reader.registerOption({
    longs: ["install"],
    shorts: ["i"],
    parsing: { consumeShortGroup: false, consumeNextArg: () => false },
  });

  const dudu = reader.consumePositional();
  console.log(dudu);
});

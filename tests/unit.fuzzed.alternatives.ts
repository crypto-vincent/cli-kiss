import { it } from "@jest/globals";
import { fuzzedAlternatives } from "../src/lib/Fuzzed";

it("run", async function () {
  expect(
    fuzzedAlternatives("--inst", ["--install", "--flag", "--blah"]),
  ).toStrictEqual(["--install"]);

  expect(
    fuzzedAlternatives("instlal", ["install", "dudu", "--blah"]),
  ).toStrictEqual(["install"]);

  expect(
    fuzzedAlternatives("cat", ["cats", "catz", "cut", "kat", "hello", "world"]),
  ).toStrictEqual(["cats", "catz", "cut"]);

  expect(fuzzedAlternatives("cat", ["cut", "kat"])).toStrictEqual([
    "cut",
    "kat",
  ]);

  expect(fuzzedAlternatives("acb", ["abc"])).toStrictEqual(["abc"]);
});

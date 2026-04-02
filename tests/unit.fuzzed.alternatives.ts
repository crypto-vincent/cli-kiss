import { it } from "@jest/globals";
import { fuzzedAlternatives } from "../src/lib/Fuzzed";

it("run", async function () {
  expect(
    fuzzedAlternatives("--inst", ["--install", "--flag", "--blah"]),
  ).toStrictEqual(["--install"]);
  expect(
    fuzzedAlternatives("instlal", ["install", "dudu", "--blah"]),
  ).toStrictEqual(["install"]);

  expect(fuzzedAlternatives("cat", ["cut"])).toStrictEqual(["cut"]);
  expect(fuzzedAlternatives("cat", ["cats"])).toStrictEqual(["cats"]);
  expect(fuzzedAlternatives("acb", ["abc"])).toStrictEqual(["abc"]);
});

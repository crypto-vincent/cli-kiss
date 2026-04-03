import { it } from "@jest/globals";
import { suggestSortedHints } from "../src/lib/Suggest";

it("run", async function () {
  expectMatches(["--flag", "--blah", "--install"], "--inst", ["--install"]);
  expectMatches(["install", "dudu", "--blah"], "instlal", ["install"]);
  expectMatches(["hello", "kat", "cats", "cut"], "cat", ["cats", "kat", "cut"]);
  expectMatches(["cut", "kat"], "cat", ["cut", "kat"]);
  expectMatches(["abc", "ac", "ab"], "acb", ["abc", "ac", "ab"]);
});

function expectMatches(
  candidates: Array<string>,
  input: string,
  expecteds: Array<string>,
) {
  const matches = suggestSortedHints(
    input,
    candidates.map((key) => ({ expected: key, hint: key })),
    0.6,
  );
  expect(matches).toStrictEqual(expecteds);
}

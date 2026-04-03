import { it } from "@jest/globals";
import { suggestSorted } from "../src/lib/Suggest";

it("run", async function () {
  expect(
    orderBySimilarity("--inst", ["--flag", "--blah", "--install"]),
  ).toStrictEqual(["--install"]);

  expect(
    orderBySimilarity("instlal", ["install", "dudu", "--blah"]),
  ).toStrictEqual(["install"]);

  expect(
    orderBySimilarity("cat", ["cats", "catz", "cut", "kat", "hello", "world"]),
  ).toStrictEqual(["cats", "catz", "cut", "kat"]);

  expect(orderBySimilarity("cat", ["cut", "kat"])).toStrictEqual([
    "cut",
    "kat",
  ]);

  expect(orderBySimilarity("acb", ["abc", "ac", "ab"])).toStrictEqual([
    "abc",
    "ac",
    "ab",
  ]);
});

function orderBySimilarity(reference: string, candidates: Array<string>) {
  return suggestSorted(
    reference,
    candidates.map((key) => ({ expected: key, advised: key })),
    0.6,
  );
}

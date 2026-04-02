import { it } from "@jest/globals";
import { similaritySort } from "../src/lib/Similarity";

it("run", async function () {
  expect(
    orderBySimilarity("--inst", ["--flag", "--blah", "--install"]),
  ).toStrictEqual(["--install", "--flag", "--blah"]);

  expect(
    orderBySimilarity("instlal", ["install", "dudu", "--blah"]),
  ).toStrictEqual(["install", "--blah", "dudu"]);

  expect(
    orderBySimilarity("cat", ["cats", "catz", "cut", "kat", "hello", "world"]),
  ).toStrictEqual(["cats", "catz", "cut", "kat", "hello", "world"]);

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
  return similaritySort(
    reference,
    candidates.map((key) => ({ key, value: key })),
  );
}

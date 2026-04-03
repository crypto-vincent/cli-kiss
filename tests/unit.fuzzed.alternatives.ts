import { expect, it } from "@jest/globals";
import { suggestReasonablePayloads } from "../src/lib/Suggest";

it("run", async function () {
  expectReasonables(["--flag", "--blah", "--install"], "--inst", ["--install"]);
  expectReasonables(["install", "dudu", "--blah"], "instlal", ["install"]);
  expectReasonables(["hello", "kat", "cats"], "cat", ["cats", "kat"]);
  expectReasonables(["cut", "kat"], "cat", ["cut", "kat"]);
  expectReasonables(["abc", "ac", "ab"], "acb", ["abc", "ac", "ab"]);

  const library = [
    "install",
    "install-package",
    "install-package-latest",
    "uninstall",
    "update",
    "list",
  ];
  expectReasonables(library, "instal", ["install", "uninstall"]);
  expectReasonables(library, "insta-package", ["install-package"]);
  expectReasonables(library, "insta-package-lates", ["install-package-latest"]);
  expectReasonables(library, "install-package-lat", [
    "install-package-latest",
    "install-package",
  ]);
});

function expectReasonables(
  references: Array<string>,
  query: string,
  reasonables: Array<string>,
) {
  expect(
    suggestReasonablePayloads(
      query,
      references.map((key) => ({ reference: key, payload: key })),
    ),
  ).toStrictEqual(reasonables);
}

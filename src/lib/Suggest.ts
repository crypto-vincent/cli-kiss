import { TypoSegment, TypoString, TypoText } from "./Typo";

export function suggestMessagePushInfered(
  message: TypoText,
  found: string,
  candidates: Array<{ expected: string; hint: TypoSegment }>,
) {
  const suggestionsHints = suggestSortedHints(found, candidates, +Infinity);
  if (suggestionsHints.length === 0) {
    return;
  }
  message.push(new TypoString(" Did you mean: "));
  message.pushJoined(suggestionsHints, new TypoString(", "), 3);
  message.push(new TypoString(` ?`));
}

export function suggestSortedHints<Hint>(
  found: string,
  candidates: Array<{ expected: string; hint: Hint }>,
  filterDistanceThreshold: number,
): Array<Hint> {
  const foundNormalized = found.toLowerCase().slice(0, 100);
  const scored = candidates.map(({ expected, hint }) => {
    const expectedNormalized = expected.toLowerCase().slice(0, 100);
    const distance =
      distanceDamerauLevenshtein(foundNormalized, expectedNormalized) /
      Math.max(foundNormalized.length, expectedNormalized.length);
    return { hint, distance };
  });
  return scored
    .sort((a, b) => a.distance - b.distance)
    .filter((v) => v.distance <= filterDistanceThreshold)
    .map((v) => v.hint);
}

function distanceDamerauLevenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i++) {
    dp[i]![0] = i;
  }
  for (let j = 0; j <= n; j++) {
    dp[0]![j] = j;
  }
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(
        dp[i - 1]![j]! + 1,
        dp[i]![j - 1]! + 1,
        dp[i - 1]![j - 1]! + cost,
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        dp[i]![j] = Math.min(dp[i]![j]!, dp[i - 2]![j - 2]! + cost);
      }
    }
  }
  return dp[m]![n]!;
}

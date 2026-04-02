export function similarityOrdered<Value>(
  reference: string,
  candidates: { [key: string]: Value } | Array<{ key: string; value: Value }>,
): Array<Value> {
  let entries = Array.isArray(candidates)
    ? candidates.map(({ key, value }) => [key, value] as const)
    : Object.entries(candidates);
  const ranked = entries.map(([key, value]) => {
    const score =
      damerauLevenshtein(reference, key) /
      Math.max(reference.length, key.length);
    return { key, value, score };
  });
  return ranked.sort((a, b) => a.score - b.score).map((v) => v.value);
}

function damerauLevenshtein(a: string, b: string): number {
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

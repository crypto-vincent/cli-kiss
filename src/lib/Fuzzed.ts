// TODO - clean this up (and take objects with context as parameters instead)

export function fuzzedAlternatives(
  input: string,
  candidates: string[],
): Array<string> {
  const normalizedInput = input.toLowerCase();
  const ranked = candidates.map((candidate) => {
    const normalizedCandidate = candidate.toLowerCase();
    const dist = damerauLevenshtein(normalizedInput, normalizedCandidate);
    const norm =
      dist / Math.max(normalizedInput.length, normalizedCandidate.length);
    let bonus = 0;
    if (normalizedCandidate.startsWith(normalizedInput)) {
      bonus -= 0.15;
    }
    if (normalizedCandidate[0] === normalizedInput[0]) {
      bonus -= 0.05;
    }
    return { candidate, score: norm + bonus };
  });
  ranked.sort((a, b) => a.score - b.score);
  return ranked.filter((r) => r.score <= 0.4).map((r) => r.candidate);
}

function damerauLevenshtein(
  normalizedInput: string,
  normalizedCandidate: string,
): number {
  const m = normalizedInput.length;
  const n = normalizedCandidate.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0),
  );
  for (let i = 0; i <= m; i++) {
    dp[i]![0] = i;
  }
  for (let j = 0; j <= n; j++) {
    dp[0]![j] = j;
  }
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost =
        normalizedInput[i - 1] === normalizedCandidate[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(
        dp[i - 1]![j]! + 1,
        dp[i]![j - 1]! + 1,
        dp[i - 1]![j - 1]! + cost,
      );
      if (
        i > 1 &&
        j > 1 &&
        normalizedInput[i - 1] === normalizedCandidate[j - 2] &&
        normalizedInput[i - 2] === normalizedCandidate[j - 1]
      ) {
        dp[i]![j] = Math.min(dp[i]![j]!, dp[i - 2]![j - 2]! + cost); // transposition
      }
    }
  }
  return dp[m]![n]!;
}

import { TypoSegment, TypoString, TypoText } from "./Typo";

export function suggestTextPushMessage(
  text: TypoText,
  query: string,
  candidates: Array<{ reference: string; hint: TypoSegment }>,
) {
  const reasonableHints = suggestReasonablePayloads(
    query,
    candidates.map(({ reference, hint }) => ({ reference, payload: hint })),
  );
  if (reasonableHints.length === 0) {
    return;
  }
  text.push(new TypoString(" Did you mean: "));
  text.pushJoined(reasonableHints, new TypoString(", "), 3);
  text.push(new TypoString(` ?`));
}

export function suggestReasonablePayloads<Payload>(
  query: string,
  candidates: Array<{ reference: string; payload: Payload }>,
): Array<Payload> {
  if (candidates.length === 0) {
    return [];
  }
  const sortedAlternatives = computeAndSortByDivergences(query, candidates);
  const divergenceThreshold = sortedAlternatives[0]!.divergence + 0.25;
  const acceptablePayloads = new Array<Payload>();
  for (const { divergence, payload } of sortedAlternatives) {
    if (divergence > divergenceThreshold) {
      break;
    }
    acceptablePayloads.push(payload);
  }
  return acceptablePayloads;
}

function computeAndSortByDivergences<Payload>(
  query: string,
  candidates: Array<{ reference: string; payload: Payload }>,
): Array<{ divergence: number; payload: Payload }> {
  const queryNormalized = query.toLowerCase().slice(0, 100);
  const scored = candidates.map(({ reference, payload }) => {
    const referenceNormalized = reference.toLowerCase().slice(0, 100);
    const divergence =
      distanceDamerauLevenshtein(queryNormalized, referenceNormalized) /
      Math.max(queryNormalized.length, referenceNormalized.length);
    return { divergence, reference, payload };
  });
  return scored.sort((a, b) => a.divergence - b.divergence);
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

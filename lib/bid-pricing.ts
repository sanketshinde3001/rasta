export const BID_ANALYSIS_VERSION = 2;

// A lower price is a saving for the same scope, not evidence of poor quality.
// Keep price influence bounded so delivery and repair history still matter.
export function bidPricing(amount: number, estimate: number) {
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(estimate) || estimate <= 0) return null;
  const saving = estimate - amount;
  return {
    saving,
    percent: Math.round(Math.abs(saving / estimate) * 100),
    scoreAdjustment: Math.max(-15, Math.min(15, (saving / estimate) * 30)),
  };
}

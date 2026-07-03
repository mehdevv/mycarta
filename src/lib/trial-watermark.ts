/** Free-trial shops show a Carta watermark on client loyalty cards. */
export function shouldShowCartaWatermark(
  showCartaWatermark?: boolean | null,
  planId?: string | null,
): boolean {
  if (showCartaWatermark != null) return Boolean(showCartaWatermark);
  return planId === "trial";
}

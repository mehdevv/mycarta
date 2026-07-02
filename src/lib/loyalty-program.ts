export type LoyaltyProgramSettings = {
  stampsEnabled?: boolean;
  spendEnabled?: boolean;
  /** @deprecated legacy single mode */
  rewardMode?: string;
};

export function resolveLoyaltyFlags(settings: LoyaltyProgramSettings | null | undefined) {
  if (settings?.stampsEnabled !== undefined || settings?.spendEnabled !== undefined) {
    return {
      stampsEnabled: settings.stampsEnabled !== false,
      spendEnabled: settings.spendEnabled === true,
    };
  }

  const mode = settings?.rewardMode ?? "stamps";
  return {
    stampsEnabled: mode === "stamps" || mode === "both",
    spendEnabled: mode === "spend" || mode === "both",
  };
}

export const MAX_TIME_BALANCE_MINUTES = 150;

export const clampTimeBalance = (value) => {
  const minutes = Number(value);
  if (!Number.isFinite(minutes)) return 0;
  return Math.min(MAX_TIME_BALANCE_MINUTES, Math.max(0, minutes));
};

export const normalizeWallet = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value).map(([childId, balance]) => {
      const safeBalance = balance && typeof balance === "object" && !Array.isArray(balance)
        ? balance
        : {};

      return [
        childId,
        {
          ...safeBalance,
          time: clampTimeBalance(safeBalance.time),
        },
      ];
    })
  );
};

export const applyWalletUpdate = (previousWallet, update) => {
  const nextWallet = typeof update === "function"
    ? update(previousWallet)
    : update;

  return normalizeWallet(nextWallet);
};

export const STRATEGY_PROPOSED = 'WALLET.INDIRECT_FUNDING.STRATEGY_PROPOSED';
export const strategyProposed = (channelId: string) => ({
  type: STRATEGY_PROPOSED as typeof STRATEGY_PROPOSED,
  processId: channelId,
  channelId,
});
export type StrategyProposed = ReturnType<typeof strategyProposed>;

export type Action = StrategyProposed;

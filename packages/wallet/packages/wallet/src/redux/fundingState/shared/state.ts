export interface BaseFundingState {
  requestedTotalFunds: string;
  requestedYourContribution: string;
  channelId: string;
  ourIndex: number;
  channelFundingStatus: string;
}

export const DIRECT_FUNDING = 'FUNDING_TYPE.DIRECT';
export interface SharedDirectFundingState extends BaseFundingState {
  fundingType: typeof DIRECT_FUNDING;
  safeToDepositLevel: string;
}

export const INDIRECT_FUNDING = 'FUNDING_TYPE.INDIRECT';
export interface SharedIndirectFundingState extends BaseFundingState {
  fundingType: typeof INDIRECT_FUNDING;
}

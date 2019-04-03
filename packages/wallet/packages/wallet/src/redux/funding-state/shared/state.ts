export interface BaseFundingState {
  requestedTotalFunds: string;
  requestedYourContribution: string;
  channelId: string;
  ourIndex: number;
  channelFundingStatus: string;
}

export const INDIRECT_FUNDING = 'FUNDING_TYPE.INDIRECT';
export interface SharedIndirectFundingState extends BaseFundingState {
  fundingType: typeof INDIRECT_FUNDING;
}

import { DirectFundingStatus, DirectFundingState } from './directFunding/state';

export const UNKNOWN_FUNDING_TYPE = 'FUNDING_TYPE.UNKNOWN';
export const FUNDING_NOT_STARTED = 'FUNDING_NOT_STARTED';

interface SharedFundingStatus {
  totalForDestination?: string;
  channelId?: string;
}
export interface UnknownFundingStatus extends SharedFundingStatus {
  fundingType: typeof UNKNOWN_FUNDING_TYPE;
  channelFundingStatus: typeof FUNDING_NOT_STARTED;
}

export const WAIT_FOR_FUNDING_REQUEST = 'WAIT_FOR_FUNDING_REQUEST';

export interface WaitForFundingRequest extends UnknownFundingStatus {
  type: typeof WAIT_FOR_FUNDING_REQUEST;
}

export function waitForFundingRequest<T extends SharedFundingStatus>(
  params?: T,
): WaitForFundingRequest {
  return {
    ...params,
    type: WAIT_FOR_FUNDING_REQUEST,
    fundingType: UNKNOWN_FUNDING_TYPE,
    channelFundingStatus: FUNDING_NOT_STARTED,
  };
}

export * from './directFunding/state';
export * from './shared/state';
export type FundingStatus = WaitForFundingRequest | DirectFundingStatus;

interface IndirectFundingStatus {
  placeholder: 'placeholder';
}
export interface IndirectFundingState {
  [channelId: string]: IndirectFundingStatus;
}
export interface FundingState {
  directFunding: DirectFundingState;
  indirectFunding: IndirectFundingState;
}

export const EMPTY_FUNDING_STATE: FundingState = {
  directFunding: {},
  indirectFunding: {},
};

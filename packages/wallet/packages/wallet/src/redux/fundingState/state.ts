import { DirectFundingState } from './directFunding/state';
import { OutboxState } from '../outbox/state';

export const UNKNOWN_FUNDING_TYPE = 'FUNDING_TYPE.UNKNOWN';
export const FUNDING_NOT_STARTED = 'FUNDING_NOT_STARTED';

interface SharedFundingState {
  totalForDestination?: string;
  destination?: string;
}
export interface UnknownFundingState extends SharedFundingState {
  fundingType: typeof UNKNOWN_FUNDING_TYPE;
  channelFundingStatus: typeof FUNDING_NOT_STARTED;
}

export const WAIT_FOR_FUNDING_REQUEST = 'WAIT_FOR_FUNDING_REQUEST';

export interface WaitForFundingRequest extends UnknownFundingState {
  type: typeof WAIT_FOR_FUNDING_REQUEST;
}

export function waitForFundingRequest<T extends SharedFundingState>(
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
export type FundingState = WaitForFundingRequest | DirectFundingState;

export interface DirectFundingStateWithSideEffects {
  fundingState: WaitForFundingRequest | DirectFundingState;
  outboxState?: OutboxState;
}

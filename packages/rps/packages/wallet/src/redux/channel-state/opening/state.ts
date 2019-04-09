import { FirstCommitmentReceived, firstCommitmentReceived } from '../shared/state';

// stage
export const OPENING = 'OPENING';

// state type
export const WAIT_FOR_PRE_FUND_SETUP = 'WAIT_FOR_PRE_FUND_SETUP';

export interface WaitForPreFundSetup extends FirstCommitmentReceived {
  type: typeof WAIT_FOR_PRE_FUND_SETUP;
  stage: typeof OPENING;
}

export function waitForPreFundSetup<T extends FirstCommitmentReceived>(
  params: T,
): WaitForPreFundSetup {
  return { type: WAIT_FOR_PRE_FUND_SETUP, stage: OPENING, ...firstCommitmentReceived(params) };
}

export type OpeningState = WaitForPreFundSetup;

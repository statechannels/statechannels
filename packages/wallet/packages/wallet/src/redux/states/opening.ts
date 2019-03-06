import { AddressExists, addressExists, FirstMoveSent, firstMoveSent } from './shared';

// stage
export const OPENING = 'OPENING';

// state type
export const WAIT_FOR_PRE_FUND_SETUP = 'WAIT_FOR_PRE_FUND_SETUP';
export const WAIT_FOR_CHANNEL = 'WAIT_FOR_CHANNEL';

export interface WaitForChannel extends AddressExists {
  type: typeof WAIT_FOR_CHANNEL;
  stage: typeof OPENING;
}
export interface WaitForPreFundSetup extends FirstMoveSent {
  type: typeof WAIT_FOR_PRE_FUND_SETUP;
  stage: typeof OPENING;
}

export function waitForChannel<T extends AddressExists>(params: T): WaitForChannel {
  return { type: WAIT_FOR_CHANNEL, stage: OPENING, ...addressExists(params) };
}
export function waitForPreFundSetup<T extends FirstMoveSent>(params: T): WaitForPreFundSetup {
  return { type: WAIT_FOR_PRE_FUND_SETUP, stage: OPENING, ...firstMoveSent(params) };
}

export type OpeningState = WaitForChannel | WaitForPreFundSetup;

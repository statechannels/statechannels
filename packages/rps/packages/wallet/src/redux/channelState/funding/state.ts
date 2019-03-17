/**
 * The term 'funding' is a bit overloaded here, as it is referring to the stage of the channel, as well as
 * the actual funding of the channel.
 */

import { MaybeFunded, channelOpen } from '../shared/state';

// stage
export const FUNDING = 'FUNDING';

// STATE TYPES
// Funding setup
export const WAIT_FOR_FUNDING_REQUEST = 'CHANNEL.WAIT_FOR_FUNDING_REQUEST';
export const WAIT_FOR_FUNDING_APPROVAL = 'APPROVE_FUNDING';

// Funding ongoing
export const WAIT_FOR_FUNDING_AND_POST_FUND_SETUP = 'WAIT_FOR_FUNDING_AND_POST_FUND_SETUP';
export const WAIT_FOR_FUNDING_CONFIRMATION = 'WAIT_FOR_FUNDING_CONFIRMATION';
export const A_WAIT_FOR_POST_FUND_SETUP = 'A_WAIT_FOR_POST_FUND_SETUP';
export const B_WAIT_FOR_POST_FUND_SETUP = 'B_WAIT_FOR_POST_FUND_SETUP';

// Possible end states
export const ACKNOWLEDGE_FUNDING_SUCCESS = 'ACKNOWLEDGE_FUNDING_SUCCESS';
export const SEND_FUNDING_DECLINED_MESSAGE = 'SEND_FUNDING_DECLINED_MESSAGE';
export const ACKNOWLEDGE_FUNDING_DECLINED = 'ACKNOWLEDGE_FUNDING_DECLINED';

interface BaseFundingChannelState extends MaybeFunded {
  funded: boolean; // Though this is computable from fundingState, it might be convenient to record this on the top-level of the channel state
}

function fundingChannelState<T extends BaseFundingChannelState>(
  params: T,
): BaseFundingChannelState {
  const { fundingState, funded } = params;
  return { ...channelOpen(params), fundingState, funded };
}

export interface WaitForFundingRequest extends BaseFundingChannelState {
  type: typeof WAIT_FOR_FUNDING_REQUEST;
  stage: typeof FUNDING;
}

export interface WaitForFundingApproval extends BaseFundingChannelState {
  type: typeof WAIT_FOR_FUNDING_APPROVAL;
  stage: typeof FUNDING;
}

export interface WaitForFundingAndPostFundSetup extends BaseFundingChannelState {
  type: typeof WAIT_FOR_FUNDING_AND_POST_FUND_SETUP;
  stage: typeof FUNDING;
}

export interface WaitForFundingConfirmation extends BaseFundingChannelState {
  type: typeof WAIT_FOR_FUNDING_CONFIRMATION;
  stage: typeof FUNDING;
}

export interface AWaitForPostFundSetup extends BaseFundingChannelState {
  type: typeof A_WAIT_FOR_POST_FUND_SETUP;
  stage: typeof FUNDING;
}

export interface BWaitForPostFundSetup extends BaseFundingChannelState {
  type: typeof B_WAIT_FOR_POST_FUND_SETUP;
  stage: typeof FUNDING;
}

export interface SendFundingDeclinedMessage extends BaseFundingChannelState {
  type: typeof SEND_FUNDING_DECLINED_MESSAGE;
  stage: typeof FUNDING;
}

export interface AcknowledgeFundingSuccess extends BaseFundingChannelState {
  type: typeof ACKNOWLEDGE_FUNDING_SUCCESS;
  stage: typeof FUNDING;
}

export interface AcknowledgeFundingDeclined extends BaseFundingChannelState {
  type: typeof ACKNOWLEDGE_FUNDING_DECLINED;
  stage: typeof FUNDING;
}

export function waitForFundingRequest<T extends BaseFundingChannelState>(
  params: T,
): WaitForFundingRequest {
  return {
    type: WAIT_FOR_FUNDING_REQUEST,
    stage: FUNDING,
    ...channelOpen(params),
    fundingState: params.fundingState,
    funded: false,
  };
}

export function approveFunding<T extends BaseFundingChannelState>(
  params: T,
): WaitForFundingApproval {
  return {
    type: WAIT_FOR_FUNDING_APPROVAL,
    stage: FUNDING,
    ...fundingChannelState(params),
    fundingState: params.fundingState,
  };
}

export function waitForFundingAndPostFundSetup<T extends BaseFundingChannelState>(
  params: T,
): WaitForFundingAndPostFundSetup {
  return {
    type: WAIT_FOR_FUNDING_AND_POST_FUND_SETUP,
    stage: FUNDING,
    ...fundingChannelState(params),
  };
}

export function waitForFundingConfirmation<T extends BaseFundingChannelState>(
  params: T,
): WaitForFundingConfirmation {
  return { type: WAIT_FOR_FUNDING_CONFIRMATION, stage: FUNDING, ...fundingChannelState(params) };
}

export function aWaitForPostFundSetup<T extends BaseFundingChannelState>(
  params: T,
): AWaitForPostFundSetup {
  return { type: A_WAIT_FOR_POST_FUND_SETUP, stage: FUNDING, ...fundingChannelState(params) };
}

export function bWaitForPostFundSetup<T extends BaseFundingChannelState>(
  params: T,
): BWaitForPostFundSetup {
  return { type: B_WAIT_FOR_POST_FUND_SETUP, stage: FUNDING, ...fundingChannelState(params) };
}

export function acknowledgeFundingSuccess<T extends BaseFundingChannelState>(
  params: T,
): AcknowledgeFundingSuccess {
  return { type: ACKNOWLEDGE_FUNDING_SUCCESS, stage: FUNDING, ...fundingChannelState(params) };
}

export function sendFundingDeclinedMessage<T extends BaseFundingChannelState>(
  params: T,
): SendFundingDeclinedMessage {
  return { type: SEND_FUNDING_DECLINED_MESSAGE, stage: FUNDING, ...fundingChannelState(params) };
}

export function acknowledgeFundingDeclined<T extends BaseFundingChannelState>(
  params: T,
): AcknowledgeFundingDeclined {
  return { type: ACKNOWLEDGE_FUNDING_DECLINED, stage: FUNDING, ...fundingChannelState(params) };
}

export type FundingChannelState =
  | WaitForFundingRequest
  | WaitForFundingApproval
  | WaitForFundingAndPostFundSetup
  | WaitForFundingConfirmation
  // ^^^ PlayerA should never let PlayerB get into this state, as it lets PlayerB move to the application phase
  // with no real value at stake, giving them a chance to take the real value that's backing PlayerA's stake.
  | AWaitForPostFundSetup
  | BWaitForPostFundSetup
  | AcknowledgeFundingSuccess // <-- at this point, a message might need to be sent
  | SendFundingDeclinedMessage
  | AcknowledgeFundingDeclined;

/**
 * The term 'funding' is a bit overloaded here, as it is referring to the stage of the channel, as well as
 * the actual funding of the channel.
 */

import { channelOpen, ChannelOpen } from '../shared/state';

// stage
export const FUNDING = 'FUNDING';

// STATE TYPES
// Funding setup
export const WAIT_FOR_FUNDING_REQUEST = 'CHANNEL.WAIT_FOR_FUNDING_REQUEST';
export const WAIT_FOR_FUNDING_APPROVAL = 'CHANNEL.WAIT_FOR_FUNDING_APPROVAL';

// Funding ongoing
export const WAIT_FOR_FUNDING_AND_POST_FUND_SETUP = 'WAIT_FOR_FUNDING_AND_POST_FUND_SETUP';
export const WAIT_FOR_FUNDING_CONFIRMATION = 'WAIT_FOR_FUNDING_CONFIRMATION';
export const A_WAIT_FOR_POST_FUND_SETUP = 'A_WAIT_FOR_POST_FUND_SETUP';
export const B_WAIT_FOR_POST_FUND_SETUP = 'B_WAIT_FOR_POST_FUND_SETUP';

// Possible end states
export const ACKNOWLEDGE_FUNDING_SUCCESS = 'ACKNOWLEDGE_FUNDING_SUCCESS';
export const SEND_FUNDING_DECLINED_MESSAGE = 'SEND_FUNDING_DECLINED_MESSAGE';
export const ACKNOWLEDGE_FUNDING_DECLINED = 'ACKNOWLEDGE_FUNDING_DECLINED';

export interface WaitForFundingRequest extends ChannelOpen {
  type: typeof WAIT_FOR_FUNDING_REQUEST;
  stage: typeof FUNDING;
}

export interface WaitForFundingApproval extends ChannelOpen {
  type: typeof WAIT_FOR_FUNDING_APPROVAL;
  stage: typeof FUNDING;
}

export interface WaitForFundingAndPostFundSetup extends ChannelOpen {
  type: typeof WAIT_FOR_FUNDING_AND_POST_FUND_SETUP;
  stage: typeof FUNDING;
}

export interface WaitForFundingConfirmation extends ChannelOpen {
  type: typeof WAIT_FOR_FUNDING_CONFIRMATION;
  stage: typeof FUNDING;
}

export interface AWaitForPostFundSetup extends ChannelOpen {
  type: typeof A_WAIT_FOR_POST_FUND_SETUP;
  stage: typeof FUNDING;
}

export interface BWaitForPostFundSetup extends ChannelOpen {
  type: typeof B_WAIT_FOR_POST_FUND_SETUP;
  stage: typeof FUNDING;
}

export interface SendFundingDeclinedMessage extends ChannelOpen {
  type: typeof SEND_FUNDING_DECLINED_MESSAGE;
  stage: typeof FUNDING;
}

export interface AcknowledgeFundingSuccess extends ChannelOpen {
  type: typeof ACKNOWLEDGE_FUNDING_SUCCESS;
  stage: typeof FUNDING;
}

export interface AcknowledgeFundingDeclined extends ChannelOpen {
  type: typeof ACKNOWLEDGE_FUNDING_DECLINED;
  stage: typeof FUNDING;
}

export function waitForFundingRequest<T extends ChannelOpen>(params: T): WaitForFundingRequest {
  return {
    type: WAIT_FOR_FUNDING_REQUEST,
    stage: FUNDING,
    ...channelOpen(params),
  };
}

export function approveFunding<T extends ChannelOpen>(params: T): WaitForFundingApproval {
  return {
    type: WAIT_FOR_FUNDING_APPROVAL,
    stage: FUNDING,
    ...channelOpen(params),
  };
}

export function waitForFundingAndPostFundSetup<T extends ChannelOpen>(
  params: T,
): WaitForFundingAndPostFundSetup {
  return {
    type: WAIT_FOR_FUNDING_AND_POST_FUND_SETUP,
    stage: FUNDING,
    ...channelOpen(params),
  };
}

export function waitForFundingConfirmation<T extends ChannelOpen>(
  params: T,
): WaitForFundingConfirmation {
  return { type: WAIT_FOR_FUNDING_CONFIRMATION, stage: FUNDING, ...channelOpen(params) };
}

export function aWaitForPostFundSetup<T extends ChannelOpen>(params: T): AWaitForPostFundSetup {
  return { type: A_WAIT_FOR_POST_FUND_SETUP, stage: FUNDING, ...channelOpen(params) };
}

export function bWaitForPostFundSetup<T extends ChannelOpen>(params: T): BWaitForPostFundSetup {
  return { type: B_WAIT_FOR_POST_FUND_SETUP, stage: FUNDING, ...channelOpen(params) };
}

export function acknowledgeFundingSuccess<T extends ChannelOpen>(
  params: T,
): AcknowledgeFundingSuccess {
  return { type: ACKNOWLEDGE_FUNDING_SUCCESS, stage: FUNDING, ...channelOpen(params) };
}

export function sendFundingDeclinedMessage<T extends ChannelOpen>(
  params: T,
): SendFundingDeclinedMessage {
  return { type: SEND_FUNDING_DECLINED_MESSAGE, stage: FUNDING, ...channelOpen(params) };
}

export function acknowledgeFundingDeclined<T extends ChannelOpen>(
  params: T,
): AcknowledgeFundingDeclined {
  return { type: ACKNOWLEDGE_FUNDING_DECLINED, stage: FUNDING, ...channelOpen(params) };
}

export type FundingState =
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

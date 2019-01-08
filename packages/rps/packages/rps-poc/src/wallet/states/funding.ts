import { AdjudicatorExists, ChannelOpen, channelOpen, adjudicatorExists, AdjudicatorMightExist, adjudicatorMightExist, } from './shared';

// stage
export const FUNDING = 'FUNDING';

// state types
export const WAIT_FOR_FUNDING_REQUEST = 'WAIT_FOR_FUNDING_REQUEST';
export const APPROVE_FUNDING = 'APPROVE_FUNDING';
export const A_WAIT_FOR_DEPLOY_TO_BE_SENT_TO_METAMASK = 'A_WAIT_FOR_DEPLOY_TO_BE_SENT_TO_METAMASK';
export const A_SUBMIT_DEPLOY_IN_METAMASK = 'A_SUBMIT_DEPLOY_IN_METAMASK';
export const WAIT_FOR_DEPLOY_CONFIRMATION = 'WAIT_FOR_DEPLOY_CONFIRMATION';
export const A_WAIT_FOR_DEPOSIT = 'A_WAIT_FOR_DEPOSIT';
export const A_WAIT_FOR_POST_FUND_SETUP = 'A_WAIT_FOR_POST_FUND_SETUP';
export const B_WAIT_FOR_DEPLOY_ADDRESS = 'B_WAIT_FOR_DEPLOY_ADDRESS';
export const B_WAIT_FOR_DEPOSIT_TO_BE_SENT_TO_METAMASK = 'B_WAIT_FOR_DEPOSIT_TO_BE_SENT_TO_METAMASK';
export const B_SUBMIT_DEPOSIT_IN_METAMASK = 'B_SUBMIT_DEPOSIT_IN_METAMASK';
export const WAIT_FOR_DEPOSIT_CONFIRMATION = 'WAIT_FOR_DEPOSIT_CONFIRMATION';
export const B_WAIT_FOR_POST_FUND_SETUP = 'B_WAIT_FOR_POST_FUND_SETUP';
export const ACKNOWLEDGE_FUNDING_SUCCESS = 'ACKNOWLEDGE_FUNDING_SUCCESS';

export interface WaitForFundingRequest extends ChannelOpen {
  type: typeof WAIT_FOR_FUNDING_REQUEST;
  stage: typeof FUNDING;
}

export interface ApproveFunding extends AdjudicatorMightExist {
  type: typeof APPROVE_FUNDING;
  stage: typeof FUNDING;
}

export interface AWaitForDeployToBeSentToMetaMask extends ChannelOpen {
  type: typeof A_WAIT_FOR_DEPLOY_TO_BE_SENT_TO_METAMASK;
  stage: typeof FUNDING;
}
export interface ASubmitDeployInMetaMask extends ChannelOpen {
  type: typeof A_SUBMIT_DEPLOY_IN_METAMASK;
  stage: typeof FUNDING;
}

export interface BWaitForDeployAddress extends ChannelOpen {
  type: typeof B_WAIT_FOR_DEPLOY_ADDRESS;
  stage: typeof FUNDING;
}

export interface WaitForDeployConfirmation extends ChannelOpen {
  type: typeof WAIT_FOR_DEPLOY_CONFIRMATION;
  stage: typeof FUNDING;
}

export interface BWaitForDepositToBeSentToMetaMask extends AdjudicatorExists {
  type: typeof B_WAIT_FOR_DEPOSIT_TO_BE_SENT_TO_METAMASK;
  stage: typeof FUNDING;
}

export interface BSubmitDepositInMetaMask extends AdjudicatorExists {
  type: typeof B_SUBMIT_DEPOSIT_IN_METAMASK;
  stage: typeof FUNDING;
}

export interface AWaitForDeposit extends AdjudicatorExists {
  type: typeof A_WAIT_FOR_DEPOSIT;
  stage: typeof FUNDING;
}

export interface WaitForDepositConfirmation extends AdjudicatorExists {
  type: typeof WAIT_FOR_DEPOSIT_CONFIRMATION;
  stage: typeof FUNDING;
}


export interface AWaitForPostFundSetup extends AdjudicatorExists {
  type: typeof A_WAIT_FOR_POST_FUND_SETUP;
  stage: typeof FUNDING;
}

export interface BWaitForPostFundSetup extends AdjudicatorExists {
  type: typeof B_WAIT_FOR_POST_FUND_SETUP;
  stage: typeof FUNDING;
}

export interface AcknowledgeFundingSuccess extends AdjudicatorExists {
  type: typeof ACKNOWLEDGE_FUNDING_SUCCESS;
  stage: typeof FUNDING;
}

export function waitForFundingRequest<T extends ChannelOpen>(params: T): WaitForFundingRequest {
  return { type: WAIT_FOR_FUNDING_REQUEST, stage: FUNDING, ...channelOpen(params) };
}

export function approveFunding<T extends AdjudicatorMightExist>(params: T): ApproveFunding {
  return { type: APPROVE_FUNDING, stage: FUNDING, ...adjudicatorMightExist(params) };
}

export function aWaitForDeployToBeSentToMetaMask<T extends ChannelOpen>(params: T): AWaitForDeployToBeSentToMetaMask {
  return { type: A_WAIT_FOR_DEPLOY_TO_BE_SENT_TO_METAMASK, stage: FUNDING, ...channelOpen(params) };
}

export function aSubmitDeployInMetaMask<T extends ChannelOpen>(params: T): ASubmitDeployInMetaMask {
  return { type: A_SUBMIT_DEPLOY_IN_METAMASK, stage: FUNDING, ...channelOpen(params) };
}

export function bWaitForDeployAddress<T extends ChannelOpen>(params: T): BWaitForDeployAddress {
  return { type: B_WAIT_FOR_DEPLOY_ADDRESS, stage: FUNDING, ...channelOpen(params) };
}

export function waitForDeployConfirmation<T extends ChannelOpen>(params: T): WaitForDeployConfirmation {
  return { type: WAIT_FOR_DEPLOY_CONFIRMATION, stage: FUNDING, ...channelOpen(params) };
}

export function aWaitForDeposit<T extends AdjudicatorExists>(params: T): AWaitForDeposit {
  return { type: A_WAIT_FOR_DEPOSIT, stage: FUNDING, ...adjudicatorExists(params) };
}

export function bWaitForDepositToBeSentToMetaMask<T extends AdjudicatorExists>(params: T): BWaitForDepositToBeSentToMetaMask {
  return { type: B_WAIT_FOR_DEPOSIT_TO_BE_SENT_TO_METAMASK, stage: FUNDING, ...adjudicatorExists(params) };
}

export function bSubmitDepositInMetaMask<T extends AdjudicatorExists>(params: T): BSubmitDepositInMetaMask {
  return { type: B_SUBMIT_DEPOSIT_IN_METAMASK, stage: FUNDING, ...adjudicatorExists(params) };
}

export function waitForDepositConfirmation<T extends AdjudicatorExists>(params: T): WaitForDepositConfirmation {
  return { type: WAIT_FOR_DEPOSIT_CONFIRMATION, stage: FUNDING, ...adjudicatorExists(params) };
}

export function aWaitForPostFundSetup<T extends AdjudicatorExists>(params: T): AWaitForPostFundSetup {
  return { type: A_WAIT_FOR_POST_FUND_SETUP, stage: FUNDING, ...adjudicatorExists(params) };
}

export function bWaitForPostFundSetup<T extends AdjudicatorExists>(params: T): BWaitForPostFundSetup {
  return { type: B_WAIT_FOR_POST_FUND_SETUP, stage: FUNDING, ...adjudicatorExists(params) };
}

export function acknowledgeFundingSuccess<T extends AdjudicatorExists>(params: T): AcknowledgeFundingSuccess {
  return { type: ACKNOWLEDGE_FUNDING_SUCCESS, stage: FUNDING, ...adjudicatorExists(params) };
}

export type FundingState = (
  | WaitForFundingRequest
  | ApproveFunding
  | AWaitForDeployToBeSentToMetaMask
  | ASubmitDeployInMetaMask
  | BWaitForDeployAddress
  | WaitForDeployConfirmation
  | BWaitForDepositToBeSentToMetaMask
  | BSubmitDepositInMetaMask
  | AWaitForDeposit
  | WaitForDepositConfirmation
  | BWaitForPostFundSetup
  | AWaitForPostFundSetup
  | AcknowledgeFundingSuccess
);

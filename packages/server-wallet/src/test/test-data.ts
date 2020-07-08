import {calculateChannelId} from '../state-utils';
import {
  allocationOutcome2,
  allocationOutcome3,
  BEGINNING_APP_NONCE,
  DUMMY_CHAIN_ID,
  DUMMY_RULES_ADDRESS,
  FUNDED_GUARANTOR_NONCE,
  FUNDED_NONCE,
  FUNDED_NONCE_3,
  NONCE,
  ONGOING_APP_NONCE,
  PARTICIPANTS,
  PARTICIPANTS_3,
  UNFUNDED_NONCE
} from './test-constants';
import {ChannelConstants, Participant, State} from '../store-types';

export const defaultChannel: ChannelConstants = {
  participants: PARTICIPANTS,
  channelNonce: NONCE,
  chainId: DUMMY_CHAIN_ID,
  challengeDuration: 9001,
  appDefinition: DUMMY_RULES_ADDRESS
};

const constants = (participants: Participant[], channelNonce: number) => ({
  ...defaultChannel,
  participants,
  channelNonce,
  myIndex: 1
});

export const defaultChannel3 = constants(PARTICIPANTS_3, NONCE);
export const unfundedChannel = constants(PARTICIPANTS, UNFUNDED_NONCE);
export const fundedChannel = constants(PARTICIPANTS, FUNDED_NONCE);
export const fundedChannel3 = constants(PARTICIPANTS_3, FUNDED_NONCE_3);
export const fundedGuarantorChannel = constants(PARTICIPANTS, FUNDED_GUARANTOR_NONCE);
export const beginningAppPhaseChannel = constants(PARTICIPANTS, BEGINNING_APP_NONCE);
export const ongoingAppPhaseChannel = constants([], ONGOING_APP_NONCE);

export const UNFUNDED_CHANNEL_ID = calculateChannelId(unfundedChannel);
export const FUNDED_CHANNEL_ID = calculateChannelId(fundedChannel);
export const FUNDED_CHANNEL_ID_3 = calculateChannelId(fundedChannel3);
export const FUNDED_GUARANTOR_CHANNEL_ID = calculateChannelId(fundedGuarantorChannel);
export const BEGINNING_APP_CHANNEL_ID = calculateChannelId(beginningAppPhaseChannel);
export const ONGOING_APP_CHANNEL_ID = calculateChannelId(ongoingAppPhaseChannel);

const baseState = (turnNum: number) => ({
  turnNum,
  isFinal: false,
  challengeDuration: 1000,
  outcome: allocationOutcome2,
  appDefinition: DUMMY_RULES_ADDRESS,
  appData: ''
});

const baseState3 = (turnNum: number) => ({
  ...baseState(turnNum),
  outcome: allocationOutcome3
});

function prefundSetup(turnNum: number): State {
  return {...baseState(turnNum), ...defaultChannel};
}

export function prefundSetup3(turnNum: number): State {
  return {...baseState3(turnNum), ...defaultChannel3};
}

function postfundSetup(turnNum: number): State {
  return {...baseState(turnNum), ...fundedChannel};
}

export function postfundSetup3(turnNum: number): State {
  return {...baseState3(turnNum), ...fundedChannel3};
}

function app(turnNum: number, channel: ChannelConstants): State {
  return {...baseState(turnNum), ...channel};
}

export const stateConstructors = {prefundSetup, postfundSetup, app, prefundSetup3, postfundSetup3};

// Ledger Channel Manager input states
export const createdPrefundSetup1: State = {
  ...defaultChannel,
  appData: '',
  turnNum: 1,
  outcome: allocationOutcome2,
  isFinal: false,
  challengeDuration: 1000,
  appDefinition: DUMMY_RULES_ADDRESS
};

export const createdPrefundSetup2Participants3: State = {
  ...defaultChannel3,
  appData: '',
  turnNum: 2,
  outcome: allocationOutcome3,
  isFinal: false,
  challengeDuration: 1000,
  appDefinition: DUMMY_RULES_ADDRESS
};

import {
  Channel,
  encodeConsensusData,
  getChannelId,
  State,
  ConsensusData
} from '@statechannels/nitro-protocol';
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

export function channelObjectToModel(channel: Channel) {
  return {
    ...channel,
    participants: channel.participants.map((participant, index) => ({
      address: participant,
      priority: index
    }))
  };
}

export const defaultChannel: Channel = {
  participants: PARTICIPANTS,
  channelNonce: NONCE,
  chainId: DUMMY_CHAIN_ID
};

const defaultChannel3: Channel = {
  participants: PARTICIPANTS_3,
  channelNonce: NONCE,
  chainId: DUMMY_CHAIN_ID
};

export const unfundedChannel: Channel = {
  participants: PARTICIPANTS,
  channelNonce: UNFUNDED_NONCE,
  chainId: DUMMY_CHAIN_ID
};

export const fundedChannel: Channel = {
  participants: PARTICIPANTS,
  channelNonce: FUNDED_NONCE,
  chainId: DUMMY_CHAIN_ID
};

export const fundedChannel3: Channel = {
  participants: PARTICIPANTS_3,
  channelNonce: FUNDED_NONCE_3,
  chainId: DUMMY_CHAIN_ID
};

export const fundedGuarantorChannel: Channel = {
  participants: PARTICIPANTS,
  channelNonce: FUNDED_GUARANTOR_NONCE,
  chainId: DUMMY_CHAIN_ID
};

export const beginningAppPhaseChannel: Channel = {
  participants: PARTICIPANTS,
  channelNonce: BEGINNING_APP_NONCE,
  chainId: DUMMY_CHAIN_ID
};

export const ongoingAppPhaseChannel: Channel = {
  participants: PARTICIPANTS,
  channelNonce: ONGOING_APP_NONCE,
  chainId: DUMMY_CHAIN_ID
};

export const UNFUNDED_CHANNEL_ID = getChannelId(unfundedChannel);
export const FUNDED_CHANNEL_ID = getChannelId(fundedChannel);
export const FUNDED_CHANNEL_ID_3 = getChannelId(fundedChannel3);
export const FUNDED_GUARANTOR_CHANNEL_ID = getChannelId(fundedGuarantorChannel);
export const BEGINNING_APP_CHANNEL_ID = getChannelId(beginningAppPhaseChannel);
export const ONGOING_APP_CHANNEL_ID = getChannelId(ongoingAppPhaseChannel);

export const consensusAppData2 = (n: number): ConsensusData => ({
  furtherVotesRequired: n,
  proposedOutcome: allocationOutcome2
});

export const consensusAppData3 = (n: number): ConsensusData => ({
  furtherVotesRequired: n,
  proposedOutcome: allocationOutcome3
});

const baseState = (turnNum: number) => ({
  turnNum,
  isFinal: false,
  challengeDuration: 1000,
  outcome: allocationOutcome2,
  appDefinition: DUMMY_RULES_ADDRESS,
  appData: encodeConsensusData(consensusAppData2(0))
});

const baseState3 = (turnNum: number) => ({
  ...baseState(turnNum),
  outcome: allocationOutcome3,
  appData: encodeConsensusData(consensusAppData3(0))
});

function prefundSetup(turnNum: number): State {
  return {
    ...baseState(turnNum),
    channel: {...defaultChannel}
  };
}

export function prefundSetup3(turnNum: number): State {
  return {
    ...baseState3(turnNum),
    channel: {...defaultChannel3}
  };
}

function postfundSetup(turnNum: number): State {
  return {
    ...baseState(turnNum),
    channel: {...fundedChannel}
  };
}

export function postfundSetup3(turnNum: number): State {
  return {
    ...baseState3(turnNum),
    channel: {...fundedChannel3}
  };
}

function app(turnNum: number, channel: Channel): State {
  return {
    ...baseState(turnNum),
    channel,
    appData: encodeConsensusData(consensusAppData2((turnNum + 1) % channel.participants.length))
  };
}

export const stateConstructors = {
  prefundSetup,
  postfundSetup,
  app,
  prefundSetup3,
  postfundSetup3
};

// Ledger Channel Manager input states
export const createdPrefundSetup1: State = {
  channel: defaultChannel,
  turnNum: 1,
  outcome: allocationOutcome2,
  appData: encodeConsensusData(consensusAppData2(1)),
  isFinal: false,
  challengeDuration: 1000,
  appDefinition: DUMMY_RULES_ADDRESS
};

export const createdPrefundSetup2Participants3: State = {
  channel: defaultChannel3,
  turnNum: 2,
  outcome: allocationOutcome3,
  appData: encodeConsensusData(consensusAppData3(1)),
  isFinal: false,
  challengeDuration: 1000,
  appDefinition: DUMMY_RULES_ADDRESS
};

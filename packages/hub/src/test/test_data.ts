import {Channel, encodeConsensusData, getChannelId, State} from '@statechannels/nitro-protocol';
import {ConsensusData} from '@statechannels/nitro-protocol/lib/src/contract/consensus-data';
import {HUB_ADDRESS} from '../constants';
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
  PARTICIPANT_1_ADDRESS,
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

export const consensus_app_data2 = (n: number): ConsensusData => ({
  furtherVotesRequired: n,
  proposedOutcome: allocationOutcome2
});

export const consensus_app_data3 = (n: number): ConsensusData => ({
  furtherVotesRequired: n,
  proposedOutcome: allocationOutcome3
});

const baseState = (turnNum: number) => ({
  turnNum,
  isFinal: false,
  challengeDuration: 1000,
  outcome: allocationOutcome2,
  appDefinition: DUMMY_RULES_ADDRESS,
  appData: encodeConsensusData(consensus_app_data2(0))
});

const baseState3 = (turnNum: number) => ({
  ...baseState(turnNum),
  outcome: allocationOutcome3,
  appData: encodeConsensusData(consensus_app_data3(0))
});

function pre_fund_setup(turnNum: number): State {
  return {
    ...baseState(turnNum),
    channel: {...defaultChannel}
  };
}

export function pre_fund_setup_3(turnNum: number): State {
  return {
    ...baseState3(turnNum),
    channel: {...defaultChannel3}
  };
}

function post_fund_setup(turnNum: number): State {
  return {
    ...baseState(turnNum),
    channel: {...fundedChannel}
  };
}

export function post_fund_setup_3(turnNum: number): State {
  return {
    ...baseState3(turnNum),
    channel: {...fundedChannel3}
  };
}

function app(turnNum: number, channel: Channel): State {
  return {
    ...baseState(turnNum),
    channel,
    appData: encodeConsensusData(consensus_app_data2((turnNum + 1) % channel.participants.length))
  };
}

export const stateConstructors = {
  pre_fund_setup,
  post_fund_setup,
  app,
  pre_fund_setup_3,
  post_fund_setup_3
};

const base_response = {
  channel: {
    channelNonce: expect.any(String),
    participants: PARTICIPANTS,
    chainId: DUMMY_CHAIN_ID
  },
  outcome: allocationOutcome2,
  challengeDuration: 1000,
  appDefinition: DUMMY_RULES_ADDRESS,
  isFinal: false
};

const base_response_3 = {
  channel: {
    channelNonce: expect.any(String),
    participants: PARTICIPANTS_3,
    chainId: DUMMY_CHAIN_ID
  },
  outcome: allocationOutcome3,
  challengeDuration: 1000,
  appDefinition: DUMMY_RULES_ADDRESS,
  isFinal: false
};

// Ledger Channel Manager Responses
export const pre_fund_setup_1_response: State = {
  ...base_response,
  turnNum: 1,
  appData: encodeConsensusData(consensus_app_data2(0))
};

export const pre_fund_setup_3_2_response: State = {
  ...base_response_3,
  turnNum: 2,
  appData: encodeConsensusData(consensus_app_data3(0))
};

export const post_fund_setup_1_response: State = {
  ...base_response,
  turnNum: 3,
  appData: encodeConsensusData(consensus_app_data2(0)),
  channel: fundedChannel
};

export const post_fund_setup_3_2_response: State = {
  ...base_response_3,
  turnNum: 5,
  appData: encodeConsensusData(consensus_app_data3(0)),
  channel: fundedChannel3
};

export const app_1_response: State = {
  ...base_response,
  turnNum: 5,
  appData: encodeConsensusData({proposedOutcome: [], furtherVotesRequired: 0}),
  channel: beginningAppPhaseChannel
};

// Ledger Channel Manager input states
export const created_pre_fund_setup_1: State = {
  channel: defaultChannel,
  turnNum: 1,
  outcome: allocationOutcome2,
  appData: encodeConsensusData(consensus_app_data2(1)),
  isFinal: false,
  challengeDuration: 1000,
  appDefinition: DUMMY_RULES_ADDRESS
};

export const created_pre_fund_setup_3_2: State = {
  channel: defaultChannel3,
  turnNum: 2,
  outcome: allocationOutcome3,
  appData: encodeConsensusData(consensus_app_data3(1)),
  isFinal: false,
  challengeDuration: 1000,
  appDefinition: DUMMY_RULES_ADDRESS
};

export const created_channel = {
  id: expect.any(Number),
  participants: [{address: PARTICIPANT_1_ADDRESS}, {address: HUB_ADDRESS}],
  chainId: DUMMY_CHAIN_ID
};

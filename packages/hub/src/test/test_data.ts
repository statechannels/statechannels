import {Channel, encodeConsensusData, getChannelId, State} from '@statechannels/nitro-protocol';
import {ConsensusData} from '@statechannels/nitro-protocol/lib/src/contract/consensus-data';
import {HUB_ADDRESS} from '../constants';
import {
  BEGINNING_APP_CHANNEL_NONCE,
  DUMMY_CHAIN_ID,
  DUMMY_RULES_ADDRESS,
  FUNDED_CHANNEL_NONCE,
  FUNDED_CHANNEL_NONCE_3,
  NONCE,
  ONGOING_APP_CHANNEL_NONCE,
  outcome2,
  outcome3,
  PARTICIPANT_1_ADDRESS,
  PARTICIPANTS,
  PARTICIPANTS_3
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

export const default_channel: Channel = {
  participants: PARTICIPANTS,
  channelNonce: NONCE,
  chainId: DUMMY_CHAIN_ID
};

const default_channel_3: Channel = {
  participants: PARTICIPANTS_3,
  channelNonce: NONCE,
  chainId: DUMMY_CHAIN_ID
};

export const funded_channel: Channel = {
  participants: PARTICIPANTS,
  channelNonce: FUNDED_CHANNEL_NONCE,
  chainId: DUMMY_CHAIN_ID
};

export const funded_channel_3: Channel = {
  participants: PARTICIPANTS_3,
  channelNonce: FUNDED_CHANNEL_NONCE_3,
  chainId: DUMMY_CHAIN_ID
};

export const beginning_app_phase_channel: Channel = {
  participants: PARTICIPANTS,
  channelNonce: BEGINNING_APP_CHANNEL_NONCE,
  chainId: DUMMY_CHAIN_ID
};

export const ongoing_app_phase_channel: Channel = {
  participants: PARTICIPANTS,
  channelNonce: ONGOING_APP_CHANNEL_NONCE,
  chainId: DUMMY_CHAIN_ID
};

export const FUNDED_NONCE_CHANNEL_ID = getChannelId(funded_channel);
export const FUNDED_NONCE_CHANNEL_ID_3 = getChannelId(funded_channel_3);
export const BEGINNING_APP_CHANNEL_NONCE_CHANNEL_ID = getChannelId(beginning_app_phase_channel);
export const ONGOING_APP_CHANNEL_NONCE_CHANNEL_ID = getChannelId(ongoing_app_phase_channel);

export const consensus_app_data2 = (n: number): ConsensusData => ({
  furtherVotesRequired: n,
  proposedOutcome: outcome2
});

export const consensus_app_data3 = (n: number): ConsensusData => ({
  furtherVotesRequired: n,
  proposedOutcome: outcome3
});

const baseState = (turnNum: number) => ({
  turnNum,
  isFinal: false,
  challengeDuration: 1000,
  outcome: outcome2,
  appDefinition: DUMMY_RULES_ADDRESS,
  appData: encodeConsensusData(consensus_app_data2(0))
});

const baseState3 = (turnNum: number) => ({
  ...baseState(turnNum),
  outcome: outcome3,
  appData: encodeConsensusData(consensus_app_data3(0))
});

function pre_fund_setup(turnNum: number): State {
  return {
    ...baseState(turnNum),
    channel: {...default_channel}
  };
}

export function pre_fund_setup_3(turnNum: number): State {
  return {
    ...baseState3(turnNum),
    channel: {...default_channel_3}
  };
}

function post_fund_setup(turnNum: number): State {
  return {
    ...baseState(turnNum),
    channel: {...funded_channel}
  };
}

export function post_fund_setup_3(turnNum: number): State {
  return {
    ...baseState3(turnNum),
    channel: {...funded_channel_3}
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
  outcome: outcome2,
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
  outcome: outcome3,
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
  channel: funded_channel
};

export const post_fund_setup_3_2_response: State = {
  ...base_response_3,
  turnNum: 5,
  appData: encodeConsensusData(consensus_app_data3(0)),
  channel: funded_channel_3
};

export const app_1_response: State = {
  ...base_response,
  turnNum: 5,
  appData: encodeConsensusData({proposedOutcome: [], furtherVotesRequired: 0}),
  channel: beginning_app_phase_channel
};

// Ledger Channel Manager input states
export const created_pre_fund_setup_1: State = {
  channel: default_channel,
  turnNum: 1,
  outcome: outcome2,
  appData: encodeConsensusData(consensus_app_data2(1)),
  isFinal: false,
  challengeDuration: 1000,
  appDefinition: DUMMY_RULES_ADDRESS
};

export const created_pre_fund_setup_3_2: State = {
  channel: default_channel_3,
  turnNum: 2,
  outcome: outcome3,
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

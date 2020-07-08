import {encodeConsensusData, State} from '@statechannels/nitro-protocol';
import {SERVER_ADDRESS} from '../constants';
import {
  allocationOutcome2,
  allocationOutcome3,
  DUMMY_CHAIN_ID,
  DUMMY_RULES_ADDRESS,
  PARTICIPANTS,
  PARTICIPANTS_3,
  PARTICIPANT_1_ADDRESS
} from './test-constants';
import {
  consensusAppData2,
  consensusAppData3,
  fundedChannel,
  fundedChannel3,
  beginningAppPhaseChannel
} from './test-data';

const baseResponse = {
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

const baseResponse3 = {
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
export const prefundSetup1Response: State = {
  ...baseResponse,
  turnNum: 1,
  appData: encodeConsensusData(consensusAppData2(0))
};

export const prefundSetup2Response3: State = {
  ...baseResponse3,
  turnNum: 2,
  appData: encodeConsensusData(consensusAppData3(0))
};

export const postfundSetup1Response: State = {
  ...baseResponse,
  turnNum: 3,
  appData: encodeConsensusData(consensusAppData2(0)),
  channel: fundedChannel
};

export const postfundSetup2Response3: State = {
  ...baseResponse3,
  turnNum: 5,
  appData: encodeConsensusData(consensusAppData3(0)),
  channel: fundedChannel3
};

export const app1Response: State = {
  ...baseResponse,
  turnNum: 5,
  appData: encodeConsensusData({proposedOutcome: [], furtherVotesRequired: 0}),
  channel: beginningAppPhaseChannel
};

export const createdChannel = {
  id: expect.any(Number),
  participants: [{address: PARTICIPANT_1_ADDRESS}, {address: SERVER_ADDRESS}],
  chainId: DUMMY_CHAIN_ID
};

import { SERVER_ADDRESS } from '../constants';
import {
  allocationOutcome2,
  allocationOutcome3,
  DUMMY_CHAIN_ID,
  DUMMY_RULES_ADDRESS,
  PARTICIPANTS,
  PARTICIPANTS_3,
  PARTICIPANT_1_ADDRESS
} from './test-constants';
import { fundedChannel, fundedChannel3, beginningAppPhaseChannel } from './test-data';
import { State } from '../store-types';

const baseResponse = {
  channelNonce: expect.any(String),
  participants: PARTICIPANTS,
  chainId: DUMMY_CHAIN_ID,
  outcome: allocationOutcome2,
  challengeDuration: 1000,
  appDefinition: DUMMY_RULES_ADDRESS,
  isFinal: false,
  appData: ''
};

const baseResponse3 = {
  channelNonce: expect.any(String),
  participants: PARTICIPANTS_3,
  chainId: DUMMY_CHAIN_ID,
  outcome: allocationOutcome3,
  challengeDuration: 1000,
  appDefinition: DUMMY_RULES_ADDRESS,
  isFinal: false,
  appData: ''
};

// Ledger Channel Manager Responses
export const prefundSetup1Response: State = {
  ...baseResponse,
  turnNum: 1
};

export const prefundSetup2Response3: State = {
  ...baseResponse3,
  turnNum: 2
};

export const postfundSetup1Response: State = {
  ...baseResponse,
  turnNum: 3,
  ...fundedChannel
};

export const postfundSetup2Response3: State = {
  ...baseResponse3,
  turnNum: 5,
  ...fundedChannel3
};

export const app1Response: State = {
  ...baseResponse,
  turnNum: 5,
  ...beginningAppPhaseChannel
};

export const createdChannel = {
  id: expect.any(Number),
  participants: [{ address: PARTICIPANT_1_ADDRESS }, { address: SERVER_ADDRESS }],
  chainId: DUMMY_CHAIN_ID
};

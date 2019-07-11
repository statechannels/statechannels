import { Channel, Commitment, CommitmentType, sign, toHex } from 'fmg-core';
import { channelID } from 'fmg-core/lib/channel';
import { bytesFromAppAttributes } from 'fmg-nitro-adjudicator/lib/consensus-app';
import { AppCommitment } from 'fmg-nitro-adjudicator/lib/consensus-app';
import { HUB_ADDRESS } from '../constants';
import {
  ALLOCATION,
  ALLOCATION_3,
  BEGINNING_APP_CHANNEL_NONCE,
  DESTINATION,
  DESTINATION_3,
  DUMMY_RULES_ADDRESS,
  FUNDED_CHANNEL_NONCE,
  FUNDED_CHANNEL_NONCE_3,
  NONCE,
  ONGOING_APP_CHANNEL_NONCE,
  PARTICIPANT_1_ADDRESS,
  PARTICIPANT_1_PRIVATE_KEY,
  PARTICIPANTS,
  PARTICIPANTS_3,
} from '../test-constants';
import { asCoreCommitment, LedgerCommitment } from '../wallet/services/ledger-commitment';

export const default_channel: Channel = {
  channelType: DUMMY_RULES_ADDRESS,
  participants: PARTICIPANTS,
  nonce: NONCE,
};

const default_channel_3: Channel = {
  channelType: DUMMY_RULES_ADDRESS,
  participants: PARTICIPANTS_3,
  nonce: NONCE,
};

export const funded_channel: Channel = {
  channelType: DUMMY_RULES_ADDRESS,
  participants: PARTICIPANTS,
  nonce: FUNDED_CHANNEL_NONCE,
};
export const funded_channel_id = channelID(funded_channel);

export const funded_channel_3: Channel = {
  channelType: DUMMY_RULES_ADDRESS,
  participants: PARTICIPANTS_3,
  nonce: FUNDED_CHANNEL_NONCE_3,
};
export const funded_channel_id_3 = channelID(funded_channel_3);

export const beginning_app_phase_channel: Channel = {
  channelType: DUMMY_RULES_ADDRESS,
  participants: PARTICIPANTS,
  nonce: BEGINNING_APP_CHANNEL_NONCE,
};

export const ongoing_app_phase_channel: Channel = {
  channelType: DUMMY_RULES_ADDRESS,
  participants: PARTICIPANTS,
  nonce: ONGOING_APP_CHANNEL_NONCE,
};

const consensus_app_attrs = (n: number) => ({
  furtherVotesRequired: n,
  proposedAllocation: [],
  proposedDestination: [],
});

const base = {
  allocation: ALLOCATION,
  destination: DESTINATION,
};

const base_3 = {
  allocation: ALLOCATION_3,
  destination: DESTINATION_3,
};

function pre_fund_setup(turnNum: number): LedgerCommitment {
  return {
    ...base,
    channel: { ...default_channel },
    turnNum,
    appAttributes: consensus_app_attrs(0),
    commitmentCount: turnNum,
    commitmentType: CommitmentType.PreFundSetup,
  };
}

export function pre_fund_setup_3(turnNum: number): LedgerCommitment {
  return {
    ...base_3,
    channel: { ...default_channel_3 },
    turnNum,
    appAttributes: consensus_app_attrs(0),
    commitmentCount: turnNum,
    commitmentType: CommitmentType.PreFundSetup,
  };
}

function post_fund_setup(turnNum: number): LedgerCommitment {
  return {
    ...base,
    channel: { ...funded_channel },
    turnNum,
    appAttributes: consensus_app_attrs(0),
    commitmentCount: turnNum % funded_channel.participants.length,
    commitmentType: CommitmentType.PostFundSetup,
  };
}

export function post_fund_setup_3(turnNum: number): LedgerCommitment {
  return {
    ...base_3,
    channel: { ...funded_channel_3 },
    turnNum,
    appAttributes: consensus_app_attrs(0),
    commitmentCount: turnNum,
    commitmentType: CommitmentType.PostFundSetup,
  };
}

function app(turnNum: number, channel: Channel): AppCommitment {
  return {
    ...base,
    channel,
    turnNum,
    appAttributes: consensus_app_attrs(turnNum % channel.participants.length) as any,
    commitmentCount: 0,
    commitmentType: CommitmentType.App,
  };
}

export const constructors = {
  pre_fund_setup,
  post_fund_setup,
  app,
  pre_fund_setup_3,
  post_fund_setup_3,
};

const base_response = {
  channel: {
    nonce: expect.any(Number),
    channelType: DUMMY_RULES_ADDRESS,
    participants: PARTICIPANTS,
  },
  allocation: ALLOCATION,
  destination: DESTINATION,
};

const base_response_3 = {
  channel: {
    nonce: expect.any(Number),
    channelType: DUMMY_RULES_ADDRESS,
    participants: PARTICIPANTS_3,
  },
  allocation: ALLOCATION_3,
  destination: DESTINATION_3,
};

export const pre_fund_setup_1_response: Commitment = {
  ...base_response,
  turnNum: 1,
  appAttributes: bytesFromAppAttributes(consensus_app_attrs(0)),
  commitmentCount: 1,
  commitmentType: CommitmentType.PreFundSetup,
};

export const pre_fund_setup_3_2_response: Commitment = {
  ...base_response_3,
  turnNum: 2,
  appAttributes: bytesFromAppAttributes(consensus_app_attrs(0)),
  commitmentCount: 2,
  commitmentType: CommitmentType.PreFundSetup,
};

export const post_fund_setup_1_response: Commitment = {
  ...base_response,
  turnNum: 3,
  appAttributes: bytesFromAppAttributes(consensus_app_attrs(0)),
  commitmentCount: 1,
  channel: funded_channel,
  commitmentType: CommitmentType.PostFundSetup,
};

export const post_fund_setup_3_2_response: Commitment = {
  ...base_response_3,
  turnNum: 5,
  appAttributes: bytesFromAppAttributes(consensus_app_attrs(0)),
  commitmentCount: 5,
  channel: funded_channel_3,
  commitmentType: CommitmentType.PostFundSetup,
};

export const app_1_response: Commitment = {
  ...base_response,
  turnNum: 5,
  appAttributes: bytesFromAppAttributes(consensus_app_attrs(0)),
  commitmentCount: 0,
  channel: beginning_app_phase_channel,
  commitmentType: CommitmentType.App,
};

const commitment = asCoreCommitment(pre_fund_setup(0));
export const open_channel_params = {
  from: PARTICIPANT_1_ADDRESS,
  commitment,
  signature: sign(toHex(commitment), PARTICIPANT_1_PRIVATE_KEY),
};

export const invalid_open_channel_params = {
  from: PARTICIPANT_1_ADDRESS,
  commitment,
  signature: sign(toHex(commitment), '0xf00'),
};

export const created_pre_fund_setup_1: LedgerCommitment = {
  channel: default_channel,
  turnNum: 1,
  commitmentCount: 1,
  commitmentType: CommitmentType.PreFundSetup,
  allocation: ALLOCATION,
  destination: DESTINATION,
  appAttributes: consensus_app_attrs(1),
};

export const created_pre_fund_setup_3_2: LedgerCommitment = {
  channel: default_channel_3,
  turnNum: 2,
  commitmentCount: 2,
  commitmentType: CommitmentType.PreFundSetup,
  allocation: ALLOCATION_3,
  destination: DESTINATION_3,
  appAttributes: consensus_app_attrs(2),
};

export const participants = [{ address: PARTICIPANT_1_ADDRESS }, { address: HUB_ADDRESS }];

export const created_channel = {
  id: expect.any(Number),
  participants,
  rulesAddress: DUMMY_RULES_ADDRESS,
};

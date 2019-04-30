import { Channel, Commitment, CommitmentType, sign, toHex } from 'fmg-core';
import { bytesFromAppAttributes } from 'fmg-nitro-adjudicator';
import {
  ALLOCATION,
  BEGINNING_APP_CHANNEL_NONCE,
  DESTINATION,
  DUMMY_RULES_ADDRESS,
  FUNDED_CHANNEL_NONCE,
  HUB_ADDRESS,
  NONCE,
  ONGOING_APP_CHANNEL_NONCE,
  PARTICIPANT_ADDRESS,
  PARTICIPANT_PRIVATE_KEY,
  PARTICIPANTS,
} from '../constants';
import { asCoreCommitment, LedgerCommitment } from '../wallet/services/ledger-commitment';

export const default_channel: Channel = {
  channelType: DUMMY_RULES_ADDRESS,
  participants: PARTICIPANTS,
  nonce: NONCE,
};

export const funded_channel: Channel = {
  channelType: DUMMY_RULES_ADDRESS,
  participants: PARTICIPANTS,
  nonce: FUNDED_CHANNEL_NONCE,
};

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

const app_attrs = (
  n: number,
  proposedAllocation = ALLOCATION,
  proposedDestination = DESTINATION,
) => ({
  consensusCounter: n % 2,
  proposedAllocation,
  proposedDestination,
});

const base = {
  allocation: ALLOCATION,
  destination: DESTINATION,
};

function pre_fund_setup(turnNum: number): LedgerCommitment {
  return {
    ...base,
    channel: { ...default_channel },
    turnNum,
    appAttributes: app_attrs(0),
    commitmentCount: turnNum,
    commitmentType: CommitmentType.PreFundSetup,
  };
}

function post_fund_setup(turnNum: number): LedgerCommitment {
  return {
    ...base,
    channel: { ...funded_channel },
    turnNum,
    appAttributes: app_attrs(0),
    commitmentCount: turnNum % funded_channel.participants.length,
    commitmentType: CommitmentType.PostFundSetup,
  };
}

function app(turnNum: number, channel: Channel): LedgerCommitment {
  return {
    ...base,
    channel,
    turnNum,
    appAttributes: app_attrs(turnNum % channel.participants.length),
    commitmentCount: 0,
    commitmentType: CommitmentType.App,
  };
}

export const constructors = {
  pre_fund_setup,
  post_fund_setup,
  app,
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

export const pre_fund_setup_1_response: Commitment = {
  ...base_response,
  turnNum: 1,
  appAttributes: bytesFromAppAttributes(app_attrs(0)),
  commitmentCount: 1,
  commitmentType: CommitmentType.PreFundSetup,
};

export const post_fund_setup_1_response: Commitment = {
  ...base_response,
  turnNum: 3,
  appAttributes: bytesFromAppAttributes(app_attrs(0)),
  commitmentCount: 1,
  channel: funded_channel,
  commitmentType: CommitmentType.PostFundSetup,
};

export const app_1_response: Commitment = {
  ...base_response,
  turnNum: 5,
  appAttributes: bytesFromAppAttributes(app_attrs(1)),
  commitmentCount: 0,
  channel: beginning_app_phase_channel,
  commitmentType: CommitmentType.App,
};

const commitment = asCoreCommitment(pre_fund_setup(0));
export const open_channel_params = {
  from: PARTICIPANT_ADDRESS,
  commitment,
  signature: sign(toHex(commitment), PARTICIPANT_PRIVATE_KEY),
};

export const invalid_open_channel_params = {
  from: PARTICIPANT_ADDRESS,
  commitment,
  signature: sign(toHex(commitment), '0xf00'),
};

export const created_pre_fund_setup_1 = {
  id: expect.any(Number),
  allocator_channel_id: expect.any(Number),
  turn_number: 1,
  commitment_count: 1,
  commitment_type: CommitmentType.PreFundSetup,
  allocation: ALLOCATION,
  destination: DESTINATION,
  appAttributes: app_attrs(1),
};

export const participants = [{ address: PARTICIPANT_ADDRESS }, { address: HUB_ADDRESS }];

export const created_channel = {
  id: expect.any(Number),
  participants,
  rules_address: DUMMY_RULES_ADDRESS,
};

import {encodeConsensusData} from '@statechannels/nitro-protocol';
import {Model} from 'objection';
import {HUB_ADDRESS} from '../../../constants';
import {
  BEGINNING_APP_CHANNEL_HOLDINGS,
  BEGINNING_APP_CHANNEL_NONCE,
  DUMMY_CHAIN_ID,
  DUMMY_RULES_BEGINNING_APP_CHANNEL_NONCE_CHANNEL_ID,
  DUMMY_RULES_FUNDED_NONCE_CHANNEL_ID,
  DUMMY_RULES_FUNDED_NONCE_CHANNEL_ID_3,
  DUMMY_RULES_ONGOING_APP_CHANNEL_NONCE_CHANNEL_ID,
  FUNDED_CHANNEL_HOLDINGS,
  FUNDED_CHANNEL_NONCE,
  FUNDED_CHANNEL_NONCE_3,
  ONGOING_APP_CHANNEL_HOLDINGS,
  ONGOING_APP_CHANNEL_NONCE,
  outcome2,
  outcome3,
  PARTICIPANT_1_ADDRESS,
  PARTICIPANT_2_ADDRESS
} from '../../../test/test-constants';
import {consensus_app_data2, consensus_app_data3} from '../../../test/test_data';
import Channel from '../../models/channel';
import knex from '../connection';
import {outcomeAddPriorities} from '../utils';

Model.knex(knex);

const participants = [
  {address: PARTICIPANT_1_ADDRESS, priority: 0},
  {address: HUB_ADDRESS, priority: 1}
];

const participants_3 = [
  {address: PARTICIPANT_1_ADDRESS, priority: 0},
  {address: PARTICIPANT_2_ADDRESS, priority: 1},
  {address: HUB_ADDRESS, priority: 2}
];

// ***************
// Ledger channels
// ***************

function pre_fund_setup(turnNum: number) {
  return {
    turnNum,
    outcome: outcomeAddPriorities(outcome2),
    appData: encodeConsensusData(consensus_app_data2(2))
  };
}

function pre_fund_setup_3(turnNum: number) {
  return {
    turnNum,
    outcome: outcomeAddPriorities(outcome3),
    appData: encodeConsensusData(consensus_app_data3(3))
  };
}

const funded_channel = {
  channelId: DUMMY_RULES_FUNDED_NONCE_CHANNEL_ID,
  nonce: FUNDED_CHANNEL_NONCE,
  holdings: FUNDED_CHANNEL_HOLDINGS,
  states: [pre_fund_setup(0), pre_fund_setup(1)],
  participants,
  chainId: DUMMY_CHAIN_ID
};

const funded_channel_3 = {
  channelId: DUMMY_RULES_FUNDED_NONCE_CHANNEL_ID_3,
  nonce: FUNDED_CHANNEL_NONCE_3,
  holdings: FUNDED_CHANNEL_HOLDINGS,
  states: [pre_fund_setup_3(0), pre_fund_setup_3(1), pre_fund_setup_3(2)],
  participants: participants_3,
  chainId: DUMMY_CHAIN_ID
};

function post_fund_setup(turnNum: number) {
  return {
    turnNum,
    outcome: outcomeAddPriorities(outcome2),
    appData: encodeConsensusData(consensus_app_data2(0))
  };
}

const beginning_app_phase_channel = {
  channel_id: DUMMY_RULES_BEGINNING_APP_CHANNEL_NONCE_CHANNEL_ID,
  nonce: BEGINNING_APP_CHANNEL_NONCE,
  holdings: BEGINNING_APP_CHANNEL_HOLDINGS,
  states: [post_fund_setup(2), post_fund_setup(3)],
  participants,
  chainId: DUMMY_CHAIN_ID
};

function app(turnNum: number) {
  return {
    turnNum,
    outcome: outcomeAddPriorities(outcome2),
    appData: encodeConsensusData(consensus_app_data2(turnNum % participants.length))
  };
}

const ongoing_app_phase_channel = {
  channel_id: DUMMY_RULES_ONGOING_APP_CHANNEL_NONCE_CHANNEL_ID,
  nonce: ONGOING_APP_CHANNEL_NONCE,
  holdings: ONGOING_APP_CHANNEL_HOLDINGS,
  states: [app(4), app(5)],
  participants,
  chainId: DUMMY_CHAIN_ID
};

const two_participant_channel_seeds = {
  funded_channel,
  beginning_app_phase_channel,
  ongoing_app_phase_channel
};

const three_participant_channel_seeds = {funded_channel_3};

const SEEDED_CHANNELS_2 = Object.keys(two_participant_channel_seeds).length;
const SEEDED_CHANNELS_3 = Object.keys(three_participant_channel_seeds).length;

const SEEDED_STATES_2 = SEEDED_CHANNELS_2 * 2;
const SEEDED_STATES_3 = SEEDED_CHANNELS_3 * 3;

const SEEDED_ALLOCATIONS_2 = SEEDED_STATES_2 * 2;
const SEEDED_ALLOCATIONS_3 = SEEDED_STATES_3 * 3;

const SEEDED_PARTICIPANTS_2 = SEEDED_CHANNELS_2 * 2;
const SEEDED_PARTICIPANTS_3 = SEEDED_CHANNELS_3 * 3;

// *******
// Exports
// *******
export const SEEDED_CHANNELS = SEEDED_CHANNELS_2 + SEEDED_CHANNELS_3;
export const SEEDED_STATES = SEEDED_STATES_2 + SEEDED_STATES_3;
export const SEEDED_ALLOCATIONS = SEEDED_ALLOCATIONS_2 + SEEDED_ALLOCATIONS_3;
export const SEEDED_PARTICIPANTS = SEEDED_PARTICIPANTS_2 + SEEDED_PARTICIPANTS_3;

export const seeds = {
  ...two_participant_channel_seeds,
  ...three_participant_channel_seeds
};

export function seed() {
  return knex('channels')
    .del()
    .then(() => {
      return Channel.query().insertGraph(Object.values(seeds));
    });
}

export const constructors = {
  pre_fund_setup,
  post_fund_setup,
  app
};

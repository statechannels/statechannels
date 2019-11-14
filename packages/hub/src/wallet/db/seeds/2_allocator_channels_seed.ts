import {encodeConsensusData} from '@statechannels/nitro-protocol';
import {Model} from 'objection';
import {
  BEGINNING_APP_CHANNEL_HOLDINGS,
  DUMMY_RULES_ADDRESS,
  FUNDED_CHANNEL_HOLDINGS,
  ONGOING_APP_CHANNEL_HOLDINGS,
  outcome2,
  outcome3
} from '../../../test/test-constants';
import {
  BEGINNING_APP_CHANNEL_NONCE_CHANNEL_ID,
  beginning_app_phase_channel,
  channelObjectToModel,
  consensus_app_data2,
  consensus_app_data3,
  funded_channel,
  funded_channel_3,
  FUNDED_NONCE_CHANNEL_ID,
  FUNDED_NONCE_CHANNEL_ID_3,
  ONGOING_APP_CHANNEL_NONCE_CHANNEL_ID,
  ongoing_app_phase_channel
} from '../../../test/test_data';
import Channel from '../../models/channel';
import {outcomeAddPriorities} from '../../utilities/outcome';
import knex from '../connection';

Model.knex(knex);

const baseStateProperties = {
  appDefinition: DUMMY_RULES_ADDRESS,
  isFinal: false,
  challengeDuration: 1000
};

// ***************
// Ledger channels
// ***************

function pre_fund_setup(turnNum: number) {
  return {
    ...baseStateProperties,
    turnNum,
    outcome: outcomeAddPriorities(outcome2),
    appData: encodeConsensusData(consensus_app_data2(2))
  };
}

function pre_fund_setup_3(turnNum: number) {
  return {
    ...baseStateProperties,
    turnNum,
    outcome: outcomeAddPriorities(outcome3),
    appData: encodeConsensusData(consensus_app_data3(3))
  };
}

function post_fund_setup(turnNum: number) {
  return {
    ...baseStateProperties,
    turnNum,
    outcome: outcomeAddPriorities(outcome2),
    appData: encodeConsensusData(consensus_app_data2(0))
  };
}

function app(turnNum: number) {
  return {
    ...baseStateProperties,
    turnNum,
    outcome: outcomeAddPriorities(outcome2),
    appData: encodeConsensusData(consensus_app_data2(turnNum % 2))
  };
}

const fundedChannelWithStates = {
  ...channelObjectToModel(funded_channel),
  channelId: FUNDED_NONCE_CHANNEL_ID,
  holdings: FUNDED_CHANNEL_HOLDINGS,
  states: [pre_fund_setup(0), pre_fund_setup(1)]
};

const fundedChannel3WithStates = {
  ...channelObjectToModel(funded_channel_3),
  channelId: FUNDED_NONCE_CHANNEL_ID_3,
  holdings: FUNDED_CHANNEL_HOLDINGS,
  states: [pre_fund_setup_3(0), pre_fund_setup_3(1), pre_fund_setup_3(2)]
};

const beginningAppPhaseChannelWithStates = {
  ...channelObjectToModel(beginning_app_phase_channel),
  channel_id: BEGINNING_APP_CHANNEL_NONCE_CHANNEL_ID,
  holdings: BEGINNING_APP_CHANNEL_HOLDINGS,
  states: [post_fund_setup(2), post_fund_setup(3)]
};

const ongoingAppPhaseChannel = {
  ...channelObjectToModel(ongoing_app_phase_channel),
  channel_id: ONGOING_APP_CHANNEL_NONCE_CHANNEL_ID,
  holdings: ONGOING_APP_CHANNEL_HOLDINGS,
  states: [app(4), app(5)]
};

const two_participant_channel_seeds = {
  fundedChannelWithStates,
  beginningAppPhaseChannelWithStates,
  ongoingAppPhaseChannel
};

const three_participant_channel_seeds = {fundedChannel3WithStates};

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

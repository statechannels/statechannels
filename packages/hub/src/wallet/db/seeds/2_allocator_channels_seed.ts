import {encodeConsensusData} from '@statechannels/nitro-protocol';
import {Model} from 'objection';
import {
  allocationOutcome2,
  allocationOutcome3,
  DUMMY_RULES_ADDRESS,
  guaranteeOutcome2
} from '../../../test/test-constants';
import {
  BEGINNING_APP_CHANNEL_NONCE_CHANNEL_ID,
  beginningAppPhaseChannel,
  channelObjectToModel,
  consensus_app_data2,
  consensus_app_data3,
  FUNDED_NONCE_CHANNEL_ID,
  FUNDED_NONCE_CHANNEL_ID_3,
  FUNDED_NONCE_GUARANTOR_CHANNEL_ID,
  fundedChannel,
  fundedChannel3,
  fundedGuarantorChannel,
  ONGOING_APP_CHANNEL_NONCE_CHANNEL_ID,
  ongoingAppPhaseChannel
} from '../../../test/test_data';
import Channel from '../../models/channel';
import {outcomeObjectToModel} from '../../utilities/outcome';
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

function prefundSetupState(turnNum: number) {
  return {
    ...baseStateProperties,
    turnNum,
    outcome: outcomeObjectToModel(allocationOutcome2),
    appData: encodeConsensusData(consensus_app_data2(2))
  };
}

function prefundSetupGuarantorState(turnNum: number) {
  return {
    ...baseStateProperties,
    turnNum,
    outcome: outcomeObjectToModel(guaranteeOutcome2),
    // todo: appData does not reflect the outcome above
    appData: encodeConsensusData(consensus_app_data2(2))
  };
}

function prefundSetupState3(turnNum: number) {
  return {
    ...baseStateProperties,
    turnNum,
    outcome: outcomeObjectToModel(allocationOutcome3),
    appData: encodeConsensusData(consensus_app_data3(3))
  };
}

function postFundSetupState(turnNum: number) {
  return {
    ...baseStateProperties,
    turnNum,
    outcome: outcomeObjectToModel(allocationOutcome2),
    appData: encodeConsensusData(consensus_app_data2(0))
  };
}

function appState(turnNum: number) {
  return {
    ...baseStateProperties,
    turnNum,
    outcome: outcomeObjectToModel(allocationOutcome2),
    appData: encodeConsensusData(consensus_app_data2(turnNum % 2))
  };
}

const fundedChannelWithStates = {
  ...channelObjectToModel(fundedChannel),
  channelId: FUNDED_NONCE_CHANNEL_ID,
  states: [prefundSetupState(0), prefundSetupState(1)]
};

const fundedGuarantorChannelWithStates = {
  ...channelObjectToModel(fundedGuarantorChannel),
  channelId: FUNDED_NONCE_GUARANTOR_CHANNEL_ID,
  states: [prefundSetupGuarantorState(0), prefundSetupGuarantorState(1)]
};

const fundedChannel3WithStates = {
  ...channelObjectToModel(fundedChannel3),
  channelId: FUNDED_NONCE_CHANNEL_ID_3,
  states: [prefundSetupState3(0), prefundSetupState3(1), prefundSetupState3(2)]
};

const beginningAppPhaseChannelWithStates = {
  ...channelObjectToModel(beginningAppPhaseChannel),
  channel_id: BEGINNING_APP_CHANNEL_NONCE_CHANNEL_ID,
  states: [postFundSetupState(2), postFundSetupState(3)]
};

const ongoingAppPhaseChannelWithStates = {
  ...channelObjectToModel(ongoingAppPhaseChannel),
  channel_id: ONGOING_APP_CHANNEL_NONCE_CHANNEL_ID,
  states: [appState(4), appState(5)]
};

const two_participant_channel_seeds = {
  fundedChannelWithStates,
  fundedGuarantorChannelWithStates,
  beginningAppPhaseChannelWithStates,
  ongoingAppPhaseChannelWithStates
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

export const stateConstructors = {
  postFundSetupState
};

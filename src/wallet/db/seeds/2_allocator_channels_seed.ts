import { CommitmentType, toUint256 } from 'fmg-core';
import { Model } from 'objection';
import { HUB_ADDRESS } from '../../../constants';
import {
  PositionType,
  RPSAppAttributes,
  Weapon,
  zeroBytes32,
} from '../../../hub/services/rps-commitment';
import {
  allocation,
  BEGINNING_APP_CHANNEL_HOLDINGS,
  BEGINNING_APP_CHANNEL_NONCE,
  BEGINNING_RPS_APP_CHANNEL_NONCE,
  DESTINATION,
  DESTINATION_3,
  DUMMY_RULES_ADDRESS,
  DUMMY_RULES_BEGINNING_APP_CHANNEL_NONCE_CHANNEL_ID,
  DUMMY_RULES_BEGINNING_RPS_APP_CHANNEL_NONCE_CHANNEL_ID,
  DUMMY_RULES_FUNDED_NONCE_CHANNEL_ID,
  DUMMY_RULES_FUNDED_NONCE_CHANNEL_ID_3,
  DUMMY_RULES_FUNDED_RPS_CHANNEL_NONCE_CHANNEL_ID,
  DUMMY_RULES_ONGOING_APP_CHANNEL_NONCE_CHANNEL_ID,
  FUNDED_CHANNEL_HOLDINGS,
  FUNDED_CHANNEL_NONCE,
  FUNDED_CHANNEL_NONCE_3,
  FUNDED_RPS_CHANNEL_HOLDINGS,
  FUNDED_RPS_CHANNEL_NONCE,
  ONGOING_APP_CHANNEL_HOLDINGS,
  ONGOING_APP_CHANNEL_NONCE,
  PARTICIPANT_1_ADDRESS,
  PARTICIPANT_2_ADDRESS,
} from '../../../test/test-constants';
import Channel from '../../models/channel';
import knex from '../connection';
Model.knex(knex);

const participants = [
  { address: PARTICIPANT_1_ADDRESS, priority: 0 },
  { address: HUB_ADDRESS, priority: 1 },
];

const participants_3 = [
  { address: PARTICIPANT_1_ADDRESS, priority: 0 },
  { address: PARTICIPANT_2_ADDRESS, priority: 1 },
  { address: HUB_ADDRESS, priority: 2 },
];

const allocationByPriority = (priority: number) => ({
  priority,
  destination: DESTINATION[priority],
  amount: allocation(2)[priority],
});

const allocationByPriority_3 = (priority: number) => ({
  priority,
  destination: DESTINATION_3[priority],
  amount: allocation(3)[priority],
});

const allocations = () => [allocationByPriority(0), allocationByPriority(1)];
const allocations_3 = () => [
  allocationByPriority_3(0),
  allocationByPriority_3(1),
  allocationByPriority_3(2),
];
// ***************
// Ledger channels
// ***************

const ledger_appAttrs = (n: number) => ({
  furtherVotesRequired: n,
  proposedAllocation: [],
  proposedDestination: [],
});

function pre_fund_setup(turnNumber: number) {
  return {
    turnNumber,
    commitmentType: CommitmentType.PreFundSetup,
    commitmentCount: turnNumber,
    allocations: allocations(),
    appAttrs: ledger_appAttrs(2),
  };
}

function pre_fund_setup_3(turnNumber: number) {
  return {
    turnNumber,
    commitmentType: CommitmentType.PreFundSetup,
    commitmentCount: turnNumber,
    allocations: allocations_3(),
    appAttrs: ledger_appAttrs(3),
  };
}

const funded_channel = {
  channelId: DUMMY_RULES_FUNDED_NONCE_CHANNEL_ID,
  rulesAddress: DUMMY_RULES_ADDRESS,
  nonce: FUNDED_CHANNEL_NONCE,
  holdings: FUNDED_CHANNEL_HOLDINGS,
  commitments: [pre_fund_setup(0), pre_fund_setup(1)],
  participants,
};

const funded_channel_3 = {
  channelId: DUMMY_RULES_FUNDED_NONCE_CHANNEL_ID_3,
  rulesAddress: DUMMY_RULES_ADDRESS,
  nonce: FUNDED_CHANNEL_NONCE_3,
  holdings: FUNDED_CHANNEL_HOLDINGS,
  commitments: [pre_fund_setup_3(0), pre_fund_setup_3(1), pre_fund_setup_3(2)],
  participants: participants_3,
};

function post_fund_setup(turnNumber: number) {
  return {
    turnNumber,
    commitmentType: CommitmentType.PostFundSetup,
    commitmentCount: turnNumber % funded_channel.participants.length,
    allocations: allocations(),
    appAttrs: ledger_appAttrs(0),
  };
}

const beginning_app_phase_channel = {
  channel_id: DUMMY_RULES_BEGINNING_APP_CHANNEL_NONCE_CHANNEL_ID,
  rules_address: DUMMY_RULES_ADDRESS,
  nonce: BEGINNING_APP_CHANNEL_NONCE,
  holdings: BEGINNING_APP_CHANNEL_HOLDINGS,
  commitments: [post_fund_setup(2), post_fund_setup(3)],
  participants,
};

function app(turnNumber: number) {
  return {
    turnNumber,
    commitmentType: CommitmentType.PostFundSetup,
    commitmentCount: turnNumber % funded_channel.participants.length,
    allocations: allocations(),
    appAttrs: ledger_appAttrs(turnNumber % participants.length),
  };
}

const ongoing_app_phase_channel = {
  channel_id: DUMMY_RULES_ONGOING_APP_CHANNEL_NONCE_CHANNEL_ID,
  rules_address: DUMMY_RULES_ADDRESS,
  nonce: ONGOING_APP_CHANNEL_NONCE,
  holdings: ONGOING_APP_CHANNEL_HOLDINGS,
  commitments: [app(4), app(5)],
  participants,
};

// ************
// RPS channels
// ************

function rps_appAttrs(n: number): RPSAppAttributes {
  return {
    stake: toUint256(10),
    positionType: PositionType.Resting,
    aWeapon: Weapon.Rock,
    bWeapon: Weapon.Rock,
    preCommit: zeroBytes32,
    salt: zeroBytes32,
  };
}

function rps_pre_fund_setup(turnNumber: number) {
  return {
    turnNumber,
    commitmentType: CommitmentType.PreFundSetup,
    commitmentCount: turnNumber,
    allocations: allocations(),
    appAttrs: rps_appAttrs(0),
  };
}

const funded_rps_channel = {
  channelId: DUMMY_RULES_FUNDED_RPS_CHANNEL_NONCE_CHANNEL_ID,
  rulesAddress: DUMMY_RULES_ADDRESS,
  nonce: FUNDED_RPS_CHANNEL_NONCE,
  holdings: FUNDED_RPS_CHANNEL_HOLDINGS,
  commitments: [rps_pre_fund_setup(0), rps_pre_fund_setup(1)],
  participants,
};

function rps_post_fund_setup(turnNumber: number) {
  return {
    turnNumber,
    commitmentType: CommitmentType.PostFundSetup,
    commitmentCount: turnNumber % funded_channel.participants.length,
    allocations: allocations(),
    appAttrs: rps_appAttrs(0),
  };
}

const beginning_app_phase_rps_channel = {
  channel_id: DUMMY_RULES_BEGINNING_RPS_APP_CHANNEL_NONCE_CHANNEL_ID,
  rules_address: DUMMY_RULES_ADDRESS,
  nonce: BEGINNING_RPS_APP_CHANNEL_NONCE,
  holdings: BEGINNING_APP_CHANNEL_HOLDINGS,
  commitments: [rps_post_fund_setup(2), rps_post_fund_setup(3)],
  participants,
};

const two_participant_channel_seeds = {
  funded_channel,
  beginning_app_phase_channel,
  ongoing_app_phase_channel,
  funded_rps_channel,
  beginning_app_phase_rps_channel,
};

const three_participant_channel_seeds = { funded_channel_3 };

const SEEDED_CHANNELS_2 = Object.keys(two_participant_channel_seeds).length;
const SEEDED_CHANNELS_3 = Object.keys(three_participant_channel_seeds).length;

const SEEDED_COMMITMENTS_2 = SEEDED_CHANNELS_2 * 2;
const SEEDED_COMMITMENTS_3 = SEEDED_CHANNELS_3 * 3;

const SEEDED_ALLOCATIONS_2 = SEEDED_COMMITMENTS_2 * 2;
const SEEDED_ALLOCATIONS_3 = SEEDED_COMMITMENTS_3 * 3;

const SEEDED_PARTICIPANTS_2 = SEEDED_CHANNELS_2 * 2;
const SEEDED_PARTICIPANTS_3 = SEEDED_CHANNELS_3 * 3;

// *******
// Exports
// *******
export const SEEDED_CHANNELS = SEEDED_CHANNELS_2 + SEEDED_CHANNELS_3;
export const SEEDED_COMMITMENTS = SEEDED_COMMITMENTS_2 + SEEDED_COMMITMENTS_3;
export const SEEDED_ALLOCATIONS = SEEDED_ALLOCATIONS_2 + SEEDED_ALLOCATIONS_3;
export const SEEDED_PARTICIPANTS = SEEDED_PARTICIPANTS_2 + SEEDED_PARTICIPANTS_3;

export const seeds = {
  ...two_participant_channel_seeds,
  ...three_participant_channel_seeds,
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
  app,
};

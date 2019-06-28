import { CommitmentType, toUint256 } from 'fmg-core';
import { Model } from 'objection';
import {
  PositionType,
  RPSAppAttributes,
  Weapon,
  zeroBytes32,
} from '../../../app/services/rps-commitment';
import {
  ALLOCATION,
  BEGINNING_APP_CHANNEL_HOLDINGS,
  BEGINNING_APP_CHANNEL_NONCE,
  BEGINNING_RPS_APP_CHANNEL_NONCE,
  DESTINATION,
  DUMMY_RULES_ADDRESS,
  DUMMY_RULES_BEGINNING_APP_CHANNEL_NONCE_CHANNEL_ID,
  DUMMY_RULES_BEGINNING_RPS_APP_CHANNEL_NONCE_CHANNEL_ID,
  DUMMY_RULES_FUNDED_NONCE_CHANNEL_ID,
  DUMMY_RULES_FUNDED_RPS_CHANNEL_NONCE_CHANNEL_ID,
  DUMMY_RULES_ONGOING_APP_CHANNEL_NONCE_CHANNEL_ID,
  FUNDED_CHANNEL_HOLDINGS,
  FUNDED_CHANNEL_NONCE,
  FUNDED_RPS_CHANNEL_HOLDINGS,
  FUNDED_RPS_CHANNEL_NONCE,
  HUB_ADDRESS,
  ONGOING_APP_CHANNEL_HOLDINGS,
  ONGOING_APP_CHANNEL_NONCE,
  PARTICIPANT_ADDRESS,
} from '../../../constants';
import AllocatorChannel from '../../models/allocatorChannel';
import knex from '../connection';
Model.knex(knex);

const participants = [
  { address: PARTICIPANT_ADDRESS, priority: 0 },
  { address: HUB_ADDRESS, priority: 1 },
];

const allocationByPriority = (priority: number) => ({
  priority,
  destination: DESTINATION[priority],
  amount: ALLOCATION[priority],
});

const allocations = () => [allocationByPriority(0), allocationByPriority(1)];
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

const funded_channel = {
  channelId: DUMMY_RULES_FUNDED_NONCE_CHANNEL_ID,
  rulesAddress: DUMMY_RULES_ADDRESS,
  nonce: FUNDED_CHANNEL_NONCE,
  holdings: FUNDED_CHANNEL_HOLDINGS,
  commitments: [pre_fund_setup(0), pre_fund_setup(1)],
  participants,
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

// *******
// Exports
// *******

export const seeds = {
  funded_channel,
  beginning_app_phase_channel,
  ongoing_app_phase_channel,
  funded_rps_channel,
  beginning_app_phase_rps_channel,
};

export function seed() {
  return knex('allocator_channels')
    .del()
    .then(() => {
      return AllocatorChannel.query().insertGraph(Object.values(seeds));
    });
}

export const constructors = {
  pre_fund_setup,
  post_fund_setup,
  app,
};

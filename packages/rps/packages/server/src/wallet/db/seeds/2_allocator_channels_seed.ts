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

const ledger_app_attrs = (n: number) => ({
  consensusCounter: n,
  proposedAllocation: ALLOCATION,
  proposedDestination: DESTINATION,
});

function pre_fund_setup(turn_number: number) {
  return {
    turn_number,
    commitment_type: CommitmentType.PreFundSetup,
    commitment_count: turn_number,
    allocations: allocations(),
    app_attrs: ledger_app_attrs(0),
  };
}

const funded_channel = {
  rules_address: DUMMY_RULES_ADDRESS,
  nonce: FUNDED_CHANNEL_NONCE,
  holdings: FUNDED_CHANNEL_HOLDINGS,
  commitments: [pre_fund_setup(0), pre_fund_setup(1)],
  participants,
};

function post_fund_setup(turn_number: number) {
  return {
    turn_number,
    commitment_type: CommitmentType.PostFundSetup,
    commitment_count: turn_number % funded_channel.participants.length,
    allocations: allocations(),
    app_attrs: ledger_app_attrs(0),
  };
}

const beginning_app_phase_channel = {
  rules_address: DUMMY_RULES_ADDRESS,
  nonce: BEGINNING_APP_CHANNEL_NONCE,
  holdings: BEGINNING_APP_CHANNEL_HOLDINGS,
  commitments: [post_fund_setup(2), post_fund_setup(3)],
  participants,
};

function app(turn_number: number) {
  return {
    turn_number,
    commitment_type: CommitmentType.PostFundSetup,
    commitment_count: turn_number % funded_channel.participants.length,
    allocations: allocations(),
    app_attrs: ledger_app_attrs(turn_number % participants.length),
  };
}

const ongoing_app_phase_channel = {
  rules_address: DUMMY_RULES_ADDRESS,
  nonce: ONGOING_APP_CHANNEL_NONCE,
  holdings: ONGOING_APP_CHANNEL_HOLDINGS,
  commitments: [app(4), app(5)],
  participants,
};

// ************
// RPS channels
// ************

function rps_app_attrs(n: number): RPSAppAttributes {
  return {
    stake: toUint256(10),
    positionType: PositionType.Resting,
    aWeapon: Weapon.Rock,
    bWeapon: Weapon.Rock,
    preCommit: zeroBytes32,
    salt: zeroBytes32,
  };
}

function rps_pre_fund_setup(turn_number: number) {
  return {
    turn_number,
    commitment_type: CommitmentType.PreFundSetup,
    commitment_count: turn_number,
    allocations: allocations(),
    app_attrs: rps_app_attrs(0),
  };
}

const funded_rps_channel = {
  rules_address: DUMMY_RULES_ADDRESS,
  nonce: FUNDED_RPS_CHANNEL_NONCE,
  holdings: FUNDED_RPS_CHANNEL_HOLDINGS,
  commitments: [rps_pre_fund_setup(0), rps_pre_fund_setup(1)],
  participants,
};

function rps_post_fund_setup(turn_number: number) {
  return {
    turn_number,
    commitment_type: CommitmentType.PostFundSetup,
    commitment_count: turn_number % funded_channel.participants.length,
    allocations: allocations(),
    app_attrs: rps_app_attrs(0),
  };
}

const beginning_app_phase_rps_channel = {
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

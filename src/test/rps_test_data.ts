import {
  BaseCommitment,
  Bytes32,
  Channel,
  Commitment,
  CommitmentType,
  sign,
  toHex,
  Uint256,
} from 'fmg-core';
import {
  asCoreCommitment,
  generateSalt,
  hashCommitment,
  PositionType,
  RPSAppAttributes,
  RPSCommitment,
  sanitize,
  Weapon,
} from '../app/services/rps-commitment';
import {
  ALLOCATION,
  BEGINNING_RPS_APP_CHANNEL_NONCE,
  DESTINATION,
  DUMMY_RULES_ADDRESS,
  FUNDED_RPS_CHANNEL_NONCE,
  PARTICIPANT_1_PRIVATE_KEY,
  PARTICIPANTS,
  STAKE,
} from './test-constants';
import { default_channel } from './test_data';

// Commitment Constructors
// =====================

export interface BaseWithStake extends BaseCommitment {
  stake: Uint256;
  commitmentType: CommitmentType;
}

interface BaseCommitmentWithType extends BaseCommitment {
  commitmentType: CommitmentType;
}

function base(obj: BaseCommitmentWithType): BaseCommitmentWithType {
  const { channel, turnNum, allocation, destination, commitmentCount, commitmentType } = obj;
  return {
    channel,
    turnNum,
    allocation,
    destination,
    commitmentCount,
    commitmentType,
  };
}

const zeroBytes32: Bytes32 = '0x' + '0'.repeat(64);
function defaultAppAttrs(stake): RPSAppAttributes {
  return {
    stake,
    positionType: 0,
    preCommit: zeroBytes32,
    aWeapon: Weapon.Rock,
    bWeapon: Weapon.Rock,
    salt: zeroBytes32,
  };
}

function preFundSetupA(obj: BaseWithStake): RPSCommitment {
  return {
    ...base(obj),
    commitmentCount: 0,
    commitmentType: CommitmentType.PreFundSetup,
    appAttributes: defaultAppAttrs(obj.stake),
  };
}

function preFundSetupB(obj: BaseWithStake): RPSCommitment {
  return {
    ...base(obj),
    commitmentCount: 1,
    commitmentType: CommitmentType.PreFundSetup,
    appAttributes: defaultAppAttrs(obj.stake),
  };
}

function postFundSetupA(obj: BaseWithStake): RPSCommitment {
  return {
    ...base(obj),
    commitmentCount: 0,
    turnNum: 2,
    commitmentType: CommitmentType.PostFundSetup,
    appAttributes: defaultAppAttrs(obj.stake),
  };
}

function postFundSetupB(obj: BaseWithStake): RPSCommitment {
  return {
    ...base(obj),
    commitmentCount: 1,
    turnNum: 3,
    commitmentType: CommitmentType.PostFundSetup,
    appAttributes: defaultAppAttrs(obj.stake),
  };
}

interface ProposeParams extends BaseWithStake {
  aWeapon: Weapon;
}

function propose(obj: ProposeParams): RPSCommitment {
  const salt = generateSalt();
  const preCommit = hashCommitment(obj.aWeapon, salt);
  const appAttributes: RPSAppAttributes = {
    ...defaultAppAttrs(obj.stake),
    aWeapon: obj.aWeapon,
    salt,
    preCommit,
    positionType: PositionType.Proposed,
  };
  return {
    ...base(obj),
    turnNum: 4,
    commitmentType: CommitmentType.App,
    appAttributes,
  };
}

interface AcceptParams extends BaseWithStake {
  preCommit: string;
  bWeapon: Weapon;
}

function accept(obj: AcceptParams): RPSCommitment {
  const { preCommit, bWeapon } = obj;
  const appAttributes = {
    ...defaultAppAttrs(obj.stake),
    preCommit,
    bWeapon,
    positionType: PositionType.Accepted,
  };
  return {
    ...base(obj),
    turnNum: 5,
    commitmentType: CommitmentType.App,
    appAttributes,
  };
}

interface RevealParams extends BaseWithStake {
  bWeapon: Weapon;
  aWeapon: Weapon;
  salt: string;
}

function reveal(obj: RevealParams): RPSCommitment {
  const { aWeapon, bWeapon, salt } = obj;
  const appAttributes = {
    ...defaultAppAttrs(obj.stake),
    aWeapon,
    bWeapon,
    salt,
    positionType: PositionType.Reveal,
    preCommit: hashCommitment(aWeapon, salt),
  };
  return {
    ...base(obj),
    turnNum: 6,
    commitmentType: CommitmentType.App,
    appAttributes,
  };
}

function resting(obj: BaseWithStake): RPSCommitment {
  const appAttributes = {
    ...defaultAppAttrs(obj.stake),
    positionType: PositionType.Resting,
  };
  return {
    ...base(obj),
    turnNum: 7,
    commitmentType: CommitmentType.App,
    appAttributes,
  };
}

function conclude(obj: BaseCommitmentWithType): RPSCommitment {
  return {
    ...base(obj),
    turnNum: 8,
    commitmentType: CommitmentType.Conclude,
    appAttributes: defaultAppAttrs(zeroBytes32),
  };
}

export const constructors = {
  preFundSetupA,
  preFundSetupB,
  postFundSetupA,
  postFundSetupB,
  propose,
  accept,
  reveal,
  resting,
  conclude,
};

// ************************************
// Params for opening/updating channels
// ************************************

export const base_rps_commitment: BaseWithStake = {
  channel: {
    nonce: expect.any(Number),
    channelType: DUMMY_RULES_ADDRESS,
    participants: PARTICIPANTS,
  },
  allocation: ALLOCATION,
  destination: DESTINATION,
  turnNum: 0,
  commitmentCount: 0,
  commitmentType: 0,
  stake: STAKE,
};

const open_channel_commitment = asCoreCommitment(
  preFundSetupA({ ...base_rps_commitment, channel: default_channel }),
);
export const open_channel_params = {
  commitment: open_channel_commitment,
  signature: sign(toHex(open_channel_commitment), PARTICIPANT_1_PRIVATE_KEY),
};

export const invalid_open_channel_params = {
  commitment: open_channel_commitment,
  signature: sign(toHex(open_channel_commitment), '0xf00'),
};

export const pre_fund_setup_1_response = {
  ...base(base_rps_commitment),
  turnNum: 1,
  appAttributes: open_channel_commitment.appAttributes,
  commitmentCount: 1,
  commitmentType: CommitmentType.PreFundSetup,
};

export const funded_rps_channel: Channel = {
  channelType: DUMMY_RULES_ADDRESS,
  nonce: FUNDED_RPS_CHANNEL_NONCE,
  participants: PARTICIPANTS,
};

const update_channel_commitment = asCoreCommitment(
  postFundSetupA({
    ...base_rps_commitment,
    turnNum: 2,
    channel: funded_rps_channel,
  }),
);

export const update_channel_params = {
  commitment: update_channel_commitment,
  signature: sign(toHex(update_channel_commitment), PARTICIPANT_1_PRIVATE_KEY),
};

export const post_fund_setup_1_response = {
  ...base(base_rps_commitment),
  turnNum: 3,
  appAttributes: update_channel_commitment.appAttributes,
  commitmentCount: 1,
  commitmentType: CommitmentType.PostFundSetup,
};

export const beginning_app_phase_rps_channel: Channel = {
  channelType: DUMMY_RULES_ADDRESS,
  nonce: BEGINNING_RPS_APP_CHANNEL_NONCE,
  participants: PARTICIPANTS,
};

export function app_response(app_attrs: RPSAppAttributes): Commitment {
  return {
    ...base(base_rps_commitment),
    turnNum: expect.any(Number),
    appAttributes: sanitize(app_attrs),
    commitmentCount: 0,
    commitmentType: CommitmentType.App,
  };
}

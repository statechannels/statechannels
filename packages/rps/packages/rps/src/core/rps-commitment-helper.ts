import { soliditySha3 } from 'web3-utils';
import { BaseCommitment, CommitmentType, Bytes32 } from 'fmg-core';
import {
  AppAttributes,
  RPSCommitment,
  Weapon,
  PositionType,
  PRE_FUND_SETUP_A,
  PRE_FUND_SETUP_B,
  POST_FUND_SETUP_A,
  POST_FUND_SETUP_B,
  APP_PROPOSE,
  APP_ACCEPT,
  APP_REVEAL,
  APP_RESTING,
  CONCLUDE,
} from './rps-commitment';

// Commitment Constructors
// =====================

interface BaseParams extends BaseCommitment {
  [x: string]: any;
}

interface BaseWithBuyInParams extends BaseParams {
  roundBuyIn: string;
}

function base(obj: BaseCommitment): BaseCommitment {
  const { channel, turnNum, allocation, destination, commitmentCount } = obj;
  return {
    channel,
    turnNum,
    allocation,
    destination,
    commitmentCount,
  };
}

const zeroBytes32: Bytes32 = '0x' + '0'.repeat(64);
function defaultAppAttrs(roundBuyIn): AppAttributes {
  return {
    stake: roundBuyIn,
    positionType: 0,
    preCommit: zeroBytes32,
    bWeapon: 0,
    aWeapon: 0,
    salt: zeroBytes32,
  };
}

export function preFundSetupA(obj: BaseWithBuyInParams): RPSCommitment {
  return {
    ...base(obj),
    commitmentCount: 0,
    commitmentType: CommitmentType.PreFundSetup,
    ...defaultAppAttrs(obj.roundBuyIn),
    commitmentName: PRE_FUND_SETUP_A,
  };
}

export function preFundSetupB(obj: BaseWithBuyInParams): RPSCommitment {
  return {
    ...base(obj),
    commitmentCount: 1,
    commitmentType: CommitmentType.PreFundSetup,
    ...defaultAppAttrs(obj.roundBuyIn),
    commitmentName: PRE_FUND_SETUP_B,
  };
}

export function postFundSetupA(obj: BaseWithBuyInParams): RPSCommitment {
  return {
    ...base(obj),
    commitmentCount: 0,
    commitmentType: CommitmentType.PostFundSetup,
    ...defaultAppAttrs(obj.roundBuyIn),
    commitmentName: POST_FUND_SETUP_A,
  };
}

export function postFundSetupB(obj: BaseWithBuyInParams): RPSCommitment {
  return {
    ...base(obj),
    commitmentCount: 1,
    commitmentType: CommitmentType.PostFundSetup,
    ...defaultAppAttrs(obj.roundBuyIn),
    commitmentName: POST_FUND_SETUP_B,
  };
}

interface ProposeParams extends BaseWithBuyInParams {
  preCommit: string;
}

export function propose(obj: ProposeParams): RPSCommitment {
  const appAttributes: AppAttributes = {
    ...defaultAppAttrs(obj.roundBuyIn),
    preCommit: obj.preCommit,
    positionType: PositionType.Proposed,
  };
  return {
    ...base(obj),
    commitmentType: CommitmentType.App,
    ...appAttributes,
    commitmentName: APP_PROPOSE,
  };
}

export function hashCommitment(play: Weapon, salt: string) {
  return soliditySha3({ type: 'uint256', value: play }, { type: 'bytes32', value: salt });
}

interface ProposeWithWeaponAndSaltParams extends BaseWithBuyInParams {
  salt: string;
  aWeapon: Weapon;
}
export function proposeFromSalt(obj: ProposeWithWeaponAndSaltParams): RPSCommitment {
  const { salt, aWeapon } = obj;
  const preCommit = hashCommitment(aWeapon, salt);
  const appAttributes = {
    ...defaultAppAttrs(obj.roundBuyIn),
    preCommit,
    salt,
    aWeapon,
    positionType: PositionType.Proposed,
  };
  return {
    ...base(obj),
    commitmentType: CommitmentType.App,
    ...appAttributes,
    commitmentName: APP_PROPOSE,
  };
}

interface AcceptParams extends BaseWithBuyInParams {
  preCommit: string;
  bWeapon: Weapon;
}

export function accept(obj: AcceptParams): RPSCommitment {
  const { preCommit, bWeapon } = obj;
  return {
    ...base(obj),
    commitmentType: CommitmentType.App,
    ...defaultAppAttrs(obj.roundBuyIn),
    preCommit,
    bWeapon,
    positionType: PositionType.Accepted,
    commitmentName: APP_ACCEPT,
  };
}

interface RevealParams extends BaseWithBuyInParams {
  bWeapon: Weapon;
  aWeapon: Weapon;
  salt: string;
}

export function reveal(obj: RevealParams): RPSCommitment {
  const { aWeapon, bWeapon, salt } = obj;
  return {
    ...base(obj),
    commitmentType: CommitmentType.App,
    ...defaultAppAttrs(obj.roundBuyIn),
    aWeapon,
    bWeapon,
    salt,
    positionType: PositionType.Reveal,
    commitmentName: APP_REVEAL,
  };
}

export function resting(obj: BaseWithBuyInParams): RPSCommitment {
  return {
    ...base(obj),
    commitmentType: CommitmentType.App,
    ...defaultAppAttrs(obj.roundBuyIn),
    positionType: PositionType.Resting,
    commitmentName: APP_RESTING,
  };
}

export function conclude(obj: BaseCommitment): RPSCommitment {
  return {
    ...base(obj),
    commitmentType: CommitmentType.Conclude,
    ...defaultAppAttrs(zeroBytes32),
    commitmentName: CONCLUDE,
  };
}

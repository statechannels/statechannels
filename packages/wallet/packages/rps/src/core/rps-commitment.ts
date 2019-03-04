import { BaseCommitment, Bytes32, Uint8, Uint256, Commitment, CommitmentType } from 'fmg-core';
import abi from 'web3-eth-abi';

export interface AppAttributes {
  positionType: Uint8;
  stake: Uint256;
  preCommit: Bytes32;
  bWeapon: Uint8;
  aWeapon: Uint8;
  salt: Bytes32;
}

const SolidityRPSCommitmentType = {
  "RPSCommitmentStruct": {
    positionType: "uint8",
    stake: "uint256",
    preCommit: "bytes32",
    bWeapon: "uint8",
    aWeapon: "uint8",
    salt: "bytes32",
  },
};
export enum PositionType { Resting, Proposed, Accepted, Reveal }
export enum Weapon { Rock, Paper, Scissors }
export interface RPSBaseCommitment extends BaseCommitment {
  positionType: PositionType;
  stake: Uint256;
  preCommit: Bytes32;
  bWeapon: Weapon;
  aWeapon: Weapon;
  salt: Bytes32;
}

export interface RPSCommitment extends RPSBaseCommitment {
  commitmentType: CommitmentType;
  commitmentName: CommitmentName;
}

function encodeAppAttributes(appAttrs: AppAttributes): string {
  const { positionType, stake, preCommit, bWeapon, aWeapon, salt, } = appAttrs;
  return abi.encodeParameter(SolidityRPSCommitmentType,
    [positionType, stake, preCommit, bWeapon, aWeapon, salt,]);
}

function decodeAppAttributes(appAttrs: string): AppAttributes {
  const parameters = abi.decodeParameter(SolidityRPSCommitmentType, appAttrs);
  return {
    positionType: Number.parseInt(parameters[0], 10) as PositionType,
    stake: parameters[1],
    preCommit: parameters[2],
    bWeapon: Number.parseInt(parameters[3], 10) as Weapon,
    aWeapon: Number.parseInt(parameters[4], 10) as Weapon,
    salt: parameters[5],
  };
}

export function fromCoreCommitment(commitment: Commitment): RPSCommitment {
  const {
    channel,
    commitmentType,
    turnNum,
    allocation,
    destination,
    commitmentCount,
  } = commitment;
  return {
    channel,
    commitmentType,
    turnNum,
    allocation,
    destination,
    commitmentCount,
    commitmentName: getCommitmentName(commitment),
    ...decodeAppAttributes(commitment.appAttributes),
  };
}

export function asCoreCommitment(rpsCommitment: RPSCommitment): Commitment {
  const {
    channel,
    commitmentType,
    turnNum,
    allocation,
    destination,
    commitmentCount,
    positionType,
    stake,
    preCommit,
    bWeapon,
    aWeapon,
    salt,
  } = rpsCommitment;

  return {
    channel,
    commitmentType,
    turnNum,
    allocation,
    destination,
    commitmentCount,
    appAttributes: encodeAppAttributes({ positionType, stake, preCommit, bWeapon, aWeapon, salt }),
  };
}


// Commitment names
export const PRE_FUND_SETUP_A = 'PRE_FUND_SETUP_A';
export const PRE_FUND_SETUP_B = 'PRE_FUND_SETUP_B';
export const POST_FUND_SETUP_A = 'POST_FUND_SETUP_A';
export const POST_FUND_SETUP_B = 'POST_FUND_SETUP_B';
export const APP_PROPOSE = 'APP:PROPOSE';
export const APP_ACCEPT = 'APP:ACCEPT';
export const APP_REVEAL = 'APP:REVEAL';
export const APP_RESTING = 'APP:RESTING';
export const CONCLUDE = 'CONCLUDE';

export type CommitmentName = typeof PRE_FUND_SETUP_A | typeof PRE_FUND_SETUP_B | typeof POST_FUND_SETUP_A | typeof POST_FUND_SETUP_B | typeof APP_PROPOSE | typeof APP_ACCEPT | typeof APP_REVEAL | typeof APP_RESTING | typeof CONCLUDE;

function getCommitmentName(commitment: Commitment): CommitmentName {
  switch (commitment.commitmentType) {
    case CommitmentType.PreFundSetup:
      return commitment.commitmentCount === 0 ? PRE_FUND_SETUP_A : PRE_FUND_SETUP_B;
    case CommitmentType.PostFundSetup:
      return commitment.commitmentCount === 0 ? POST_FUND_SETUP_A : POST_FUND_SETUP_B;
    case CommitmentType.Conclude:
      return CONCLUDE;
    case CommitmentType.App:
      const appAttributes = decodeAppAttributes(commitment.appAttributes);
      switch (appAttributes.positionType) {
        case PositionType.Accepted:
          return APP_ACCEPT;
        case PositionType.Proposed:
          return APP_PROPOSE;
        case PositionType.Resting:
          return APP_RESTING;
        case PositionType.Reveal:
          return APP_REVEAL;
      }
      break;

  }
  return CONCLUDE;
}

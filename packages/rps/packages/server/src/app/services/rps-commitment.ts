import {
  BaseCommitment,
  Bytes,
  Bytes32,
  Commitment,
  CommitmentType,
  Uint256,
  Uint8,
} from 'fmg-core';
import * as abi from 'web3-eth-abi';
import { soliditySha3 } from 'web3-utils';

export interface RPSAppAttributes {
  positionType: Uint8;
  stake: Uint256;
  preCommit: Bytes32;
  bWeapon: Uint8;
  aWeapon: Uint8;
  salt: Bytes32;
}

const SolidityRPSCommitmentType = {
  RPSCommitmentStruct: {
    positionType: 'uint8',
    stake: 'uint256',
    preCommit: 'bytes32',
    bWeapon: 'uint8',
    aWeapon: 'uint8',
    salt: 'bytes32',
  },
};
export enum PositionType {
  Resting,
  Proposed,
  Accepted,
  Reveal,
}

export enum Weapon {
  Rock,
  Paper,
  Scissors,
}

export interface RPSCommitment extends BaseCommitment {
  appAttributes: RPSAppAttributes;
  commitmentType: CommitmentType;
}

export function sanitize(appAttrs: RPSAppAttributes): Bytes {
  const sanitizedAttrs = { ...appAttrs };
  if (appAttrs.positionType === PositionType.Proposed) {
    sanitizedAttrs.aWeapon = Weapon.Rock;
    sanitizedAttrs.salt = zeroBytes32;
  }

  return encodeAppAttributes(sanitizedAttrs);
}

export function encodeAppAttributes(appAttrs: RPSAppAttributes): Bytes {
  const { positionType, stake, preCommit, bWeapon, aWeapon, salt } = appAttrs;
  return abi.encodeParameter(SolidityRPSCommitmentType, [
    positionType,
    stake,
    preCommit,
    bWeapon,
    aWeapon,
    salt,
  ]);
}

export function decodeAppAttributes(appAttrs: string): RPSAppAttributes {
  const parameters = abi.decodeParameter(SolidityRPSCommitmentType, appAttrs);
  return {
    positionType: parseInt(parameters[0], 10),
    stake: parameters[1],
    preCommit: parameters[2],
    bWeapon: parseInt(parameters[3], 10),
    aWeapon: parseInt(parameters[4], 10),
    salt: parameters[5],
  };
}

export function fromCoreCommitment(commitment: Commitment): RPSCommitment {
  return {
    ...commitment,
    appAttributes: decodeAppAttributes(commitment.appAttributes),
  };
}

export function asCoreCommitment(rpsCommitment: RPSCommitment): Commitment {
  return {
    ...rpsCommitment,
    appAttributes: encodeAppAttributes(rpsCommitment.appAttributes),
  };
}

export const zeroBytes32: Bytes32 = '0x' + '0'.repeat(64);
export function defaultAppAttrs(stake): RPSAppAttributes {
  return {
    stake,
    positionType: 0,
    preCommit: zeroBytes32,
    bWeapon: Weapon.Rock,
    aWeapon: Weapon.Rock,
    salt: zeroBytes32,
  };
}

export function generateSalt(): Bytes32 {
  // TODO: non-deterministic salt
  return '0x' + '12'.repeat(32);
}

export function hashCommitment(weapon: Weapon, salt: string) {
  return soliditySha3(
    { type: 'uint256', value: weapon.toString() },
    { type: 'bytes32', value: salt },
  );
}

import {Weapon} from './weapons';
import {BigNumber, defaultAbiCoder} from 'ethers/utils';

export enum PositionType {
  Start, // 0
  RoundProposed, // 1
  RoundAccepted, // 2
  Reveal, // 3
}
export interface RPSData {
  positionType: PositionType;
  stake: BigNumber; // uint256
  preCommit: string; // bytes32
  playerAWeapon: Weapon;
  playerBWeapon: Weapon;
  salt: string; // bytes32
}
export interface Start {
  type: 'start';
}

export type RoundProposed = Pick<RPSData, 'stake' & 'preCommit'> & {type: 'roundProposed'};

export type RoundAccepted = Pick<RPSData, 'stake' & 'preCommit'> & {type: 'roundAccepted'};

export type Reveal = Pick<RPSData, 'playerAWeapon' & 'playerBWeapon'> & {type: 'reveal'};

export type AppData = Start | RoundProposed | RoundAccepted | Reveal;

export function encodeAppData(appData: RPSData): string {
  return defaultAbiCoder.encode(
    [
      'tuple(uint8 positionType, uint256 stake, bytes32 preCommit, uint8 playerAWeapon, uint8 playerBWeapon, bytes32 salt)',
    ],
    [appData]
  );
}

export function decodeAppData(appDataBytes: string): RPSData {
  const parameters = defaultAbiCoder.decode(
    [
      'tuple(uint8 positionType, uint256 stake, bytes32 preCommit, uint8 playerAWeapon, uint8 playerBWeapon, bytes32 salt)',
    ],
    appDataBytes
  )[0];
  return {
    positionType: parameters[0],
    stake: parameters[1],
    preCommit: parameters[2],
    playerAWeapon: parameters[3],
    playerBWeapon: parameters[4],
    salt: parameters[5],
  };
}

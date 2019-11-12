import {Weapon} from './weapons';
import {BigNumber} from 'ethers/utils';

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

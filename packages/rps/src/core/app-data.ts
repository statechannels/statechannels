import {Weapon} from './weapons';

export interface Resting {
  type: 'resting';
}

export interface Propose {
  type: 'propose';
  stake: number;
  preCommit: string;
}

export interface Accept {
  type: 'accept';
  stake: number;
  preCommit: string;
  bWeapon: Weapon;
}

export interface Reveal {
  type: 'reveal';
  aWeapon: Weapon;
  bWeapon: Weapon;
}

export type AppData = Resting | Propose | Accept | Reveal;

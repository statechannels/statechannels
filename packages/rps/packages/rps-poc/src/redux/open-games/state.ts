import BN from 'bn.js';

export interface OpenGame {
  address: string;
  name: string;
  stake: BN;
  isPublic: boolean;
  createdAt: number;
}

export type OpenGameState = OpenGame[];

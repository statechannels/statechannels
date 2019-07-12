import { Address, Channel, Commitment, Signature, Uint256, Uint32 } from 'fmg-core';
import { Blockchain } from './blockchain';
import { LedgerCommitment } from './ledger-commitment';
import * as LedgerChannelManager from './ledgerChannelManager';

export interface IAllocatorChannel extends Channel {
  id: number;
  holdings: Uint32;
}

export interface IAllocatorChannelCommitment extends Commitment {
  id: number;
  allocator_channel_id: number;
}

export interface SignedCommitment {
  commitment: Commitment;
  signature: Signature;
}

export interface SignedLedgerCommitment {
  ledgerCommitment: LedgerCommitment;
  signature: Signature;
}

export const updateLedgerChannel: (
  ledgerCommitmentRound: SignedLedgerCommitment[],
  currentC?: LedgerCommitment,
) => Promise<SignedCommitment> = LedgerChannelManager.updateLedgerChannel;

export const fund: (id: Address, expectedHeld: Uint256, amount: Uint256) => Promise<Uint256> =
  Blockchain.fund;

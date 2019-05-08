import { Channel, CommitmentType, Commitment } from 'fmg-core';
import { channelID } from 'fmg-core/lib/channel';
import { bigNumberify } from 'ethers/utils';

import { signCommitment2 } from '../../domain';
import { ledgerCommitment } from '../../domain/commitments/__tests__';

export const libraryAddress = '0x' + '1'.repeat(40);
export const ledgerLibraryAddress = '0x' + '2'.repeat(40);
export const channelNonce = 4;
export const asPrivateKey = '0xf2f48ee19680706196e2e339e5da3491186e0c4c5030670656b0e0164837257d';
export const asAddress = '0x5409ED021D9299bf6814279A6A1411A7e866A631';
export const bsPrivateKey = '0x5d862464fe9303452126c8bc94274b8c5f9874cbd219789b3eb2128075a76f72';
export const bsAddress = '0x6Ecbe1DB9EF729CBe972C83Fb886247691Fb6beb';
export const participants: [string, string] = [asAddress, bsAddress];
export const channel: Channel = { channelType: libraryAddress, nonce: channelNonce, participants };
export const channelId = channelID(channel);

export const twoThree = [bigNumberify(2).toHexString(), bigNumberify(3).toHexString()];

export const postFundCommitment0: Commitment = {
  channel,
  commitmentCount: 0,
  commitmentType: CommitmentType.PostFundSetup,
  appAttributes: '0x0',
  turnNum: 2,
  allocation: twoThree,
  destination: participants,
};
export const signedCommitment2 = signCommitment2(postFundCommitment0, asPrivateKey);

export const postFundCommitment1: Commitment = {
  channel,
  commitmentCount: 1,
  commitmentType: CommitmentType.PostFundSetup,
  appAttributes: '0x0',
  turnNum: 3,
  allocation: twoThree,
  destination: participants,
};
export const signedCommitment3 = signCommitment2(postFundCommitment1, bsPrivateKey);

export const concludeCommitment1: Commitment = {
  channel,
  commitmentCount: 0,
  commitmentType: CommitmentType.Conclude,
  appAttributes: '0x0',
  turnNum: 51,
  allocation: [],
  destination: [],
};
export const signedCommitment51 = signCommitment2(concludeCommitment1, asPrivateKey);

export const concludeCommitment2: Commitment = {
  channel,
  commitmentCount: 0,
  commitmentType: CommitmentType.Conclude,
  appAttributes: '0x0',
  turnNum: 52,
  allocation: [],
  destination: [],
};
export const signedCommitment52 = signCommitment2(concludeCommitment2, bsPrivateKey);

// Ledger channel commitments

const twoThreeBalances = [
  { address: asAddress, wei: bigNumberify(2).toHexString() },
  { address: bsAddress, wei: bigNumberify(3).toHexString() },
];

const fiveToAppBalances = [{ address: channelId, wei: bigNumberify(5).toHexString() }];

export const signedLedgerCommitments = {
  signedLedgerCommitment0: ledgerCommitment({
    turnNum: 0,
    balances: twoThreeBalances,
  }),
  signedLedgerCommitment1: ledgerCommitment({
    turnNum: 1,
    balances: twoThreeBalances,
  }),
  signedLedgerCommitment2: ledgerCommitment({
    turnNum: 2,
    balances: twoThreeBalances,
  }),
  signedLedgerCommitment3: ledgerCommitment({
    turnNum: 3,
    balances: twoThreeBalances,
  }),
  signedLedgerCommitment4: ledgerCommitment({
    turnNum: 4,
    balances: twoThreeBalances,
    proposedBalances: fiveToAppBalances,
  }),
  signedLedgerCommitment5: ledgerCommitment({
    turnNum: 5,
    balances: fiveToAppBalances,
  }),
  signedLedgerCommitment6: ledgerCommitment({
    turnNum: 6,
    proposedBalances: twoThreeBalances,
    balances: fiveToAppBalances,
  }),
  signedLedgerCommitment7: ledgerCommitment({
    turnNum: 7,
    balances: twoThreeBalances,
  }),
};

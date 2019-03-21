import { Channel, CommitmentType, Commitment } from 'fmg-core';
import { channelID } from 'fmg-core/lib/channel';
import { bigNumberify } from 'ethers/utils';

export const libraryAddress = '0x' + '1'.repeat(40);
export const channelNonce = 4;
export const asPrivateKey = '0xf2f48ee19680706196e2e339e5da3491186e0c4c5030670656b0e0164837257d';
export const asAddress = '0x5409ED021D9299bf6814279A6A1411A7e866A631';
export const bsPrivateKey = '0x5d862464fe9303452126c8bc94274b8c5f9874cbd219789b3eb2128075a76f72';
export const bsAddress = '0x6Ecbe1DB9EF729CBe972C83Fb886247691Fb6beb';
export const participants: [string, string] = [asAddress, bsAddress];
export const channel: Channel = { channelType: libraryAddress, nonce: channelNonce, participants };

export const channelId = channelID(channel);

export const fundingState = {
  fundingType: 'FUNDING_TYPE.UNKNOWN' as 'FUNDING_TYPE.UNKNOWN',
  channelFundingStatus: 'FUNDING_NOT_STARTED' as 'FUNDING_NOT_STARTED',
};

export const twoThree = [bigNumberify(2).toHexString(), bigNumberify(3).toHexString()];
export const postFundCommitment1: Commitment = {
  channel,
  commitmentCount: 0,
  commitmentType: CommitmentType.PostFundSetup,
  appAttributes: '0x0',
  turnNum: 2,
  allocation: twoThree,
  destination: participants,
};
export const postFundCommitment2: Commitment = {
  channel,
  commitmentCount: 1,
  commitmentType: CommitmentType.PostFundSetup,
  appAttributes: '0x0',
  turnNum: 3,
  allocation: twoThree,
  destination: participants,
};
export const preFundCommitment1: Commitment = {
  channel,
  commitmentCount: 0,
  commitmentType: CommitmentType.PreFundSetup,
  appAttributes: '0x0',
  turnNum: 0,
  allocation: twoThree,
  destination: participants,
};
export const preFundCommitment2: Commitment = {
  channel,
  commitmentCount: 1,
  commitmentType: CommitmentType.PreFundSetup,
  appAttributes: '0x0',
  turnNum: 1,
  allocation: twoThree,
  destination: participants,
};
export const gameCommitment1: Commitment = {
  channel,
  commitmentCount: 2,
  commitmentType: CommitmentType.App,
  appAttributes: '0x0',
  turnNum: 19,
  allocation: ['0x05', '0x05'],
  destination: [],
};
export const gameCommitment2: Commitment = {
  channel,
  commitmentCount: 2,
  commitmentType: CommitmentType.App,
  appAttributes: '0x0',
  turnNum: 20,
  allocation: [],
  destination: [],
};
export const gameCommitment3: Commitment = {
  channel,
  commitmentCount: 3,
  commitmentType: CommitmentType.App,
  appAttributes: '0x0',
  turnNum: 21,
  allocation: [],
  destination: [],
};
export const concludeCommitment1: Commitment = {
  channel,
  commitmentCount: 0,
  commitmentType: CommitmentType.Conclude,
  appAttributes: '0x0',
  turnNum: 51,
  allocation: [],
  destination: [],
};
export const concludeCommitment2: Commitment = {
  channel,
  commitmentCount: 0,
  commitmentType: CommitmentType.Conclude,
  appAttributes: '0x0',
  turnNum: 52,
  allocation: [],
  destination: [],
};

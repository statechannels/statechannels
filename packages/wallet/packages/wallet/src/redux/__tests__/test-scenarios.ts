import { Channel, CommitmentType, Commitment } from 'fmg-core';
import { channelID } from 'fmg-core/lib/channel';
import { bigNumberify } from 'ethers/utils';
import { waitForPreFundSetup } from '../channel-state/state';
import { WalletProtocol } from '../types';
import * as states from '../state';
import { bytesFromAppAttributes } from 'fmg-nitro-adjudicator';
import { addHex } from '../../utils/hex-utils';

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

export const fundingState = {
  fundingType: 'FUNDING_TYPE.UNKNOWN' as 'FUNDING_TYPE.UNKNOWN',
  channelFundingStatus: 'FUNDING_NOT_STARTED' as 'FUNDING_NOT_STARTED',
};

export const initializedState: states.Initialized = {
  ...states.emptyState,
  type: states.WALLET_INITIALIZED,
  adjudicator: 'adjudicator',
  uid: 'uid',
  networkId: 3,
  consensusLibrary: '0x0',
  processStore: {},
};

export const mockTransactionOutboxItem = {
  transactionRequest: { to: '0xabc' },
  channelId: 'channelId',
  protocol: WalletProtocol.DirectFunding,
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

export const initializedChannelState = {
  [channelId]: waitForPreFundSetup({
    channelId,
    libraryAddress,
    ourIndex: 0,
    participants,
    channelNonce,
    funded: false,
    address: asAddress,
    privateKey: asPrivateKey,
    lastCommitment: { commitment: preFundCommitment1, signature: 'signature' },
    turnNum: 0,
  }),
};
export const initializingChannelState = {
  [asAddress]: { address: asAddress, privateKey: asPrivateKey },
};

// Ledger channel commitments

const ledgerAppAttributes = (
  consensusCounter,
  proposedAllocation: string[] = twoThree,
  proposedDestination: string[] = participants,
) => {
  return bytesFromAppAttributes({
    proposedAllocation,
    proposedDestination,
    consensusCounter,
  });
};
const LEDGER_CHANNEL_NONCE = 0;
export const ledgerChannel: Channel = {
  nonce: LEDGER_CHANNEL_NONCE,
  channelType: ledgerLibraryAddress,
  participants,
};
const ledgerChannelAttrs = {
  channel: ledgerChannel,
  appAttributes: ledgerAppAttributes(0),
  allocation: twoThree,
  destination: participants,
};

const allocatesToChannel = [twoThree.reduce(addHex, '0x0')];
const destinationChannel = [channelId];
const updatedLedgerChannelAttrs = consensusCounter => ({
  channel: ledgerChannel,
  appAttributes: ledgerAppAttributes(consensusCounter, allocatesToChannel, destinationChannel),
  allocation: twoThree,
  destination: participants,
});

const allocatesToChannelAttrs = {
  channel: ledgerChannel,
  appAttributes: ledgerAppAttributes(0, allocatesToChannel, [channelId]),
  allocation: allocatesToChannel,
  destination: destinationChannel,
};

export const ledgerId = channelID(ledgerChannel);
export const ledgerCommitments = {
  preFundCommitment0: {
    ...ledgerChannelAttrs,
    commitmentCount: 0,
    commitmentType: CommitmentType.PreFundSetup,
    turnNum: 0,
  },
  preFundCommitment1: {
    ...ledgerChannelAttrs,
    commitmentCount: 1,
    commitmentType: CommitmentType.PreFundSetup,
    turnNum: 1,
  },
  postFundCommitment0: {
    ...ledgerChannelAttrs,
    commitmentCount: 0,
    commitmentType: CommitmentType.PostFundSetup,
    turnNum: 2,
  },
  postFundCommitment1: {
    ...ledgerChannelAttrs,
    commitmentCount: 1,
    commitmentType: CommitmentType.PostFundSetup,
    turnNum: 3,
  },
  ledgerUpdate0: {
    ...updatedLedgerChannelAttrs(0),
    commitmentCount: 0,
    commitmentType: CommitmentType.App,
    turnNum: 4,
  },
  ledgerUpdate1: {
    ...updatedLedgerChannelAttrs(1),
    commitmentCount: 1,
    commitmentType: CommitmentType.App,
    turnNum: 5,
  },
  ledgerUpdate2: {
    ...allocatesToChannelAttrs,
    commitmentCount: 0,
    commitmentType: CommitmentType.App,
    turnNum: 6,
  },
};

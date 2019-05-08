import { Channel, CommitmentType, Commitment } from 'fmg-core';
import { channelID } from 'fmg-core/lib/channel';
import { bigNumberify } from 'ethers/utils';
import * as states from '../state';
import { bytesFromAppAttributes } from 'fmg-nitro-adjudicator';
import { addHex } from '../../utils/hex-utils';
import { signCommitment, signCommitment2 } from '../../domain';
import { ChannelState } from '../channel-store';
import { initialConsensus, propose, finalVote } from 'fmg-nitro-adjudicator/lib/consensus-app';

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

export const twoThree = [bigNumberify(2).toHexString(), bigNumberify(3).toHexString()];
export const initializedState: states.Initialized = {
  ...states.EMPTY_SHARED_DATA,
  type: states.WALLET_INITIALIZED,
  uid: 'uid',
  processStore: {},
};

export const mockTransactionOutboxItem = {
  transactionRequest: { to: '0xabc' },
  processId: 'processid',
  requestId: 'requestId',
};

export const preFundCommitment0: Commitment = {
  channel,
  commitmentCount: 0,
  commitmentType: CommitmentType.PreFundSetup,
  appAttributes: '0x0',
  turnNum: 0,
  allocation: twoThree,
  destination: participants,
};
export const signedCommitment0 = signCommitment2(preFundCommitment0, asPrivateKey);

export const preFundCommitment1: Commitment = {
  channel,
  commitmentCount: 1,
  commitmentType: CommitmentType.PreFundSetup,
  appAttributes: '0x0',
  turnNum: 1,
  allocation: twoThree,
  destination: participants,
};
export const signedCommitment1 = signCommitment2(preFundCommitment1, bsPrivateKey);

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
export const gameCommitment1: Commitment = {
  channel,
  commitmentCount: 2,
  commitmentType: CommitmentType.App,
  appAttributes: '0x0',
  turnNum: 19,
  allocation: ['0x05', '0x05'],
  destination: [],
};
export const signedCommitment19 = {
  commitment: gameCommitment1,
  signature: signCommitment(gameCommitment1, bsPrivateKey),
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
export const signedCommitment20 = {
  commitment: gameCommitment2,
  signature: signCommitment(gameCommitment2, asPrivateKey),
};
export const alternativeGameCommitment2: Commitment = {
  channel,
  commitmentCount: 2,
  commitmentType: CommitmentType.App,
  appAttributes: '0x1',
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
export const signedCommitment21 = {
  commitment: gameCommitment3,
  signature: signCommitment(gameCommitment3, bsPrivateKey),
};

export const gameCommitment4: Commitment = {
  channel,
  commitmentCount: 4,
  commitmentType: CommitmentType.App,
  appAttributes: '0x0',
  turnNum: 22,
  allocation: [],
  destination: [],
};
export const signedCommitment22 = {
  commitment: gameCommitment4,
  signature: signCommitment(gameCommitment4, bsPrivateKey),
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

const initializedChannel: ChannelState = {
  channelId,
  libraryAddress,
  ourIndex: 0,
  participants,
  channelNonce,
  funded: false,
  address: asAddress,
  privateKey: asPrivateKey,
  lastCommitment: { commitment: preFundCommitment0, signature: 'signature' },
  turnNum: 0,
};

export const initializedChannelState = {
  [channelId]: initializedChannel,
};
export const initializingChannelState = {
  [asAddress]: { address: asAddress, privateKey: asPrivateKey },
};

// Ledger channel commitments

const LEDGER_CHANNEL_NONCE = 0;
export const ledgerChannel: Channel = {
  nonce: LEDGER_CHANNEL_NONCE,
  channelType: ledgerLibraryAddress,
  participants,
};
const allocatesToChannel = [twoThree.reduce(addHex, '0x0')];

const initialConsensusCommitment = initialConsensus({
  channel: ledgerChannel,
  allocation: twoThree,
  destination: participants,
  commitmentCount: 0,
  turnNum: 4,
});

const proposeFundChannelCommitment = propose(initialConsensusCommitment, allocatesToChannel, [
  channelId,
]);
const approveFundChannelCommitment = finalVote(proposeFundChannelCommitment);

const proposeDefundChannelCommitment = propose(
  approveFundChannelCommitment,
  twoThree,
  participants,
);
const approveDefundChannelCommitment = finalVote(proposeDefundChannelCommitment);

export const ledgerId = channelID(ledgerChannel);

export const ledgerCommitments = {
  preFundCommitment0: {
    ...initialConsensusCommitment,
    appAttributes: bytesFromAppAttributes(initialConsensusCommitment),
    commitmentCount: 0,
    commitmentType: CommitmentType.PreFundSetup,
    turnNum: 0,
  },
  preFundCommitment1: {
    ...initialConsensusCommitment,
    appAttributes: bytesFromAppAttributes(initialConsensusCommitment),
    commitmentCount: 1,
    commitmentType: CommitmentType.PreFundSetup,
    turnNum: 1,
  },
  postFundCommitment0: {
    ...initialConsensusCommitment,
    appAttributes: bytesFromAppAttributes(initialConsensusCommitment),
    commitmentCount: 0,
    commitmentType: CommitmentType.PostFundSetup,
    turnNum: 2,
  },
  postFundCommitment1: {
    ...initialConsensusCommitment,
    appAttributes: bytesFromAppAttributes(initialConsensusCommitment),
    commitmentCount: 1,
    commitmentType: CommitmentType.PostFundSetup,
    turnNum: 3,
  },
  ledgerUpdate0: {
    ...proposeFundChannelCommitment,
    appAttributes: bytesFromAppAttributes(proposeFundChannelCommitment),
    commitmentCount: 0,
    commitmentType: CommitmentType.App,
  },
  ledgerUpdate1: {
    ...approveFundChannelCommitment,
    appAttributes: bytesFromAppAttributes(approveFundChannelCommitment),
    commitmentCount: 1,
    commitmentType: CommitmentType.App,
  },
  ledgerDefundUpdate0: {
    ...proposeDefundChannelCommitment,
    appAttributes: bytesFromAppAttributes(proposeDefundChannelCommitment),
    commitmentCount: 0,
    commitmentType: CommitmentType.App,
  },

  ledgerDefundUpdate1: {
    ...approveDefundChannelCommitment,
    appAttributes: bytesFromAppAttributes(approveDefundChannelCommitment),
    commitmentCount: 0,
    commitmentType: CommitmentType.App,
  },
};

export const signedLedgerCommitments = {
  signedLedgerCommitment0: {
    commitment: ledgerCommitments.preFundCommitment0,
    signature: signCommitment(ledgerCommitments.preFundCommitment0, asPrivateKey),
  },
  signedLedgerCommitment6: {
    commitment: ledgerCommitments.ledgerDefundUpdate0,
    signature: signCommitment(ledgerCommitments.ledgerDefundUpdate0, asPrivateKey),
  },
  signedLedgerCommitment7: {
    commitment: ledgerCommitments.ledgerDefundUpdate1,
    signature: signCommitment(ledgerCommitments.ledgerDefundUpdate1, bsPrivateKey),
  },
};

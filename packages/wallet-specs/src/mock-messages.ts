import { CreateChannelEvent } from './protocols/wallet/protocol';
import { AddressableMessage } from './wire-protocol';
import { ethAllocationOutcome, Channel } from '.';
import { ethers } from 'ethers';
import { State } from '@statechannels/nitro-protocol';
import { HashZero, AddressZero } from 'ethers/constants';
import { Participant } from './store';

const oneAddr = new ethers.Wallet(
  '0x0000000000000000000000000000000000000000000000000000000000000001'
);
const twoAddr = new ethers.Wallet(
  '0x0000000000000000000000000000000000000000000000000000000000000002'
);
const first: Participant = {
  signingAddress: oneAddr.address,
  destination: new ethers.Wallet(
    '0xaaa0000000000000000000000000000000000000000000000000000000000001'
  ).address,
  participantId: 'first',
};
const second: Participant = {
  signingAddress: twoAddr.address,
  destination: new ethers.Wallet(
    '0xbbb0000000000000000000000000000000000000000000000000000000000002'
  ).address,
  participantId: 'second',
};

const channel: Channel = {
  participants: [first.signingAddress, second.signingAddress],
  channelNonce: '1',
  chainId: '0x42',
};

const state: State = {
  appData: HashZero,
  appDefinition: AddressZero,
  isFinal: false,
  turnNum: 0,
  outcome: ethAllocationOutcome([
    { destination: first.destination, amount: '3' },
    { destination: second.destination, amount: '1' },
  ]),
  channel,
  challengeDuration: 1,
};

const messagesToSecond: AddressableMessage[] = [];
messagesToSecond.push({
  type: 'OPEN_CHANNEL',
  signedState: {
    state,
    signatures: [],
  },
  to: second.participantId,
});
messagesToSecond.push({
  type: 'SendStates',
  signedStates: [
    {
      state: {
        ...state,
        turnNum: 1,
      },
      signatures: [],
    },
  ],
  to: second.participantId,
});
messagesToSecond.push({
  to: second.participantId,
  type: 'FUNDING_STRATEGY_PROPOSED',
  targetChannelId: 'first+second',
  choice: 'Indirect',
});

const messagesToFirst: AddressableMessage[] = [];
messagesToFirst.push({
  type: 'SendStates',
  signedStates: [
    {
      state: { ...state, turnNum: 1 },
      signatures: [],
    },
  ],
  to: first.participantId,
});
messagesToFirst.push({
  type: 'FUNDING_STRATEGY_PROPOSED',
  choice: 'Indirect',
  targetChannelId: 'first+second+1',
  to: first.participantId,
});

export const createChannel: CreateChannelEvent = {
  type: 'CREATE_CHANNEL',
  chainId: '0x01',
  challengeDuration: 1,
  participants: [first, second],
  allocations: [
    { destination: first.destination, amount: '3' },
    { destination: second.destination, amount: '1' },
  ],
  appDefinition: AddressZero,
  appData: HashZero,
};

export { messagesToSecond, messagesToFirst };

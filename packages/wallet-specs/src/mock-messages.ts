import { CreateChannelEvent } from './protocols/wallet/protocol';
import { AddressableMessage } from './wire-protocol';
import { ethAllocationOutcome, Channel } from '.';
import { ethers } from 'ethers';
import { State } from '@statechannels/nitro-protocol';
import { HashZero, AddressZero } from 'ethers/constants';

const one = new ethers.Wallet('0x0000000000000000000000000000000000000000000000000000000000000001');
const two = new ethers.Wallet('0x0000000000000000000000000000000000000000000000000000000000000002');
const first = one.address;
const second = two.address;

const channel: Channel = {
  participants: [first, second],
  channelNonce: '1',
  chainId: '0x42',
};

const state: State = {
  appData: HashZero,
  appDefinition: AddressZero,
  isFinal: false,
  turnNum: 0,
  outcome: ethAllocationOutcome([
    { destination: first, amount: '3' },
    { destination: second, amount: '1' },
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
  to: second,
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
  to: second,
});
messagesToSecond.push({
  to: second,
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
  to: first,
});
messagesToFirst.push({
  type: 'FUNDING_STRATEGY_PROPOSED',
  choice: 'Indirect',
  targetChannelId: 'first+second+1',
  to: first,
});

export const createChannel: CreateChannelEvent = {
  type: 'CREATE_CHANNEL',
  chainId: '0x01',
  challengeDuration: 1,
  participants: [
    {
      participantId: first,
      signingAddress: first,
      destination: first,
    },
    {
      participantId: second,
      signingAddress: second,
      destination: second,
    },
  ],
  allocations: [
    { destination: first, amount: '3' },
    { destination: second, amount: '1' },
  ],
  appDefinition: AddressZero,
  appData: HashZero,
};

export { messagesToSecond, messagesToFirst };

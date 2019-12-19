import { CreateChannelEvent } from './protocols/wallet/protocol';
import { AddressableMessage } from './wire-protocol';

const messagesToSecond: AddressableMessage[] = [];
messagesToSecond.push({
  type: 'OPEN_CHANNEL',
  signedState: {
    state: {
      appData: '0x',
      appDefinition: '0x',
      isFinal: false,
      turnNum: 0,
      outcome: [
        { destination: 'first', amount: '3' },
        { destination: 'second', amount: '1' },
      ],
      channel: {
        participants: ['first', 'second'],
        channelNonce: '1',
        chainId: 'mainnet?',
      },
      challengeDuration: 'TODO',
    },
    signatures: ['first'],
  },
  to: 'second',
});
messagesToSecond.push({
  type: 'SendStates',
  signedStates: [
    {
      state: {
        appData: '0x',
        appDefinition: '0x',
        isFinal: false,
        turnNum: 1,
        outcome: [
          { destination: 'first', amount: '3' },
          { destination: 'second', amount: '1' },
        ],
        channel: {
          participants: ['first', 'second'],
          channelNonce: '1',
          chainId: 'mainnet?',
        },
        challengeDuration: 'TODO',
      },
      signatures: ['first'],
    },
  ],
  to: 'second',
});
messagesToSecond.push({
  to: 'second',
  type: 'FUNDING_STRATEGY_PROPOSED',
  targetChannelId: 'first+second',
  choice: 'Indirect',
});

const messagesToFirst: AddressableMessage[] = [];
messagesToFirst.push({
  type: 'SendStates',
  signedStates: [
    {
      state: {
        appData: '0x',
        appDefinition: '0x',
        isFinal: false,
        turnNum: 1,
        outcome: [
          {
            destination: 'first',
            amount: '3',
          },
          {
            destination: 'second',
            amount: '1',
          },
        ],
        channel: {
          participants: ['first', 'second'],
          channelNonce: '1',
          chainId: 'mainnet?',
        },
        challengeDuration: 'TODO',
      },
      signatures: ['second'],
    },
  ],
  to: 'first',
});
messagesToFirst.push({
  type: 'FUNDING_STRATEGY_PROPOSED',
  choice: 'Indirect',
  targetChannelId: 'first+second+1',
  to: 'first',
});

const first = 'first';
const second = 'second';
export const createChannel: CreateChannelEvent = {
  type: 'CREATE_CHANNEL',
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
  appDefinition: '0x',
  appData: '0x',
};

export { messagesToSecond, messagesToFirst };

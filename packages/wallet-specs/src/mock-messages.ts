import { AddressableMessage } from './wire-protocol';

const messages: AddressableMessage[] = [];
messages.push({
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
messages.push({
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
messages.push({
  to: 'second',
  type: 'FUNDING_STRATEGY_PROPOSED',
  targetChannelId: 'first+second',
  choice: 'Indirect',
});

export { messages };

import { SignedState, State } from '.';
import { IChannelStoreEntry } from './ChannelStoreEntry';
import { Store } from './store';
const participants = ['me', 'you'];
export const startingState: State = {
  appData: '0x',
  appDefinition: '0x',
  channel: {
    participants,
    channelNonce: '2',
    chainId: '4',
  },
  turnNum: 0,
  outcome: participants.map(p => ({
    destination: p,
    amount: '2',
  })),
  isFinal: false,
  challengeDuration: '42',
};
const startingSignedState: SignedState = {
  state: startingState,
  signatures: ['mine', 'yours'],
};
const storeEntry: IChannelStoreEntry = {
  privateKey: 'secret',
  supportedState: [startingSignedState],
  unsupportedStates: [],
  participants: [],
  funding: { type: 'Direct' },
  channel: startingState.channel,
};

export const store = new Store({ '0xabc': storeEntry });

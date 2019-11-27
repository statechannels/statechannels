import { interpret, Machine } from 'xstate';
import { Channel, Outcome, SignedState, State } from '../..';
import { ChannelStoreEntry, Store } from '../../store';
import { config, Init } from './protocol';

const participants = ['me', 'you'];
const outcome: Outcome = participants.map(p => ({
  destination: p,
  amount: '2',
}));
const channel: Channel = {
  participants,
  channelNonce: '2',
  chainId: '4',
};
const startingState: State = {
  channel,
  turnNum: 0,
  outcome,
  isFinal: false,
  challengeDuration: '42',
};
const startingSignedState: SignedState = {
  state: startingState,
  signatures: ['mine', 'yours'],
};
const storeEntry: ChannelStoreEntry = {
  privateKey: 'secret',
  supportedState: [startingSignedState],
  unsupportedStates: [],
  participants: [],
};
const store = new Store({ '0xabc': storeEntry });

function supported({ channelID, state }: Init): boolean {
  const { state: supportedState } = store.getLatestConsensus(channelID);
  return Store.equals(state, supportedState);
}

function sendState({ channelID, state }: Init): void {
  const unsupportedStates = store.getUnsupportedStates(channelID);

  unsupportedStates.map(({ state: unsupportedState }) => {
    if (
      store.signedByMe(unsupportedState) &&
      unsupportedState.outcome !== state.outcome
    ) {
      throw new Error('Unsafe to send');
    }
  });
  store.sendState(state);
}

const actions = {
  sendState,
};

const guards = {
  supported,
};
const turnNum = 3;
const context: Init = {
  channelID: '0xabc',
  state: { ...startingState, turnNum },
};

const pretty = o => JSON.stringify(o, null, 2);
export const machine = Machine({ ...config, context }, { guards, actions });

const service = interpret(machine)
  .onTransition(state => {
    console.log(state.value);
  })
  .onEvent(event => {
    console.log(`Received event ${pretty(event)}`);
  })
  .start();

let response = store.receiveStates([
  {
    state: { ...startingState, turnNum: turnNum - 1 },
    signatures: ['mine', 'yours'],
  },
]);

if (response) {
  service.send(response);
}

response = store.receiveStates([
  { state: { ...startingState, turnNum }, signatures: ['mine', 'yours'] },
]);
if (response) {
  service.send(response);
}

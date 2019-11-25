import { EventObject, interpret, Machine } from 'xstate';
import { ChannelState, Outcome, SignedState } from '../..';
import { ChannelStoreEntry, Store } from '../../store';
import { config, Init } from './protocol';

const participants = ['me', 'you'];
const outcome: Outcome = participants.map(p => ({ destination: p, amount: 2 }));
const startingState: ChannelState = {
  participants,
  turnNumber: 0,
  outcome,
  channelID: '0xabc',
  isFinal: false,
};
const startingSignedState: SignedState = {
  state: startingState,
  signatures: ['mine', 'yours'],
};
const storeEntry: ChannelStoreEntry = {
  privateKey: 'secret',
  supportedState: [startingSignedState],
  unsupportedStates: [],
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
const turnNumber = 3;
const context: Init = {
  channelID: '0xabc',
  state: { ...startingState, turnNumber },
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
    state: { ...startingState, turnNumber: turnNumber - 1 },
    signatures: ['mine', 'yours'],
  },
]);

if (response) {
  service.send(response);
}

response = store.receiveStates([
  { state: { ...startingState, turnNumber }, signatures: ['mine', 'yours'] },
]);
if (response) {
  service.send(response);
}

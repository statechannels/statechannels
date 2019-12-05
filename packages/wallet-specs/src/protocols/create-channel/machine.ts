import { interpret, InvokeCreator, Machine } from 'xstate';
import { Channel, State } from '../..';
import { ChannelStoreEntry } from '../../ChannelStoreEntry';
import { startingState } from '../../mock-store';
import { checkThat, isAllocation, Participant, Store } from '../../store';
import { config, Init, SetChannel } from './protocol';
const store = new Store();

const { channel, appDefinition, appData } = startingState;
if (!appDefinition || !appData) {
  throw new Error('whoops');
}
const participants: Participant[] = [
  {
    participantId: 'me',
    signingAddress: channel.participants[0],
    destination: channel.participants[0],
  },
];
const context: Init = {
  participants,
  allocations: checkThat(startingState.outcome, isAllocation),
  appDefinition,
  appData,
};

export const setChannelId: InvokeCreator<any> = (
  ctx: Init
): Promise<SetChannel> => {
  const participants = ctx.participants.map(p => p.destination);
  const channelNonce = '4'; // TODO: store.getNextNonce(participants);
  const channel: Channel = {
    participants,
    channelNonce,
    chainId: 'mainnet?',
  };

  const { allocations: outcome, appData, appDefinition } = ctx;
  const firstState: State = {
    appData,
    appDefinition,
    isFinal: false,
    turnNum: 0,
    outcome,
    channel,
    challengeDuration: 'TODO', // TODO
  };

  const entry = new ChannelStoreEntry({
    channel,
    supportedState: [],
    unsupportedStates: [{ state: firstState, signatures: ['me'] }],
    privateKey: 'secret', // TODO: store.getPrivateKey(ctx.participants.map(p => p.participantId)),
    participants: ctx.participants,
  });
  store.initializeChannel(entry.args);

  const { channelId } = entry;

  return new Promise(resolve => {
    return { type: 'CHANNEL_INITIALIZED', channelId };
  });
};

const pretty = o => JSON.stringify(o, null, 2);
const guards = {};
const actions = {};
const services = {
  setChannelId,
  funding: async () => ({}),
  advanceChannel: async () => ({}),
};
export const machine = Machine(
  { ...config, context },
  { guards, actions, services }
);

const service = interpret(machine)
  .onTransition(state => {
    console.log(state.value);
  })
  .onEvent(event => {
    console.log(`Received event ${pretty(event)}`);
  })
  .start();

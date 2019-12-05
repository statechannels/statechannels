import { interpret, InvokeCreator, Machine } from 'xstate';
import { Channel, getChannelID, State } from '../..';
import { ChannelStoreEntry, IChannelStoreEntry } from '../../ChannelStoreEntry';
import { startingState, store } from '../../mock-store';
import { checkThat, isAllocation, Participant, Store } from '../../store';
import { config, Init, SetChannel } from './protocol';

const init: (state: any) => Init = ({ channel, outcome }) => ({
  participants: [
    {
      participantId: 'me',
      signingAddress: channel.participants[0],
      destination: channel.participants[0],
    },
    {
      participantId: 'you',
      signingAddress: channel.participants[1],
      destination: channel.participants[1],
    },
  ],
  allocations: checkThat(outcome, isAllocation),
  appDefinition: '0x',
  appData: '0x',
});

export const setChannelId: InvokeCreator<any> = (
  ctx: Init
): Promise<SetChannel> => {
  const participants = ctx.participants.map(p => p.destination);
  const channelNonce = store.getNextNonce(participants);
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
    privateKey: store.getPrivateKey(ctx.participants.map(p => p.participantId)),
    participants: ctx.participants,
  });
  store.initializeChannel(entry.args);

  const { channelId } = entry;

  return new Promise(resolve => {
    resolve({ type: 'CHANNEL_INITIALIZED', channelId });
  });
};

const pretty = o => JSON.stringify(o, null, 2);
const guards = {};
const actions = {};
const services = {
  setChannelId,
  funding: async () => 'Done funding',
  advanceChannel: async () => 'done advance channel',
};
export const machine = Machine(
  { ...config, context: init(startingState) },
  { guards, actions, services }
);

const service = interpret(machine)
  .onEvent(event => {
    console.log(`Received event ${pretty(event)}`);
  })
  .start();

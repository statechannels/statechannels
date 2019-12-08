import { assign, InvokeCreator, Machine, sendParent } from 'xstate';
import { AdvanceChannel } from '..';
import {
  Channel,
  forwardChannelUpdated,
  MachineFactory,
  State,
  Store,
  success,
} from '../..';
import { ChannelStoreEntry } from '../../ChannelStoreEntry';
import { JsonRpcCreateChannelParams } from '../../json-rpc';

const PROTOCOL = 'create-channel';

/*
Spawned in a new process when the app calls CreateChannel
*/
export type Init = JsonRpcCreateChannelParams;

type ChannelSet = Init & { channelId: string };
export interface SetChannel {
  type: 'CHANNEL_INITIALIZED';
  channelId: string;
}
const assignChannelId = assign({
  channelId: (_, event: any) => event.data.channelId,
});

const sendOpenChannelMessage = (ctx: SetChannel) =>
  console.log('Sending open channel message');
export const advanceChannelArgs = (i: 1 | 3) => ({
  channelId,
}: ChannelSet): AdvanceChannel.Init => ({
  channelId,
  targetTurnNum: i,
});
const initializeChannel = {
  invoke: {
    src: 'setChannelId',
    onDone: 'preFundSetup',
  },
  exit: [assignChannelId, sendOpenChannelMessage],
};

const preFundSetup = {
  invoke: {
    id: 'preFundSetup',
    src: 'advanceChannel',
    data: advanceChannelArgs(1),
    onDone: 'funding',
  },
  on: {
    CHANNEL_CLOSED: 'abort',
    CHANNEL_UPDATED: forwardChannelUpdated('preFundSetup'),
  },
};

const abort = success;

const funding = {
  invoke: {
    src: 'funding',
    data: ({ channelId }: ChannelSet) => ({ channelId }),
    onDone: 'postFundSetup',
  },
};

const postFundSetup = {
  invoke: {
    id: 'postFundSetup',
    src: 'advanceChannel',
    data: advanceChannelArgs(3),
    onDone: 'success',
  },
  on: {
    CHANNEL_UPDATED: forwardChannelUpdated('postFundSetup'),
  },
};

export const config = {
  key: PROTOCOL,
  initial: 'initializeChannel',
  states: {
    initializeChannel,
    preFundSetup,
    abort,
    funding,
    postFundSetup,
    success: { type: 'final' as 'final', entry: sendParent('CHANNEL_CREATED') },
  },
};

export const mockOptions = {
  actions: { sendOpenChannelMessage },
};

export const machine: MachineFactory<Init, any> = (
  store: Store,
  init: Init
) => {
  const setChannelId: InvokeCreator<any> = (ctx: Init): Promise<SetChannel> => {
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
      unsupportedStates: [{ state: firstState, signatures: [] }],
      privateKey: store.getPrivateKey(
        ctx.participants.map(p => p.participantId)
      ),
      participants: ctx.participants,
    });
    store.initializeChannel(entry.args);

    const { channelId } = entry;

    return new Promise(resolve => {
      resolve({ type: 'CHANNEL_INITIALIZED', channelId });
    });
  };
  const guards = {};
  const actions = {
    sendOpenChannelMessage: ({ channelId }: SetChannel) => {
      const state = store.getLatestState(channelId);
      if (state.turnNum !== 0) {
        throw new Error('Wrong state');
      }

      store.sendOpenChannel(state);
    },
  };
  const services = {
    setChannelId,
    funding: async () => console.log('currently funding'),
    advanceChannel: AdvanceChannel.machine(store),
  };

  const options = {
    guards,
    actions,
    services,
  };

  return Machine(config, options).withContext(init);
};

import { assign, DoneInvokeEvent, Machine, MachineConfig, sendParent } from 'xstate';
import { State } from '@statechannels/nitro-protocol';

import {
  Channel,
  forwardChannelUpdated,
  MachineFactory,
  IStore,
  success,
  ethAllocationOutcome,
} from '../..';
import { ChannelStoreEntry } from '../../ChannelStoreEntry';
import { JsonRpcCreateChannelParams } from '../../json-rpc';
import { passChannelId } from '../join-channel/protocol';

import { AdvanceChannel, Funding } from '..';

const PROTOCOL = 'create-channel';

/*
Spawned in a new process when the app calls CreateChannel
*/
export type Init = JsonRpcCreateChannelParams & { chainId: string; challengeDuration: number };

type ChannelSet = Init & { channelId: string };
export interface SetChannel {
  type: 'CHANNEL_INITIALIZED';
  channelId: string;
}
const assignChannelId: any = assign({
  channelId: (_: Context, event: DoneInvokeEvent<any>) => event.data.channelId,
});

export const advanceChannelArgs = (i: 1 | 3) => ({
  channelId,
}: ChannelSet): AdvanceChannel.Init => ({
  channelId,
  targetTurnNum: i,
});
const initializeChannel = {
  invoke: {
    src: 'initializeChannel',
    onDone: 'sendOpenChannelMessage',
  },
  exit: assignChannelId,
};

const sendOpenChannelMessage = {
  invoke: {
    src: 'sendOpenChannelMessage',
    onDone: 'preFundSetup',
  },
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
    CHANNEL_UPDATED: forwardChannelUpdated<Context>('preFundSetup'),
  },
};

const abort = success;

const funding = {
  invoke: {
    src: 'funding',
    data: passChannelId,
    onDone: 'postFundSetup',
    autoForward: true,
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
    CHANNEL_UPDATED: forwardChannelUpdated<Context>('postFundSetup'),
  },
};

type Context = Init | ChannelSet;
export const config: MachineConfig<Context, any, any> = {
  key: PROTOCOL,
  initial: 'initializeChannel',
  states: {
    initializeChannel,
    sendOpenChannelMessage,
    preFundSetup,
    abort,
    funding,
    postFundSetup,
    success: { type: 'final' as 'final', entry: sendParent('CHANNEL_CREATED') },
  },
};

export const machine: MachineFactory<Init, any> = (store: IStore, init: Init) => {
  async function initializeChannel(ctx: Init): Promise<SetChannel> {
    const participants = ctx.participants.map(p => p.signingAddress);
    const channelNonce = store.getNextNonce(participants);
    const channel: Channel = {
      participants,
      channelNonce,
      chainId: ctx.chainId,
    };

    const { allocations, appData, appDefinition } = ctx;
    const firstState: State = {
      appData,
      appDefinition,
      isFinal: false,
      turnNum: 0,
      outcome: ethAllocationOutcome(allocations),
      channel,
      challengeDuration: ctx.challengeDuration,
    };

    const entry = new ChannelStoreEntry({
      channel,
      states: [{ state: firstState, signatures: [] }],
      privateKey: store.getPrivateKey(participants),
      participants: ctx.participants,
    });
    store.initializeChannel(entry.args);

    const { channelId } = entry;

    return {
      type: 'CHANNEL_INITIALIZED',
      channelId,
    };
  }

  const sendOpenChannelMessage = async ({ channelId }: ChannelSet) => {
    const state = store.getEntry(channelId).latestState;
    if (state.turnNum !== 0) {
      throw new Error('Wrong state');
    }

    store.sendOpenChannel(state);
  };

  const services = {
    initializeChannel,
    sendOpenChannelMessage,
    funding: Funding.machine(store),
    advanceChannel: AdvanceChannel.machine(store),
  };

  const options = { services };

  return Machine(config).withConfig(options, init);
};

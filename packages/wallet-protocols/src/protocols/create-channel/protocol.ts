import { assign, DoneInvokeEvent, Machine, MachineConfig, sendParent } from 'xstate';
import { State, Channel } from '@statechannels/nitro-protocol';

import { MachineFactory, success, Store } from '../..';
import { ethAllocationOutcome } from '../../calculations';
import { ChannelStoreEntry } from '../../ChannelStoreEntry';
import { JsonRpcCreateChannelParams } from '../../json-rpc';
import { passChannelId } from '../join-channel/protocol';

import { AdvanceChannel, Funding } from '..';

const PROTOCOL = 'create-channel';

/*
Spawned in a new process when the app calls CreateChannel
*/
export type Init = JsonRpcCreateChannelParams & { chainId: string; challengeDuration: number };
export type ChannelSet = Init & { channelId: string };
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
  on: { CHANNEL_CLOSED: 'abort' },
};

const abort = success;

const funding = {
  invoke: {
    src: 'funding',
    data: passChannelId,
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
    success: {
      type: 'final' as 'final',

      entry: sendParent({ type: 'CHANNEL_CREATED' }),
      data: { channelId: (context: ChannelSet, event) => context.channelId },
    },
  },
};

export const machine: MachineFactory<Init, any> = (store: Store, init: Init) => {
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
      outcome: ethAllocationOutcome(allocations, store.ethAssetHolderAddress),
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

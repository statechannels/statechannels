import { send, Machine, MachineConfig, AnyEventObject } from 'xstate';

import { IStore, MachineFactory, ChannelStoreEntry } from '../..';
import { ChannelUpdated } from '../../store';

const PROTOCOL = 'advance-channel';
/*
Fully determined: true

In the current wallet, the post-fund-setup version of advance-channel is responsible for
storing state updates as they come in.
In this spec, the store itself is responsible for that, so you can wait to spin up an
advance-channel protocol once app funding is confirmed.

Additionally, waiting until it's your turn isn't necessary once the channel is funded.
An app should refrain from taking an app move until the entire post-fund round is supported,
since their application updates are otherwise unenforcable.

Therefore, we send on entry into the protocol.
*/

export interface Init {
  channelId: string;
  targetTurnNum: number; // should either be numParticipants-1 or 2*numParticipants-1
}

export const config: MachineConfig<Init, any, AnyEventObject> = {
  key: PROTOCOL,
  type: 'parallel',
  states: {
    watchStore: {
      initial: 'watching',
      states: {
        watching: { invoke: { id: 'store-watcher', src: 'watchStore', onDone: 'done' } },
        done: { type: 'final' },
      },
    },
    sendState: {
      initial: 'sendingState',
      states: {
        sendingState: { invoke: { src: 'sendState', onDone: 'success' } },
        success: { entry: send('DONE'), type: 'final' },
      },
    },
  },
};

export type Services = {
  sendState(ctx: Init): Promise<void>;
  watchStore(ctx: Init): any; // TODO: add callback type
};

function advanced(entry: ChannelStoreEntry, targetTurnNum: number): boolean {
  return entry.hasSupportedState && entry.latestSupportedState.turnNum >= targetTurnNum;
}

const watchStore = (store: IStore) => async ({
  channelId,
  targetTurnNum,
}: Init): Promise<undefined> => {
  return new Promise(resolve => {
    const entry = store.getEntry(channelId);
    if (advanced(entry, targetTurnNum)) resolve();
    store.on('CHANNEL_UPDATED', async (event: ChannelUpdated) => {
      if (
        channelId === event.channelId &&
        advanced(await store.getEntry(channelId), targetTurnNum)
      ) {
        resolve();
      }
    });
  });
};

const sendState = (store: IStore) => async ({ channelId, targetTurnNum }: Init) => {
  const turnNum = targetTurnNum;
  /*
  TODO: the actual turnNum is calculated below. However, to determine whether
  a state is supported requires us to implement signature checking.
  const turnNum =
    targetTurnNum - channel.participants.length + ourIndex + 1;
  */

  try {
    const { latestSupportedState } = store.getEntry(channelId);
    if (latestSupportedState.turnNum < targetTurnNum) {
      store.sendState({ ...latestSupportedState, turnNum });
    }
  } catch (e) {
    // TODO: Check error
    const { latestState } = store.getEntry(channelId);
    store.sendState({ ...latestState, turnNum });
  }
};

export const options = (store: IStore) => ({
  services: {
    watchStore: watchStore(store),
    sendState: sendState(store),
  },
});

export const machine: MachineFactory<Init, any> = (store: IStore, context?: Init) => {
  return Machine(config).withConfig(options(store), context);
};

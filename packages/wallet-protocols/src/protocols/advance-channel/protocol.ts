import { assign, Machine, MachineConfig, AnyEventObject, spawn } from 'xstate';
import { map, filter } from 'rxjs/operators';

import { IStore, observeChannel } from '../../store';
import { MachineFactory } from '../..';

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
  initial: 'sendState',
  states: {
    sendState: {
      entry: 'spawnObserver',
      invoke: { src: 'sendState' },
      on: { ADVANCED: 'success' },
    },
    success: { type: 'final' },
  },
};

export type Services = {
  sendState(ctx: Init): Promise<void>;
};

const notifyWhenAdvanced = (store: IStore) => (ctx: Init) => {
  return observeChannel(store, ctx.channelId).pipe(
    map(event => event.entry),
    filter(e => {
      return e.hasSupportedState && e.latestSupportedState.turnNum >= ctx.targetTurnNum;
    }),
    map(() => 'ADVANCED')
  );
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

const options = (store: IStore) => ({
  services: {
    notifyWhenAdvanced: notifyWhenAdvanced(store),
    sendState: sendState(store),
  },
  actions: {
    spawnObserver: assign<Init & { observer: any }>({
      observer: (ctx: Init) => spawn(notifyWhenAdvanced(store)(ctx)),
    }),
  },
});

export const machine: MachineFactory<Init, any> = (store: IStore, context?: Init) => {
  return Machine(config).withConfig(options(store), context);
};

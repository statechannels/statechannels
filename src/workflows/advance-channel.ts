import {AnyEventObject, MachineConfig, assign, spawn} from 'xstate';
import {filter, map} from 'rxjs/operators';
import {Store} from '../store';
import {bigNumberify} from 'ethers/utils';
import {connectToStore} from '../utils/workflow-utils';

const WORKFLOW = 'advance-channel';
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
  key: WORKFLOW,
  initial: 'sendState',
  states: {
    sendState: {
      entry: 'spawnObserver',
      invoke: {src: 'sendState'},
      on: {ADVANCED: 'success'}
    },
    success: {type: 'final'}
  }
};

export type Services = {
  sendState(ctx: Init): Promise<void>;
};

const notifyWhenAdvanced = (store: Store, ctx: Init) => {
  return store.channelUpdatedFeed(ctx.channelId).pipe(
    filter(e => {
      return !!e.supported && e.supported.turnNum.gte(ctx.targetTurnNum);
    }),
    map(() => 'ADVANCED')
  );
};

const sendState = (store: Store) => async ({channelId, targetTurnNum}: Init) => {
  const turnNum = bigNumberify(targetTurnNum);
  /*
  TODO: the actual turnNum is calculated below. However, to determine whether
  a state is supported requires us to implement signature checking.
  const turnNum =
    targetTurnNum - channel.participants.length + ourIndex + 1;
  */

  const {supported} = await store.getEntry(channelId);

  if (!!supported && supported.turnNum.lt(targetTurnNum)) {
    store.addState(channelId, {...supported, turnNum});
  } else if (!supported) {
    const {latest} = await store.getEntry(channelId);
    store.addState(channelId, {...latest, turnNum});
  }
};

const options = (store: Store) => ({
  services: {
    sendState: sendState(store)
  },
  actions: {
    spawnObserver: assign<Init>((ctx: Init) => ({
      ...ctx,
      observer: spawn(notifyWhenAdvanced(store, ctx))
    }))
  }
});

export const machine = connectToStore(config, options);

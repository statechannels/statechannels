import {AnyEventObject, AssignAction, MachineConfig, assign, spawn, Machine, Actor} from 'xstate';
import {filter, map} from 'rxjs/operators';
import {Store} from '@statechannels/wallet-core/lib/src/store';
import {
  statesEqual,
  calculateChannelId
} from '@statechannels/wallet-core/lib/src/store/state-utils';
import {State} from '@statechannels/wallet-core/lib/src/store/types';
const WORKFLOW = 'support-state';

export type Init = {state: State; observer?: Actor<any, any>};
type HasChannelId = Init & {channelId: string};

/*
TODO
What happens if sendState fails?
Do we abort? Or do we try to reach consensus on a later state?
*/
export const config: MachineConfig<HasChannelId, any, AnyEventObject> = {
  key: WORKFLOW,
  initial: 'signState',
  states: {
    signState: {
      entry: [
        assign<HasChannelId>({channelId: ({state}) => calculateChannelId(state)}),
        'spawnObserver'
      ],
      invoke: {src: 'signState'},
      on: {SUPPORTED: 'success'}
    },
    success: {type: 'final'}
  }
};

type Services = {signState(ctx: HasChannelId, event): any};

type Options = {
  services: Services;
  actions: {spawnObserver: AssignAction<HasChannelId, any>};
};

const signState = (store: Store) => async ({state}: HasChannelId) => store.supportState(state);

const notifyWhenSupported = (store: Store, {state, channelId}: HasChannelId) =>
  store.channelUpdatedFeed(channelId).pipe(
    filter(({isSupported}) => isSupported),
    filter(entry => statesEqual(state, entry.supported)),
    map(() => 'SUPPORTED')
  );

const options = (store: Store): Options => ({
  services: {
    signState: signState(store)
  },
  actions: {
    spawnObserver: assign<HasChannelId>((ctx: HasChannelId) => ({
      ...ctx,
      observer: !ctx.observer ? spawn(notifyWhenSupported(store, ctx)) : ctx.observer
    }))
  }
});

export const machine = (store: Store) => Machine(config, options(store));

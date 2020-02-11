import {AnyEventObject, AssignAction, MachineConfig, assign, spawn, Machine} from 'xstate';
import {filter, map} from 'rxjs/operators';
import {Store} from '../store';
import {StateRenamed} from '../store/types';
import {statesEqual, outcomesEqual} from '../store/state-utils';

const WORKFLOW = 'support-state';

export type Init = {state: StateRenamed};

/*
TODO
What happens if sendState fails?
Do we abort? Or do we try to reach consensus on a later state?
*/
export const config: MachineConfig<Init, any, AnyEventObject> = {
  key: WORKFLOW,
  initial: 'sendState',
  states: {
    sendState: {
      entry: 'spawnObserver',
      invoke: {src: 'sendState'},
      on: {SUPPORTED: 'success'}
    },
    success: {type: 'final'}
  }
};

type Services = {sendState(ctx: Init): any};

type Options = {
  services: Services;
  actions: {spawnObserver: AssignAction<Init, any>};
};

const sendState = (store: Store) => async ({state}: Init) => {
  const entry = await store.getEntry(state.channelId);
  const {latestSupportedByMe, supported, channelConstants} = entry;
  // TODO: Should these safety checks be performed in the store?
  if (
    // If we've haven't already signed a state, there's no harm in supporting one.
    !latestSupportedByMe ||
    // If we've already supported this state, we might as well re-send it.
    statesEqual(channelConstants, latestSupportedByMe, state) ||
    // Otherwise, we only send it if we haven't signed any new states.
    (statesEqual(channelConstants, latestSupportedByMe, supported) &&
      supported?.turnNum.lt(state.turnNum)) ||
    // We always support a final state if it matches the outcome that we have signed
    (state.isFinal && outcomesEqual(state.outcome, latestSupportedByMe.outcome))
  ) {
    await store.addState(state.channelId, state);
  } else {
    throw 'Not safe to send';
  }
};

const notifyWhenSupported = (store: Store, {state}: Init) => {
  return store.channelUpdatedFeed(state.channelId).pipe(
    filter(({supported, channelConstants}) => statesEqual(channelConstants, state, supported)),
    map(() => 'SUPPORTED')
  );
};

const options = (store: Store): Options => ({
  services: {
    sendState: sendState(store)
  },
  actions: {
    spawnObserver: assign<Init>((ctx: Init) => ({
      ...ctx,
      observer: spawn(notifyWhenSupported(store, ctx))
    }))
  }
});

export const machine = (store: Store) => Machine(config, options(store));

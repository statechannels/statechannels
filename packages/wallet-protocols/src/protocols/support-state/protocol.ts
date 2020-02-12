import { AnyEventObject, AssignAction, MachineConfig, assign, spawn } from 'xstate';
import { State, getChannelId } from '@statechannels/nitro-protocol';
import { filter, map } from 'rxjs/operators';

import { outcomesEqual, statesEqual } from '../..';
import { ObsoleteStore, observeChannel } from '../../store';
import { connectToStore } from '../../machine-utils';

const PROTOCOL = 'support-state';

export type Init = { state: State };

/*
TODO
What happens if sendState fails?
Do we abort? Or do we try to reach consensus on a later state?
*/
export const config: MachineConfig<Init, any, AnyEventObject> = {
  key: PROTOCOL,
  initial: 'sendState',
  states: {
    sendState: {
      entry: 'spawnObserver',
      invoke: { src: 'sendState' },
      on: { SUPPORTED: 'success' },
    },
    success: { type: 'final' },
  },
};

type Services = { sendState(ctx: Init): any };

type Options = {
  services: Services;
  actions: { spawnObserver: AssignAction<Init, any> };
};

const sendState = (store: ObsoleteStore) => async ({ state }: Init) => {
  const entry = store.getEntry(getChannelId(state.channel));
  const { latestStateSupportedByMe, hasSupportedState } = entry;
  // TODO: Should these safety checks be performed in the store?
  if (
    // If we've haven't already signed a state, there's no harm in supporting one.
    !latestStateSupportedByMe ||
    // If we've already supported this state, we might as well re-send it.
    statesEqual(latestStateSupportedByMe, state) ||
    // Otherwise, we only send it if we haven't signed any new states.
    (hasSupportedState &&
      statesEqual(entry.latestSupportedState, latestStateSupportedByMe) &&
      entry.latestSupportedState.turnNum < state.turnNum) ||
    // We always support a final state if it matches the outcome that we have signed
    (state.isFinal && outcomesEqual(state.outcome, latestStateSupportedByMe.outcome))
  ) {
    await store.sendState(state);
  } else {
    throw 'Not safe to send';
  }
};

const notifyWhenSupported = (store: ObsoleteStore, { state }: Init) => {
  return observeChannel(store, getChannelId(state.channel)).pipe(
    map(event => event.entry),
    filter(e => e.hasSupportedState && statesEqual(e.latestSupportedState, state)),
    map(() => 'SUPPORTED')
  );
};

const options = (store: ObsoleteStore): Options => ({
  services: {
    sendState: sendState(store),
  },
  actions: {
    spawnObserver: assign<Init>((ctx: Init) => ({
      ...ctx,
      observer: spawn(notifyWhenSupported(store, ctx)),
    })),
  },
});

export const machine = connectToStore(config, options);

import { Machine, MachineConfig, AnyEventObject } from 'xstate';
import { State, getChannelId } from '@statechannels/nitro-protocol';
import { map, filter } from 'rxjs/operators';

import { MachineFactory, statesEqual } from '../..';
import { IStore, observeChannel } from '../../store';

const PROTOCOL = 'support-state';

export interface Init {
  state: State;
}

/*
TODO
What happens if sendState fails?
Do we abort? Or do we try to reach consensus on a later state?
*/

export const config: MachineConfig<Init, any, AnyEventObject> = {
  key: PROTOCOL,
  type: 'parallel',
  states: {
    checkIfSupported: {
      on: { SUPPORTED: '.success' },
      initial: 'watching',
      states: {
        watching: { invoke: { src: 'notifyWhenSupported' } },
        success: { type: 'final' },
      },
    },
    sendState: {
      on: { SUPPORTED: '.success' },
      initial: 'sendingState',
      states: {
        sendingState: { invoke: { src: 'sendState', onDone: 'success' } },
        success: { type: 'final' },
      },
    },
  },
};

type Services = {
  sendState(ctx: Init): any;
  notifyWhenSupported(ctx: Init): any;
};

type Options = {
  services: Services;
};

const sendState = (store: IStore) => async ({ state }: Init) => {
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
      entry.latestSupportedState.turnNum < state.turnNum)
  ) {
    await store.sendState(state);
  } else {
    throw 'Not safe to send';
  }
};

const notifyWhenSupported = (store: IStore) => ({ state }: Init) => {
  return observeChannel(store, getChannelId(state.channel)).pipe(
    map(event => event.entry),
    filter(e => e.hasSupportedState && statesEqual(e.latestSupportedState, state)),
    map(() => 'SUPPORTED')
  );
};

export type machine = typeof machine;
export const machine: MachineFactory<Init, any> = (store: IStore, context: Init) => {
  const services: Services = {
    sendState: sendState(store),
    notifyWhenSupported: notifyWhenSupported(store),
  };

  const options: Options = { services };
  return Machine(config, options).withContext(context);
};

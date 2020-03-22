import {Machine, StateNodeConfig} from 'xstate';
import {Store} from '../store';
import {SupportState} from '.';
import {getDataAndInvoke} from '../utils';
import {outcomesEqual} from '../store/state-utils';
import {State} from '../store/types';

const WORKFLOW = 'conclude-channel';

export type Init = {channelId: string};

const finalState = (store: Store) => async (context: Init): Promise<SupportState.Init> => {
  const {sortedStates, latestSupportedByMe, latest} = await store.getEntry(context.channelId);

  const latestFinalState: State | undefined = sortedStates.filter(s => s.isFinal)[0];

  // If we've received a new final state that matches our outcome we support that
  if (outcomesEqual(latestSupportedByMe.outcome, latestFinalState?.outcome)) {
    return {state: latestFinalState};
  }

  // If we've supported a final state, send it
  if (latestSupportedByMe.isFinal) {
    return {state: latestSupportedByMe};
  }

  // Otherwise create a new final state
  return {state: {...latestSupportedByMe, turnNum: latest.turnNum.add(1), isFinal: true}};
};

const supportState = (store: Store) => SupportState.machine(store);

const concludeChannel = getDataAndInvoke<Init>(
  {src: finalState.name},
  {src: supportState.name},
  'determineFundingType'
);

const determineFundingType = {
  invoke: {src: 'getFunding'},
  on: {
    VIRTUAL: 'virtual',
    DIRECT: 'withdraw'
  }
};

const virtualDefunding = {
  initial: 'start',
  states: {
    start: {
      on: {
        '': [
          {target: 'asLeaf', cond: 'amLeaf'},
          {target: 'asHub', cond: 'amHub'}
        ]
      }
    },
    asLeaf: {invoke: {src: 'virtualDefundingAsLeaf', onDone: 'success'}},
    asHub: {invoke: {src: 'virtualDefundingAsHub', onDone: 'success'}},
    success: {type: 'final' as 'final'}
  },
  onDone: 'freeingBudget'
};

const freeingBudget = {onDone: 'done'};

const virtual: StateNodeConfig<Init, any, any> = {
  initial: 'virtualDefunding',
  states: {virtualDefunding, freeingBudget, done: {type: 'final'}},
  onDone: 'success'
};

const withdraw = {};

export const config: StateNodeConfig<Init, any, any> = {
  key: WORKFLOW,
  initial: 'concludeChannel',
  states: {
    concludeChannel,
    determineFundingType,
    virtual,
    withdraw,
    success: {type: 'final' as 'final'}
  }
};

export const mockOptions = {guards: {virtuallyFunded: _ => true, directlyFunded: _ => true}};

const services = (store: Store) => ({
  finalState: finalState(store),
  supportState: supportState(store)
});
const options = (store: Store) => ({services: services(store)});
export const machine = (store: Store) => Machine(config).withConfig(options(store));

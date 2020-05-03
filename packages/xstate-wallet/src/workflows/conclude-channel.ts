import {Machine, StateNodeConfig} from 'xstate';
import {Store} from '../store';
import {SupportState, VirtualDefundingAsLeaf} from '.';
import {getDataAndInvoke} from '../utils';

import {outcomesEqual} from '../store/state-utils';
import {State} from '../store/types';
import {map} from 'rxjs/operators';
import {ParticipantIdx} from './virtual-funding-as-leaf';

const WORKFLOW = 'conclude-channel';

export type Init = {channelId: string};

const finalState = (store: Store) => async (context: Init): Promise<SupportState.Init> => {
  const {sortedStates, latestSignedByMe, latest} = await store.getEntry(context.channelId);

  const latestFinalState: State | undefined = sortedStates.filter(s => s.isFinal)[0];

  // If we've received a new final state that matches our outcome we support that
  if (outcomesEqual(latestSignedByMe.outcome, latestFinalState?.outcome)) {
    return {state: latestFinalState};
  }

  // If we've supported a final state, send it
  if (latestSignedByMe.isFinal) {
    return {state: latestSignedByMe};
  }

  // Otherwise create a new final state
  return {state: {...latestSignedByMe, turnNum: latest.turnNum.add(1), isFinal: true}};
};

const supportState = (store: Store) => SupportState.machine(store);

const concludeChannel = getDataAndInvoke<Init>(
  {src: finalState.name},
  {src: supportState.name},
  'determineFundingType'
);

const getFunding = (store: Store) => (ctx: Init) =>
  store.channelUpdatedFeed(ctx.channelId).pipe(
    map(({funding}) => {
      switch (funding?.type) {
        case 'Direct':
        case 'Virtual':
          return funding.type;
        default:
          throw new Error(`Unexpected funding type ${funding?.type}`);
      }
    })
  );

const determineFundingType = {
  invoke: {src: getFunding.name},
  on: {
    Virtual: 'virtualDefunding',
    Direct: 'withdrawing'
  }
};

const getRole = (store: Store) => (ctx: Init) => async cb => {
  const {myIndex} = await store.getEntry(ctx.channelId);
  if (myIndex === ParticipantIdx.Hub) cb('AmHub');
  else cb('AmLeaf');
};

const virtualDefunding = {
  initial: 'gettingRole',
  states: {
    gettingRole: {invoke: {src: getRole.name}, on: {AmHub: 'asHub', AmLeaf: 'asLeaf'}},
    asLeaf: {
      invoke: {
        src: 'virtualDefundingAsLeaf',
        data: (ctx: Init): VirtualDefundingAsLeaf.Init => ({targetChannelId: ctx.channelId}),
        onDone: 'success'
      }
    },
    asHub: {invoke: {src: 'virtualDefundingAsHub', onDone: 'success'}},
    success: {type: 'final' as 'final'}
  },
  onDone: 'success'
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const withdraw = (store: Store) => async (ctx: Init) => {
  // NOOP
};

// TODO: Probably display UI for withdrawing when implemented
const withdrawing = {invoke: {src: withdraw.name, onDone: 'success'}};

export const config: StateNodeConfig<Init, any, any> = {
  key: WORKFLOW,
  initial: 'concludeChannel',
  states: {
    concludeChannel,
    determineFundingType,
    virtualDefunding,
    withdrawing,
    success: {type: 'final'}
  }
};

const services = (store: Store) => ({
  finalState: finalState(store),
  getFunding: getFunding(store),
  supportState: supportState(store),
  withdraw: withdraw(store),
  getRole: getRole(store),
  virtualDefundingAsLeaf: VirtualDefundingAsLeaf.machine(store)
});

const options = (store: Store) => ({
  services: services(store)
});
export const machine = (store: Store) => Machine(config).withConfig(options(store));

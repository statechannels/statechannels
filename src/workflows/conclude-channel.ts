import {Machine, StateNodeConfig} from 'xstate';
import {StoreInterface} from '../store';
import {SupportState, VirtualDefundingAsLeaf} from '.';
import {getDataAndInvoke} from '../utils';

import {outcomesEqual} from '../store/state-utils';
import {State} from '../store/types';
import {map} from 'rxjs/operators';
import {ParticipantIdx} from './virtual-funding-as-leaf';

const WORKFLOW = 'conclude-channel';

export type Init = {channelId: string};

const finalState = (store: StoreInterface) => async (context: Init): Promise<SupportState.Init> => {
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

const supportState = (store: StoreInterface) => SupportState.machine(store);

const concludeChannel = getDataAndInvoke<Init>(
  {src: finalState.name},
  {src: supportState.name},
  'determineFundingType'
);

const getFunding = (store: StoreInterface) => (ctx: Init) =>
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

const getRole = (store: StoreInterface) => (ctx: Init) => async cb => {
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

const withdraw = (store: StoreInterface) => async (ctx: Init) => {
  // NOOP
};

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

const services = (store: StoreInterface) => ({
  finalState: finalState(store),
  getFunding: getFunding(store),
  supportState: supportState(store),
  withdraw: withdraw(store),
  getRole: getRole(store),
  virtualDefundingAsLeaf: VirtualDefundingAsLeaf.machine(store)
});

const options = (store: StoreInterface) => ({
  services: services(store)
});
export const machine = (store: StoreInterface) => Machine(config).withConfig(options(store));

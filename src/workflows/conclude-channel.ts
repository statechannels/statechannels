import {Machine, StateNodeConfig} from 'xstate';
import {Store} from '../store';
import {VirtualDefundingAsLeaf} from '.';
import {getDataAndInvoke} from '../utils';

import {map, first} from 'rxjs/operators';
import {ParticipantIdx} from './virtual-funding-as-leaf';

const WORKFLOW = 'conclude-channel';

export type Init = {channelId: string};

const signFinalState = (store: Store) => async ({channelId}: Init): Promise<void> => {
  const {supported, latestSignedByMe} = await store.getEntry(channelId);
  if (!supported.isFinal) throw new Error('Supported state not final');
  if (latestSignedByMe.turnNum.eq(supported.turnNum)) return; // already signed
  await store.signAndAddState(channelId, supported);
};

const waitForConclusionProof = (store: Store) => async ({channelId}: Init) =>
  store
    .channelUpdatedFeed(channelId)
    .pipe(first(({isFinalized}) => isFinalized))
    .toPromise();

const concludeChannel = getDataAndInvoke<Init>(
  {src: signFinalState.name},
  {src: waitForConclusionProof.name},
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
  signFinalState: signFinalState(store),
  waitForConclusionProof: waitForConclusionProof(store),
  getFunding: getFunding(store),
  withdraw: withdraw(store),
  getRole: getRole(store),
  virtualDefundingAsLeaf: VirtualDefundingAsLeaf.machine(store)
});

const options = (store: Store) => ({
  services: services(store)
});
export const machine = (store: Store) => Machine(config).withConfig(options(store));

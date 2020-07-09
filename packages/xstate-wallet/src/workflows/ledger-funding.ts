import {Machine, MachineConfig, ServiceConfig, assign, DoneInvokeEvent} from 'xstate';
import {
  allocateToTarget,
  isSimpleEthAllocation,
  checkThat,
  add,
  AllocationItem,
  Funding
} from '@statechannels/wallet-core';

import {ChannelLock} from '../store/store';

import {Store} from '../store';
import {getDataAndInvoke} from '../utils';
import {assignError} from '../utils/workflow-utils';
import {SupportState} from '.';

import {escalate} from '../actions';

const WORKFLOW = 'ledger-funding';

export interface Init {
  targetChannelId: string;
  ledgerChannelId: string;
  deductions: AllocationItem[];
}

const enum Services {
  getTargetOutcome = 'getTargetOutcome',
  updateFunding = 'updateFunding',
  supportState = 'supportState',
  checkTarget = 'checkTarget',
  acquireLock = 'acquireLock'
}

export const enum Errors {
  underfunded = 'Ledger channel is underfunded',
  underallocated = 'Ledger channel is underallocated',
  finalized = 'Ledger channel is finalized',
  unSupportedTargetChannel = 'Target channel has no supported state: '
}

const FAILURE = `#${WORKFLOW}.failure`;
const onError = {target: FAILURE};

const fundingTarget = getDataAndInvoke(
  {src: Services.getTargetOutcome, opts: {onError}},
  {src: Services.supportState, opts: {onError}},
  'updatingFunding'
);

const checkTarget = (store: Store) => async (ctx: Init) => {
  const {isSupported} = await store.getEntry(ctx.targetChannelId);
  if (!isSupported) throw Error(Errors.unSupportedTargetChannel + ctx.targetChannelId);
};

export const config: MachineConfig<any, any, any> = {
  id: WORKFLOW,
  key: WORKFLOW,
  initial: 'acquiringLock',
  states: {
    acquiringLock: {
      invoke: {src: Services.acquireLock, onDone: 'checkingTarget'},
      exit: assign<WithLock>({lock: (_, event: DoneInvokeEvent<ChannelLock>) => event.data})
    },
    checkingTarget: {
      invoke: {src: Services.checkTarget, onDone: 'fundingTarget', onError}
    },
    fundingTarget,
    failure: {
      entry: [assignError, 'escalateError', 'releaseLock']
    },
    updatingFunding: {invoke: {src: Services.updateFunding, onDone: 'success'}},
    success: {type: 'final', entry: 'releaseLock'}
  }
};

const acquireLock = (store: Store) => (ctx: Init): Promise<ChannelLock> =>
  store.acquireChannelLock(ctx.ledgerChannelId);

type WithLock = Init & {lock: ChannelLock};

const getTargetOutcome = (store: Store) => async (ctx: Init): Promise<SupportState.Init> => {
  // TODO: Switch to feed
  const {targetChannelId, ledgerChannelId, deductions} = ctx;
  const {supported: ledgerState, channelConstants} = await store.getEntry(ledgerChannelId);

  const {amount, finalized} = await store.chain.getChainInfo(ledgerChannelId);
  if (finalized) throw new Error(Errors.finalized);

  const currentlyAllocated = checkThat(ledgerState.outcome, isSimpleEthAllocation)
    .allocationItems.map(i => i.amount)
    .reduce(add);
  const toDeduct = deductions.map(i => i.amount).reduce(add);

  if (amount.lt(currentlyAllocated)) throw new Error(Errors.underfunded);

  if (currentlyAllocated.lt(toDeduct)) throw new Error(Errors.underallocated);

  return {
    state: {
      ...channelConstants,
      ...ledgerState,
      turnNum: ledgerState.turnNum + 1,
      outcome: allocateToTarget(ledgerState.outcome, deductions, targetChannelId)
    }
  };
};

const updateFunding = (store: Store) => async ({targetChannelId, ledgerChannelId}: Init) => {
  const funding: Funding = {type: 'Indirect', ledgerId: ledgerChannelId};
  await store.setFunding(targetChannelId, funding);
};

const services = (store: Store): Record<Services, ServiceConfig<Init>> => ({
  checkTarget: checkTarget(store),
  getTargetOutcome: getTargetOutcome(store),
  updateFunding: updateFunding(store),
  supportState: SupportState.machine(store),
  acquireLock: acquireLock(store)
});

const actions = {
  escalateError: escalate(({error}) => ({type: 'FAILURE', error})),
  releaseLock: (ctx: WithLock) => ctx.lock.release()
};

const options = (store: Store) => ({services: services(store), actions});

export const machine = (store: Store) => Machine(config, options(store));

import {Machine, MachineConfig, ServiceConfig, assign, DoneInvokeEvent} from 'xstate';

import {SupportState} from '.';
import {Store, Errors as StoreErrors} from '../store';
import {allocateToTarget, isSimpleEthAllocation} from '../utils/outcome';
import {AllocationItem} from '../store/types';
import {getDataAndInvoke, checkThat} from '../utils';
import {Funding, ChannelLock} from '../store/memory-store';
import {add} from '../utils/math-utils';
import {assignError} from '../utils/workflow-utils';
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
  acquireLock = 'acquireLock',
  releaseLock = 'releaseLock'
}

export const enum Errors {
  underfunded = 'Ledger channel is underfunded',
  underallocated = 'Ledger channel is underallocated',
  finalized = 'Ledger channel is finalized'
}

const FAILURE = `#${WORKFLOW}.failure`;
const onError = {target: FAILURE};

const fundingTarget = getDataAndInvoke(
  {src: Services.getTargetOutcome, opts: {onError}},
  {src: Services.supportState, opts: {onError}},
  'releasingLock'
);

export const config: MachineConfig<any, any, any> = {
  key: WORKFLOW,
  initial: 'acquiringLock',
  states: {
    acquiringLock: {
      invoke: {src: Services.acquireLock, onDone: 'fundingTarget'},
      exit: assign<WithLock>({lock: (_, event: DoneInvokeEvent<ChannelLock>) => event.data})
    },
    fundingTarget,
    releasingLock: {
      invoke: {src: Services.releaseLock, onDone: 'updatingFunding', onError: 'updatingFunding'}
    },
    updatingFunding: {invoke: {src: Services.updateFunding, onDone: 'success'}},
    success: {type: 'final'},
    failure: {
      entry: [assignError, 'escalateError'],
      invoke: {src: Services.releaseLock}
    }
  }
};

import {filter, first, map} from 'rxjs/operators';
const acquireLock = (store: Store) => async (ctx: Init): Promise<ChannelLock> => {
  try {
    return await store.acquireChannelLock(ctx.ledgerChannelId);
  } catch (e) {
    if (e.message === StoreErrors.channelLocked) {
      return await store.lockFeed
        .pipe(
          filter(s => s.channelId === ctx.ledgerChannelId),
          first(s => !s.lock),
          map(async s => await store.acquireChannelLock(ctx.ledgerChannelId))
        )
        .toPromise();
    } else throw e;
  }
};

type WithLock = Init & {lock: ChannelLock};
const releaseLock = (store: Store) => async (ctx: WithLock): Promise<void> => {
  await store.releaseChannelLock(ctx.lock);
};

const getTargetOutcome = (store: Store) => async (ctx: Init): Promise<SupportState.Init> => {
  // TODO: Switch to feed
  const {targetChannelId, ledgerChannelId, deductions} = ctx;
  const {supported: ledgerState, channelConstants} = await store.getEntry(ledgerChannelId);

  const {amount, finalized} = await store.chain.getChainInfo(ledgerChannelId);

  const currentlyAllocated = checkThat(ledgerState.outcome, isSimpleEthAllocation)
    .allocationItems.map(i => i.amount)
    .reduce(add);
  const toDeduct = deductions.map(i => i.amount).reduce(add);

  if (amount.lt(currentlyAllocated)) throw new Error(Errors.underfunded);
  if (finalized) throw new Error(Errors.finalized);
  if (currentlyAllocated.lt(toDeduct)) throw new Error(Errors.underallocated);

  return {
    state: {
      ...channelConstants,
      ...ledgerState,
      turnNum: ledgerState.turnNum.add(1),
      outcome: allocateToTarget(ledgerState.outcome, deductions, targetChannelId)
    }
  };
};

const updateFunding = (store: Store) => async ({targetChannelId, ledgerChannelId}: Init) => {
  const funding: Funding = {type: 'Indirect', ledgerId: ledgerChannelId};
  await store.setFunding(targetChannelId, funding);
};

const services = (store: Store): Record<Services, ServiceConfig<Init>> => ({
  getTargetOutcome: getTargetOutcome(store),
  updateFunding: updateFunding(store),
  supportState: SupportState.machine(store),
  acquireLock: acquireLock(store),
  releaseLock: releaseLock(store)
});

const actions = {
  escalateError: escalate(({error}) => ({type: 'FAILURE', error}))
};

const options = (store: Store) => ({services: services(store), actions});

export const machine = (store: Store) => Machine(config, options(store));

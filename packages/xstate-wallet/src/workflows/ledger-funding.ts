import {Machine, MachineConfig, ServiceConfig} from 'xstate';

import {SupportState} from '.';
import {Store} from '../store';
import {allocateToTarget, isSimpleEthAllocation} from '../utils/outcome';
import {AllocationItem} from '../store/types';
import {getDataAndInvoke, checkThat} from '../utils';
import {Funding} from '../store/memory-store';
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
  {src: 'getTargetOutcome', opts: {onError}},
  {src: 'supportState', opts: {onError}},
  'releasingLock'
);

export const config: MachineConfig<any, any, any> = {
  key: WORKFLOW,
  initial: 'acquiringLock',
  states: {
    acquiringLock: {
      invoke: {src: Services.acquireLock, onDone: 'fundingTarget'},
      exit: 'assignLock'
    },
    fundingTarget,
    releasingLock: {invoke: {src: Services.releaseLock, onDone: 'updatingFunding'}},
    updatingFunding: {invoke: {src: Services.updateFunding, onDone: 'success'}},
    success: {type: 'final'},
    failure: {entry: [assignError, escalate(({error}) => ({type: 'FAILURE', error}))]}
  }
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
  acquireLock: () => Promise.resolve(),
  releaseLock: () => Promise.resolve()
});

const options = (store: Store) => ({services: services(store)});

export const machine = (store: Store) => Machine(config, options(store));

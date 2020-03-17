import {Machine, MachineConfig, ServiceConfig} from 'xstate';

import {SupportState} from '.';
import {Store} from '../store';
import {allocateToTarget} from '../utils/outcome';
import {AllocationItem} from '../store/types';
import {getDataAndInvoke} from '../utils';
import {Funding} from '../store';

const WORKFLOW = 'ledger-funding';

export interface Init {
  targetChannelId: string;
  ledgerChannelId: string;
  deductions: AllocationItem[];
}

const checkLedger = {
  invoke: {src: 'checkLedger', onDone: 'fundTarget'}
};
const FAILURE = `#${WORKFLOW}.failure`;
const fundTarget = getDataAndInvoke(
  {src: 'getTargetOutcome'},
  {src: 'supportState', opts: {onError: FAILURE}},
  'updateFunding'
);
const updateFunding = {invoke: {src: 'updateFunding', onDone: 'success'}};

export const config: MachineConfig<any, any, any> = {
  key: WORKFLOW,
  initial: 'checkLedger',
  states: {
    checkLedger,
    fundTarget,
    updateFunding,
    success: {type: 'final'},
    failure: {}
  }
};

const enum Services {
  checkLedger = 'checkLedger',
  getTargetOutcome = 'getTargetOutcome',
  updateFunding = 'updateFunding',
  supportState = 'supportState'
}

export const machine = (store: Store) => {
  async function getTargetOutcome({
    targetChannelId,
    ledgerChannelId,
    deductions
  }: Init): Promise<SupportState.Init> {
    // TODO: Switch to feed
    const {latest: ledgerState, channelConstants} = await store.getEntry(ledgerChannelId);

    return {
      state: {
        ...channelConstants,
        ...ledgerState,
        turnNum: ledgerState.turnNum.add(1),
        outcome: allocateToTarget(ledgerState.outcome, deductions, targetChannelId)
      }
    };
  }

  async function updateFunding({targetChannelId, ledgerChannelId}: Init) {
    const funding: Funding = {type: 'Indirect', ledgerId: ledgerChannelId};
    await store.setFunding(targetChannelId, funding);
  }

  const services: Record<Services, ServiceConfig<Init>> = {
    checkLedger: () => Promise.resolve(), // TODO
    getTargetOutcome,
    updateFunding,
    supportState: SupportState.machine(store)
  };

  return Machine(config, {services});
};

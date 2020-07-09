import {
  StateNodeConfig,
  ServiceConfig,
  AnyEventObject,
  Machine,
  AssignAction,
  StateMachine,
  DoneInvokeEvent,
  assign,
  ConditionPredicate,
  ActionTypes
} from 'xstate';
import {
  SimpleAllocation,
  Objective,
  Participant,
  StateVariables,
  checkThat,
  isSimpleEthAllocation,
  add
} from '@statechannels/wallet-core';
import {Zero} from '@ethersproject/constants';

import {Store} from '../store';
import {SupportState} from '.';
import {CHALLENGE_DURATION} from '../config';
import * as Depositing from './depositing';
import {getDataAndInvoke} from '../utils';

type WorkflowActions = {
  assignChannelId: AssignAction<WorkflowContext, DoneInvokeEvent<string>>;
};
type WorkflowGuards = {
  doesChannelIdExist: ConditionPredicate<WorkflowContext, WorkflowEvent>;
};
export type WorkflowEvent = AnyEventObject;
export type WorkflowContext = {
  initialOutcome: SimpleAllocation;
  participants: Participant[];
  ledgerId?: string;
};
export type LedgerIdExists = WorkflowContext & {ledgerId: string};
export interface WorkflowServices extends Record<string, ServiceConfig<WorkflowContext>> {
  createObjective: (context: LedgerIdExists, event: any) => Promise<void>;
  initializeChannel: (context: WorkflowContext, event: WorkflowEvent) => Promise<string>;
  supportState: StateMachine<any, any, any>;
  getPreFundState: (context: LedgerIdExists, event: WorkflowEvent) => Promise<SupportState.Init>;
  depositing: StateMachine<any, any, any>;
  getDepositingInfo: (context: LedgerIdExists, event: any) => Promise<Depositing.Init>;
}

export const config: StateNodeConfig<WorkflowContext, any, any> = {
  initial: 'isChannelIdDefined',
  on: {[ActionTypes.ErrorCustom]: {target: 'failure'}},
  states: {
    isChannelIdDefined: {
      on: {
        '': [{cond: 'doesChannelIdExist', target: 'supportPreFundState'}, {target: 'initialize'}]
      }
    },
    initialize: {
      initial: 'initializeChannel',

      states: {
        initializeChannel: {
          invoke: {
            src: 'initializeChannel',
            onDone: {target: 'createObjective', actions: ['assignChannelId']}
          }
        },
        createObjective: {
          invoke: {
            src: 'createObjective',

            onDone: [{target: 'done'}]
          }
        },
        done: {type: 'final'}
      },
      onDone: 'supportPreFundState'
    },

    supportPreFundState: getDataAndInvoke<WorkflowContext, any>(
      {src: 'getPreFundState'},
      {src: 'supportState'},
      'fundChannel'
    ),

    fundChannel: getDataAndInvoke<WorkflowContext, any>(
      {src: 'getDepositingInfo'},
      {src: 'depositing'},
      'done'
    ),

    done: {type: 'final'},
    failure: {type: 'final'}
  }
};

const initializeChannel = (
  store: Store
): WorkflowServices['initializeChannel'] => async context => {
  const {initialOutcome: outcome} = context;
  const stateVars: StateVariables = {outcome, turnNum: 0, isFinal: false, appData: '0x0'};
  const entry = await store.createChannel(context.participants, CHALLENGE_DURATION, stateVars);
  await store.setFunding(entry.channelId, {type: 'Direct'});
  await store.setLedger(entry.channelId);
  return entry.channelId;
};

const createObjective = (store: Store): WorkflowServices['createObjective'] => async context => {
  const objective: Objective = {
    type: 'FundLedger',
    participants: context.participants,
    data: {ledgerId: context.ledgerId}
  };
  return store.addObjective(objective);
};
const getPreFundState = (store: Store): WorkflowServices['getPreFundState'] => async context => {
  const {latestState} = await store.getEntry(context.ledgerId);
  return {state: latestState};
};

const getDepositingInfo = (
  store: Store
): WorkflowServices['getDepositingInfo'] => async context => {
  const {supported, myIndex} = await store.getEntry(context.ledgerId);
  const {allocationItems} = checkThat(supported?.outcome, isSimpleEthAllocation);

  const fundedAt = allocationItems.map(a => a.amount).reduce(add);
  const depositAt = myIndex === 0 ? allocationItems[0].amount : Zero;
  return {channelId: context.ledgerId, depositAt, totalAfterDeposit: fundedAt, fundedAt};
};

export const options = (
  store: Store
): {actions: WorkflowActions; services: WorkflowServices; guards: WorkflowGuards} => ({
  actions: {
    assignChannelId: assign({
      ledgerId: (_, event: DoneInvokeEvent<string>) => event.data
    })
  },
  guards: {
    doesChannelIdExist: (context: WorkflowContext) => !!context.ledgerId
  },
  services: {
    initializeChannel: initializeChannel(store),
    supportState: SupportState.machine(store),
    createObjective: createObjective(store),
    depositing: Depositing.machine(store),
    getDepositingInfo: getDepositingInfo(store),
    getPreFundState: getPreFundState(store)
  }
});

export const mockGuards: WorkflowGuards = {
  doesChannelIdExist: () => true
};

export const mockOptions = {guards: mockGuards};

export const createAndFundLedgerWorkflow = (store: Store, context: WorkflowContext) =>
  Machine(config)
    .withConfig(options(store))
    .withContext(context);

import {
  Machine,
  MachineOptions,
  AnyEventObject,
  DoneInvokeEvent,
  ServiceConfig,
  assign,
  StateNodeConfig,
  sendParent
} from 'xstate';
import {filter, map, take, flatMap, tap} from 'rxjs/operators';

import {Store, supportedStateFeed} from '../store/memory-store';
import {SupportState, LedgerFunding} from '.';
import {checkThat, getDataAndInvoke} from '../utils';
import {simpleEthGuarantee, isSimpleEthAllocation, simpleEthAllocation} from '../utils/outcome';

import {FundGuarantor, AllocationItem} from '../store/types';

import {bigNumberify} from 'ethers/utils';
import {CHALLENGE_DURATION} from '../constants';
import _ from 'lodash';
import {assignError} from '../utils/workflow-utils';

export const enum Role {
  A = 0,
  Hub = 1,
  B = 2
}

export type Init = {
  targetChannelId: string;
  jointChannelId: string;
};

type Deductions = {deductions: AllocationItem[]};
type WithDeductions = Init & Deductions;

const getObjective = (store: Store) => async ({jointChannelId}: Init): Promise<FundGuarantor> => {
  const entry = await store.getEntry(jointChannelId);
  const {participants: jointParticipants} = entry.channelConstants;
  const participants = [jointParticipants[entry.myIndex], jointParticipants[Role.Hub]];

  const {channelId: ledgerId} = await store.getLedger(jointParticipants[Role.Hub].participantId);
  const {channelId: guarantorId} = await store.createChannel(participants, CHALLENGE_DURATION, {
    turnNum: bigNumberify(0),
    appData: '0x',
    isFinal: false,
    outcome: simpleEthGuarantee(jointChannelId, ...participants.map(p => p.destination))
  });

  return {
    type: 'FundGuarantor',
    participants,
    data: {jointChannelId, ledgerId, guarantorId}
  };
};

type TEvent = AnyEventObject;

const enum Actions {
  triggerGuarantorObjective = 'triggerGuarantorObjective',
  assignDeductions = 'assignDeductions'
}

export const enum States {
  determineDeductions = 'determineDeductions',
  setupJointChannel = 'setupJointChannel',
  fundJointChannel = 'fundJointChannel',
  fundTargetChannel = 'fundTargetChannel',
  failure = '#workflow.failure',
  success = 'success'
}

const enum Services {
  getDeductions = 'getDeductions',
  waitForFirstJointState = 'waitForFirstJointState',
  jointChannelUpdate = 'jointChannelUpdate',
  supportState = 'supportState',
  ledgerFunding = 'ledgerFunding',
  fundGuarantor = 'fundGuarantor'
}

export const config: StateNodeConfig<Init, any, any> = {
  key: 'virtual-funding-as-leaf',
  id: 'workflow',
  initial: States.setupJointChannel,
  states: {
    [States.setupJointChannel]: getDataAndInvoke<Init, Services>(
      {src: Services.waitForFirstJointState, opts: {onError: '#workflow.failure'}},
      {src: Services.supportState},
      States.determineDeductions
    ),
    [States.determineDeductions]: {
      invoke: {src: Services.getDeductions, data: ctx => ctx, onDone: States.fundJointChannel},
      exit: Actions.assignDeductions
    },
    [States.fundJointChannel]: {
      initial: 'getObjective',
      states: {
        getObjective: {invoke: {src: Services.fundGuarantor, onDone: 'runObjective'}},
        runObjective: {
          entry: Actions.triggerGuarantorObjective,
          invoke: {
            src: Services.ledgerFunding,
            data: (
              ctx: WithDeductions,
              {data}: DoneInvokeEvent<FundGuarantor>
            ): LedgerFunding.Init => ({
              targetChannelId: data.data.guarantorId,
              ledgerChannelId: data.data.ledgerId,
              deductions: ctx.deductions
            }),
            onDone: 'done'
          }
        },
        done: {type: 'final'}
      },
      onDone: States.fundTargetChannel
    },
    [States.fundTargetChannel]: getDataAndInvoke(
      {src: Services.jointChannelUpdate},
      {src: Services.supportState},
      States.success
    ),
    success: {type: 'final'},
    failure: {
      entry: [assignError, sendParent(({error}) => ({type: 'FAILURE', error}))]
    }
  }
};

export const waitForFirstJointState = (store: Store) => ({
  jointChannelId
}: Init): Promise<SupportState.Init> =>
  store
    .channelUpdatedFeed(jointChannelId)
    .pipe(
      flatMap(e => e.states),
      filter(({turnNum}) => turnNum.eq(0)),
      tap(({outcome, participants}) => {
        const {allocationItems} = checkThat(outcome, isSimpleEthAllocation);
        const destinations = allocationItems.map(i => i.destination);
        const amounts = allocationItems.map(i => i.amount);

        if (
          destinations[Role.A] === participants[Role.A].destination &&
          destinations[Role.Hub] === participants[Role.Hub].destination &&
          destinations[Role.B] === participants[Role.B].destination &&
          amounts[Role.A].add(amounts[Role.B]).eq(amounts[Role.Hub])
        ) {
          return;
        } else throw new Error('Invalid first state');
      }),
      map(s => ({state: s})),
      take(1)
    )
    .toPromise();

export const jointChannelUpdate = (store: Store) => ({
  jointChannelId,
  targetChannelId
}: Init): Promise<SupportState.Init> =>
  supportedStateFeed(store, jointChannelId)
    .pipe(
      filter(({state}) => state.turnNum.eq(0)),
      map(({state}) => {
        const oldOutcome = checkThat(state.outcome, isSimpleEthAllocation);
        const amount = oldOutcome.allocationItems[Role.Hub].amount;
        const outcome = simpleEthAllocation([
          {destination: targetChannelId, amount},
          {destination: state.participants[Role.Hub].destination, amount}
        ]);
        return {state: {...state, turnNum: bigNumberify(1), outcome}};
      }),
      take(1)
    )
    .toPromise();

const getDeductions = (store: Store) => async (ctx: Init): Promise<Deductions> => {
  const {latest, myIndex} = await store.getEntry(ctx.jointChannelId);
  const {allocationItems} = checkThat(latest.outcome, isSimpleEthAllocation);

  return {
    deductions: [
      {
        destination: allocationItems[1].destination,
        amount: allocationItems[2 - myIndex].amount
      },
      allocationItems[myIndex]
    ]
  };
};

export const options = (
  store: Store
): Pick<MachineOptions<Init, TEvent>, 'actions' | 'services'> => {
  const actions: Record<Actions, any> = {
    [Actions.triggerGuarantorObjective]: (_, {data}: DoneInvokeEvent<FundGuarantor>) =>
      store.addObjective(data),
    [Actions.assignDeductions]: assign(
      (ctx: Init, {data}: DoneInvokeEvent<Deductions>): WithDeductions => ({
        ...ctx,
        ...data
      })
    )
  };

  const services: Record<Services, ServiceConfig<Init>> = {
    getDeductions: getDeductions(store),
    supportState: SupportState.machine(store as any),
    ledgerFunding: LedgerFunding.machine(store),
    waitForFirstJointState: waitForFirstJointState(store),
    jointChannelUpdate: jointChannelUpdate(store),
    fundGuarantor: getObjective(store)
  };

  return {actions, services};
};

export const machine = (store: Store) => Machine(config, options(store));

import {
  Machine,
  MachineOptions,
  AnyEventObject,
  DoneInvokeEvent,
  ServiceConfig,
  assign,
  StateNodeConfig,
  ActionTypes
} from 'xstate';
import {filter, map, take, flatMap, tap, first} from 'rxjs/operators';

import {Store, supportedStateFeed} from '@statechannels/wallet-core/lib/src/store';
import {
  checkThat,
  getDataAndInvoke,
  simpleEthGuarantee,
  isSimpleEthAllocation,
  simpleEthAllocation,
  makeDestination
} from '@statechannels/wallet-core/lib/src/utils';

import {FundGuarantor, AllocationItem} from '@statechannels/wallet-core/lib/src/store/types';

import {CHALLENGE_DURATION} from '../config';

import {escalate} from '../actions';
import {SupportState, LedgerFunding} from '.';
import {assignError} from '../utils/workflow-utils';

export const enum OutcomeIdx {
  A = 0,
  Hub = 1,
  B = 2
}
export const enum ParticipantIdx {
  A = 0,
  B = 1,
  Hub = 2
}

export type Init = {
  targetChannelId: string;
  jointChannelId: string;
};

type Deductions = {deductions: AllocationItem[]};
type WithDeductions = Init & Deductions;
type WithObjectiveData = WithDeductions & {guarantorChannelId: string; ledgerId: string};

const getFundGuarantorObjective = (store: Store) => async (ctx: Init): Promise<FundGuarantor> => {
  const {jointChannelId, targetChannelId} = ctx;
  const entry = await store.getEntry(jointChannelId);
  const {participants: jointParticipants} = entry.channelConstants;
  const participants = [jointParticipants[entry.myIndex], jointParticipants[ParticipantIdx.Hub]];

  const {channelId: ledgerId} = await store.getLedger(
    jointParticipants[ParticipantIdx.Hub].participantId
  );
  const {channelId: guarantorId} = await store.createChannel(participants, CHALLENGE_DURATION, {
    turnNum: 0,
    appData: '0x',
    isFinal: false,
    outcome: simpleEthGuarantee(
      jointChannelId,
      targetChannelId,
      ...participants.map(p => p.destination)
    )
  });

  // TODO: We never actually check that the guarantor channel's state is supported.

  return {
    type: 'FundGuarantor',
    participants,
    data: {jointChannelId, ledgerId, guarantorId}
  };
};

type TEvent = AnyEventObject;

const enum Actions {
  triggerGuarantorObjective = 'triggerGuarantorObjective',
  assignDeductions = 'assignDeductions',
  assignGuarantorId = 'assignGuarantorId'
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
  waitForSupportedGuarantorState = 'waitForSupportedGuarantorState',
  waitForFirstJointState = 'waitForFirstJointState',
  jointChannelUpdate = 'jointChannelUpdate',
  supportState = 'supportState',
  ledgerFunding = 'ledgerFunding',
  fundGuarantor = 'fundGuarantor',
  updateJointChannelFunding = 'updateJointChannelFunding'
}

const waitForSupportedGuarantorState = (store: Store) => async (ctx: WithObjectiveData) =>
  store
    .channelUpdatedFeed(ctx.guarantorChannelId)
    .pipe(
      filter(u => u.isSupported),
      first()
    )
    .toPromise();

export const config: StateNodeConfig<Init, any, any> = {
  key: 'virtual-funding-as-leaf',
  id: 'workflow',
  initial: States.setupJointChannel,
  on: {
    [ActionTypes.ErrorCustom]: '#workflow.failure'
  },
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
        getObjective: {
          invoke: {
            src: Services.fundGuarantor,
            onDone: 'preparingGuarantorChannel',
            onError: '#workflow.failure'
          },
          exit: [Actions.triggerGuarantorObjective, Actions.assignGuarantorId]
        },
        preparingGuarantorChannel: {
          invoke: {src: Services.waitForSupportedGuarantorState, onDone: 'runObjective'}
        },
        runObjective: {
          invoke: {
            src: Services.ledgerFunding,
            data: (ctx: WithObjectiveData): LedgerFunding.Init => ({
              targetChannelId: ctx.guarantorChannelId,
              ledgerChannelId: ctx.ledgerId,
              deductions: ctx.deductions
            }),
            onDone: 'updateFunding'
          }
        },
        updateFunding: {invoke: {src: Services.updateJointChannelFunding, onDone: 'done'}},
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
      entry: [assignError, escalate(({error}: any) => ({type: 'FAILURE', error}))]
    }
  }
};

export const waitForFirstJointState = (store: Store) => ({
  jointChannelId
}: Init): Promise<SupportState.Init> =>
  store
    .channelUpdatedFeed(jointChannelId)
    .pipe(
      flatMap(e => e.sortedStates),
      filter(({turnNum}) => turnNum === 0),
      tap(({outcome, participants}) => {
        const {allocationItems} = checkThat(outcome, isSimpleEthAllocation);
        const destinations = allocationItems.map(i => i.destination);
        const amounts = allocationItems.map(i => i.amount);

        if (
          !(
            destinations[OutcomeIdx.A] === participants[ParticipantIdx.A].destination &&
            destinations[OutcomeIdx.B] === participants[ParticipantIdx.B].destination &&
            destinations[OutcomeIdx.Hub] === participants[ParticipantIdx.Hub].destination
          )
        ) {
          throw new Error('Incorrect participants');
        } else if (!amounts[OutcomeIdx.A].add(amounts[OutcomeIdx.B]).eq(amounts[OutcomeIdx.Hub])) {
          throw new Error('Incorrect allocation');
        } else return;
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
      filter(({state}) => state.turnNum === 0),
      map(({state}) => {
        const oldOutcome = checkThat(state.outcome, isSimpleEthAllocation);
        const amount = oldOutcome.allocationItems[OutcomeIdx.Hub].amount;
        const outcome = simpleEthAllocation([
          {destination: makeDestination(targetChannelId), amount},
          {destination: state.participants[ParticipantIdx.Hub].destination, amount}
        ]);
        return {state: {...state, turnNum: 1, outcome}};
      }),
      take(1)
    )
    .toPromise();

const getDeductions = (store: Store) => async (ctx: Init): Promise<Deductions> => {
  const {latestSignedByMe: latestSupportedByMe, myIndex} = await store.getEntry(ctx.jointChannelId);
  const {allocationItems} = checkThat(latestSupportedByMe.outcome, isSimpleEthAllocation);

  const outcomeIdx = myIndex === ParticipantIdx.A ? OutcomeIdx.A : OutcomeIdx.B;

  return {
    deductions: [
      {
        destination: allocationItems[OutcomeIdx.Hub].destination,
        amount: allocationItems[2 - outcomeIdx].amount
      },
      allocationItems[outcomeIdx]
    ]
  };
};

const updateJointChannelFunding = (store: Store) => async (ctx: WithObjectiveData) => {
  const {jointChannelId, guarantorChannelId} = ctx;
  await store.setFunding(jointChannelId, {type: 'Guarantee', guarantorChannelId});
};

export const options = (
  store: Store
): Pick<MachineOptions<Init, TEvent>, 'actions' | 'services'> => {
  const actions: Record<Actions, any> = {
    [Actions.triggerGuarantorObjective]: (_, {data}: DoneInvokeEvent<FundGuarantor>) =>
      store.addObjective(data),
    [Actions.assignDeductions]: assign(
      (ctx: Init, {data}: DoneInvokeEvent<Deductions>): WithDeductions => ({...ctx, ...data})
    ),
    [Actions.assignGuarantorId]: assign({
      guarantorChannelId: (_, {data}: DoneInvokeEvent<FundGuarantor>) => data.data.guarantorId,
      ledgerId: (_, {data}: DoneInvokeEvent<FundGuarantor>) => data.data.ledgerId
    })
  };

  const services: Record<Services, ServiceConfig<Init>> = {
    waitForSupportedGuarantorState: waitForSupportedGuarantorState(store),
    getDeductions: getDeductions(store),
    supportState: SupportState.machine(store),
    ledgerFunding: LedgerFunding.machine(store),
    waitForFirstJointState: waitForFirstJointState(store),
    jointChannelUpdate: jointChannelUpdate(store),
    fundGuarantor: getFundGuarantorObjective(store),
    updateJointChannelFunding: updateJointChannelFunding(store)
  };

  return {actions, services};
};

export const machine = (store: Store) => Machine(config, options(store));

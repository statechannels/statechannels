import {
  StateNodeConfig,
  MachineConfig,
  Machine,
  MachineOptions,
  AnyEventObject,
  DoneInvokeEvent,
  ServiceConfig,
  assign,
  spawn,
  AssignAction
} from 'xstate';
import {filter, flatMap} from 'rxjs/operators';

import {Store, State} from '@statechannels/wallet-core/lib/src/store';
import {checkThat, isSimpleEthAllocation} from '@statechannels/wallet-core/lib/src/utils';

import {
  FundGuarantor,
  AllocationItem,
  isFundGuarantor,
  Participant
} from '@statechannels/wallet-core/lib/src/store/types';

import {Observable} from 'rxjs';
import {ParticipantIdx, States, OutcomeIdx} from './virtual-funding-as-leaf';
import {LedgerFunding, VirtualFundingAsLeaf, SupportState} from '.';

type RoleData = {
  ledgerId: string;
  guarantorId: string;
  guarantorState: State;
};
type Deductions = {
  [ParticipantIdx.A]: AllocationItem[];
  [ParticipantIdx.B]: AllocationItem[];
};
export type Init = VirtualFundingAsLeaf.Init & {
  [ParticipantIdx.A]: Partial<RoleData>;
  [ParticipantIdx.B]: Partial<RoleData>;
};

type WithDeductions = Init & {deductions: Deductions};

type TEvent = AnyEventObject;

const enum Actions {
  assignDeductions = 'assignDeductions',
  watchObjectives = 'watchObjectives'
}

const enum Services {
  getDeductions = 'getDeductions',
  waitForFirstJointState = 'waitForFirstJointState',
  jointChannelUpdate = 'jointChannelUpdate',
  supportState = 'supportState',
  ledgerFunding = 'ledgerFunding'
}

const enum Events {
  FundGuarantorWithA = 'FundGuarantorWithA',
  FundGuarantorWithB = 'FundGuarantorWithB'
}

type Objective = Pick<FundGuarantor, 'data' | 'participants'> & {state: State; type: Events};
const assignObjectiveData = (
  role: ParticipantIdx.A | ParticipantIdx.B
): AssignAction<Init, Objective> =>
  assign<Init>({
    [role]: (_, {data, state}: Objective): RoleData => ({
      guarantorId: data.guarantorId,
      ledgerId: data.ledgerId,
      guarantorState: state
    })
  });

const waitThenFundGuarantor = (
  role: ParticipantIdx.A | ParticipantIdx.B
): StateNodeConfig<any, any, any> => {
  const event = role === ParticipantIdx.A ? Events.FundGuarantorWithA : Events.FundGuarantorWithB;
  return {
    initial: 'waitForObjective',
    states: {
      waitForObjective: {
        on: {[event]: {target: 'supportingGuarantorState', actions: assignObjectiveData(role)}}
      },
      supportingGuarantorState: {
        invoke: {
          src: Services.supportState,
          data: (ctx: Init): SupportState.Init => ({state: (ctx[role] as RoleData).guarantorState}),
          onDone: 'runObjective'
        }
      },
      runObjective: {
        invoke: {
          src: Services.ledgerFunding,
          data: (ctx: WithDeductions): LedgerFunding.Init => {
            // We know that the data has already been assigned in the
            // transition out of waitForObjective
            const {guarantorId: targetChannelId, ledgerId: ledgerChannelId} = ctx[role] as RoleData;
            const deductions = ctx.deductions[role];
            return {targetChannelId, ledgerChannelId, deductions};
          },
          onDone: 'done'
        }
      },
      done: {type: 'final'}
    }
  };
};

export const config: MachineConfig<Init, any, any> = {
  key: 'virtual-funding-as-hub',
  id: 'workflow',
  initial: States.setupJointChannel,
  states: {
    ...VirtualFundingAsLeaf.config.states,
    [States.fundJointChannel]: {
      type: 'parallel',
      entry: [Actions.watchObjectives, Actions.assignDeductions],
      states: {
        fundGuarantorAH: waitThenFundGuarantor(ParticipantIdx.A),
        fundGuarantorBH: waitThenFundGuarantor(ParticipantIdx.B)
      },
      onDone: States.fundTargetChannel
    }
  }
};

const getDeductions = (store: Store) => async (ctx: Init): Promise<Deductions> => {
  const entry = await store.getEntry(ctx.jointChannelId);
  const {latestSignedByMe: latestSupportedByMe} = entry;
  const {allocationItems} = checkThat(latestSupportedByMe.outcome, isSimpleEthAllocation);

  return {
    [ParticipantIdx.A]: [
      {
        destination: allocationItems[OutcomeIdx.Hub].destination,
        amount: allocationItems[OutcomeIdx.B].amount
      },
      allocationItems[OutcomeIdx.A]
    ],
    [ParticipantIdx.B]: [
      {
        destination: allocationItems[OutcomeIdx.Hub].destination,
        amount: allocationItems[OutcomeIdx.A].amount
      },
      allocationItems[OutcomeIdx.B]
    ]
  };
};

const watchObjectives = (store: Store) => (ctx: Init): Observable<Objective> =>
  store.objectiveFeed.pipe(
    filter(isFundGuarantor),
    filter(o => o.data.jointChannelId === ctx.jointChannelId),
    flatMap(async o => {
      const participant = o.participants[0].participantId;
      const jointParticipants: Participant[] = await (await store.getEntry(ctx.jointChannelId))
        .channelConstants.participants;

      const {latest} = await store.getEntry(o.data.guarantorId);

      switch (participant) {
        case jointParticipants[ParticipantIdx.A].participantId:
          return {...o, type: Events.FundGuarantorWithA, state: latest};
        case jointParticipants[ParticipantIdx.B].participantId:
          return {...o, type: Events.FundGuarantorWithB, state: latest};
        default:
          throw 'Participant not found';
      }
    })
  );

export const options = (store: Store): Partial<MachineOptions<Init, TEvent>> => {
  const actions: Record<Actions, any> = {
    watchObjectives: assign<any>({watcher: (ctx: Init) => spawn(watchObjectives(store)(ctx))}),
    [Actions.assignDeductions]: assign({
      deductions: (_, {data}: DoneInvokeEvent<Deductions>) => data
    })
  };

  const leafServices = VirtualFundingAsLeaf.options(store).services;
  const services: Record<Services, ServiceConfig<Init>> = {
    getDeductions: getDeductions(store),
    supportState: leafServices.supportState,
    ledgerFunding: leafServices.ledgerFunding,
    waitForFirstJointState: leafServices.waitForFirstJointState,
    jointChannelUpdate: leafServices.jointChannelUpdate
  };

  return {actions, services};
};

export const machine = (store: Store) => Machine(config, options(store));

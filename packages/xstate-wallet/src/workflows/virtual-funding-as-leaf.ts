import {
  Machine,
  MachineOptions,
  AnyEventObject,
  DoneInvokeEvent,
  ServiceConfig,
  assign,
  spawn,
  StateNodeConfig
} from 'xstate';
import {filter, map, take, flatMap, tap} from 'rxjs/operators';

import {Store, supportedStateFeed} from '../store/memory-store';
import {SupportState, LedgerFunding} from '.';
import {checkThat, getDataAndInvoke} from '../utils';
import {simpleEthGuarantee, isSimpleEthAllocation, simpleEthAllocation} from '../utils/outcome';

import {FundGuarantor, AllocationItem, isFundGuarantor, Participant} from '../store/types';

import {bigNumberify} from 'ethers/utils';
import {CHALLENGE_DURATION} from '../constants';
import _ from 'lodash';

export const enum Role {
  A = 0,
  Hub = 1,
  B = 2
}

export type Init = {
  targetChannelId: string;
  jointChannelId: string;
};

type Deductions =
  | {
      role: Role.A | Role.B;
      deductions: AllocationItem[];
    }
  | {
      role: Role.Hub;
      deductions: {
        [Role.A]: AllocationItem[];
        [Role.B]: AllocationItem[];
      };
    };
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
  assignDeductions = 'assignDeductions',
  watchObjectives = 'watchObjectives'
}

const enum States {
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
const enum Events {
  FundGuarantorWithA = 'FundGuarantorWithA',
  FundGuarantorWithB = 'FundGuarantorWithB'
}

export const config: StateNodeConfig<Init, any, any> = {
  key: 'virtual-funding',
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
            ): LedgerFunding.Init => {
              if (ctx.role === Role.Hub) throw 'Incorrect role';
              return {
                targetChannelId: data.data.guarantorId,
                ledgerChannelId: data.data.ledgerId,
                deductions: ctx.deductions
              };
            },
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
    failure: {}
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
        } else throw 'Invalid first state';
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

  switch (myIndex) {
    case Role.A:
    case Role.B:
      return {
        role: myIndex,
        deductions: [
          {
            destination: allocationItems[1].destination,
            amount: allocationItems[2 - myIndex].amount
          },
          allocationItems[myIndex]
        ]
      };
    case Role.Hub:
      return {
        role: myIndex,
        deductions: {
          [Role.A]: [
            {
              destination: allocationItems[Role.Hub].destination,
              amount: allocationItems[Role.B].amount
            },
            allocationItems[Role.A]
          ],
          [Role.B]: [
            {
              destination: allocationItems[Role.Hub].destination,
              amount: allocationItems[Role.A].amount
            },
            allocationItems[Role.B]
          ]
        }
      };

    default:
      throw 'Incorrect index';
  }
};

const watchObjectives = (store: Store) => (ctx: Init) => {
  return store.newObjectiveFeed.pipe(
    filter(isFundGuarantor),
    filter(o => o.data.jointChannelId === ctx.jointChannelId),
    flatMap(async o => {
      const participant = o.participants[0].participantId;
      const jointParticipants: Participant[] = await (await store.getEntry(ctx.jointChannelId))
        .channelConstants.participants;

      switch (participant) {
        case jointParticipants[Role.A].participantId:
          return {...o, type: Events.FundGuarantorWithA};
        case jointParticipants[Role.B].participantId:
          return {...o, type: Events.FundGuarantorWithB};
        default:
          throw 'Participant not found';
      }
    })
  );
};

export const options = (store: Store): Partial<MachineOptions<Init, TEvent>> => {
  const actions: Record<Actions, any> = {
    watchObjectives: assign<any>({watcher: (ctx: Init) => spawn(watchObjectives(store)(ctx))}),
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

export const machine = (store: Store, context: Init) =>
  Machine(config, options(store)).withContext(context);

import {Machine, MachineConfig, StateNodeConfig, ActionTypes} from 'xstate';

import {filter, map, first} from 'rxjs/operators';
import _ from 'lodash';
import {SimpleAllocation, isVirtuallyFund, StateVariables, Outcome} from '../store/types';

import {MachineFactory} from '../utils/workflow-utils';
import {Store} from '../store';
import * as Depositing from './depositing';
import {add} from '../utils/math-utils';
import {isSimpleEthAllocation, simpleEthAllocation} from '../utils/outcome';
import {checkThat, getDataAndInvoke} from '../utils';
import {SupportState, VirtualFundingAsLeaf} from '.';
import {from, Observable} from 'rxjs';
import {CHALLENGE_DURATION, HUB} from '../constants';
import {bigNumberify} from 'ethers/utils';
const PROTOCOL = 'create-and-fund';

export type Init = {
  allocation: SimpleAllocation;
  channelId: string;
};

const preFundSetup = getDataAndInvoke<Init, Service>(
  {src: 'getPreFundSetup'},
  {src: 'supportState'},
  'funding'
);

type TEvent = {type: 'UseVirtualFunding' | 'UseDirectFunding'};
const chooseFundingStrategy: StateNodeConfig<any, any, TEvent> = {
  invoke: {src: 'determineFunding'},
  on: {
    UseVirtualFunding: 'virtual',
    UseDirectFunding: 'direct'
  }
};

const direct: StateNodeConfig<any, any, any> = {
  initial: 'depositing',
  states: {
    depositing: getDataAndInvoke<Init, Service>(
      {src: 'getDepositingInfo'},
      {src: 'depositing'},
      'updateFunding'
    ),
    updateFunding: {invoke: {src: 'setFundingToDirect', onDone: 'done'}},
    done: {type: 'final'}
  },
  onDone: 'done'
};

const triggerObjective = (store: Store) => async (ctx: Init): Promise<void> => {
  const {channelConstants, supported: supportedState, myIndex} = await store.getEntry(
    ctx.channelId
  );
  if (myIndex !== 0) return;

  const {participants: targetParticipants} = channelConstants;
  const participants = [...targetParticipants, HUB];

  const {allocationItems} = checkThat(supportedState.outcome, isSimpleEthAllocation);

  const outcome: Outcome = simpleEthAllocation([
    allocationItems[0],
    {destination: HUB.destination, amount: allocationItems.map(i => i.amount).reduce(add)},
    allocationItems[1]
  ]);

  const stateVars: StateVariables = {
    turnNum: bigNumberify(0),
    outcome,
    appData: '0x',
    isFinal: false
  };

  const {channelId: jointChannelId} = await store.createChannel(
    participants,
    CHALLENGE_DURATION,
    stateVars
  );

  store.addObjective({
    type: 'VirtuallyFund',
    participants,
    data: {
      jointChannelId,
      targetChannelId: ctx.channelId
    }
  });
};

const virtual: StateNodeConfig<Init, any, any> = {
  initial: 'lockLedger',
  entry: triggerObjective.name,
  states: {
    lockLedger: {invoke: {src: 'acquireLock', onDone: 'running'}},
    running: getDataAndInvoke<Init, Service>(
      {src: 'getObjective'},
      {src: 'virtualFunding'},
      'updateFunding'
    ),
    releaseLedger: {invoke: {src: 'releaseLock', onDone: 'updateFunding'}},
    updateFunding: {invoke: {src: 'setFundingToVirtual', onDone: 'done'}},
    done: {type: 'final'}
  },
  onDone: 'done'
};

const postFundSetup = getDataAndInvoke<Init, Service>(
  {src: 'getPostFundSetup'},
  {src: 'supportState'},
  'success'
);

export const config: MachineConfig<Init, any, any> = {
  key: PROTOCOL,
  initial: 'preFundSetup',
  on: {[ActionTypes.ErrorCustom]: {target: 'failure'}},
  states: {
    preFundSetup,
    funding: {
      initial: 'chooseFundingStrategy',
      states: {
        chooseFundingStrategy,
        direct,
        virtual,
        done: {type: 'final'}
      },
      onDone: 'postFundSetup'
    },
    postFundSetup,
    success: {type: 'final'},
    failure: {}
  }
};

const acquireLock = (store: Store) => (): Promise<any> =>
  store.ledgerFeed
    .pipe(
      filter(s => s.participantId === HUB.participantId),
      first(s => !s.lock),
      map(async s => await store.lockLedger(s.participantId))
    )
    .toPromise();

const services = (store: Store) => ({
  depositing: Depositing.machine(store),
  supportState: SupportState.machine(store),
  virtualFunding: VirtualFundingAsLeaf.machine(store),
  getDepositingInfo: getDepositingInfo(store),
  getPreFundSetup: getPreFundSetup(store),
  getPostFundSetup: getPostFundSetup(store),
  determineFunding: determineFunding(store),
  setFundingToDirect: setFundingToDirect(store),
  setFundingToVirtual: setFundingToVirtual(store),
  getObjective: getObjective(store),
  acquireLock: acquireLock(store)
});

type Service = keyof ReturnType<typeof services>;

const options = (store: Store) => ({
  services: services(store),
  actions: {triggerObjective: triggerObjective(store)}
});

export const machine: MachineFactory<Init, any> = (store: Store, init: Init) => {
  return Machine(config).withConfig(options(store), init);
};

const getObjective = (store: Store) => (ctx: Init): Promise<VirtualFundingAsLeaf.Init> =>
  store.objectiveFeed
    .pipe(
      filter(isVirtuallyFund),
      map(
        ({data}): VirtualFundingAsLeaf.Init => ({
          targetChannelId: data.targetChannelId,
          jointChannelId: data.jointChannelId
        })
      ),
      filter(({targetChannelId}) => targetChannelId === ctx.channelId),
      first()
    )
    .toPromise();

const determineFunding = (_: Store) => (_: Init): Observable<TEvent> =>
  // This should use the store and the context to make a choice, but we have not
  // moved anywhere towards making that choice
  // So, the choice is a hard-coded environment variable
  from(Promise.resolve(process.env.USE_VIRTUAL_FUNDING)).pipe(
    map(
      (useVirtualFunding): TEvent =>
        useVirtualFunding ? {type: 'UseVirtualFunding'} : {type: 'UseDirectFunding'}
    )
  );
/*
It's safe to use support state instead of advance-channel:
- If the latest state that I support has turn `n`, then other participants can support a state
  of turn at most `n + numParticipants - 1`
In the 2-party case,
- if I support state 1, then 2 is the highest supported state, and the appData
  cannot change
- if I am player A, and I support 3 instead of 2, then 3 is the highest supported state,
  since 4 needs to be signed by me
- if I am player B, then I would sign state 3 using advanceChannel anyway
*/
const getPreFundSetup = (store: Store) => (ctx: Init): Promise<SupportState.Init> =>
  store
    .channelUpdatedFeed(ctx.channelId)
    .pipe(
      map(e => _.sortBy(e.states, s => s.turnNum)[0]),
      filter(s => s.turnNum.eq(0)),
      map(state => ({state})),
      first()
    )
    .toPromise();

const getPostFundSetup = (store: Store) => (ctx: Init): Promise<SupportState.Init> =>
  store
    .channelUpdatedFeed(ctx.channelId)
    .pipe(
      map(e => _.sortBy(e.states, s => s.turnNum)[0]),
      filter(s => s.turnNum.eq(0)),
      map(s => ({state: {...s, turnNum: bigNumberify(3)}})),
      first()
    )
    .toPromise();

const getDepositingInfo = (store: Store) => async ({channelId}: Init): Promise<Depositing.Init> => {
  const {supported: supportedState, myIndex} = await store.getEntry(channelId);
  const {allocationItems} = checkThat(supportedState.outcome, isSimpleEthAllocation);

  const fundedAt = allocationItems.map(a => a.amount).reduce(add);
  let depositAt = bigNumberify(0);
  for (let i = 0; i < allocationItems.length; i++) {
    const {amount} = allocationItems[i];
    if (i !== myIndex) depositAt = depositAt.add(amount);
    else {
      const totalAfterDeposit = depositAt.add(amount);
      return {channelId, depositAt, totalAfterDeposit, fundedAt};
    }
  }

  throw Error(`Could not find an allocation for participant id ${myIndex}`);
};

const setFundingToDirect = (store: Store) => async (ctx: Init) =>
  await store.setFunding(ctx.channelId, {type: 'Direct'});

const setFundingToVirtual = (store: Store) => async (ctx: Init) =>
  await store.setFunding(ctx.channelId, {type: 'Virtual', jointChannelId: 'TODO'});

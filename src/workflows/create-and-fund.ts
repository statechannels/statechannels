import {Machine, MachineConfig} from 'xstate';

import {SimpleAllocation} from '../store/types';

import {MachineFactory} from '../utils/workflow-utils';
import {Store} from '../store';
import {bigNumberify} from 'ethers/utils';
import * as Depositing from './depositing';
import {add} from '../utils/math-utils';
import {isSimpleEthAllocation} from '../utils/outcome';
import {checkThat, getDataAndInvoke} from '../utils';
import {SupportState} from '.';
const PROTOCOL = 'create-and-fund';

export enum Indices {
  Left = 0,
  Right = 0
}

export type Init = {
  allocation: SimpleAllocation;
  channelId: string;
  appData: string;
  appDefinition: string;
};

const preFundSetup = getDataAndInvoke<Init, Service>(
  {src: 'getPreFundSetup'},
  {src: 'supportState'},
  'depositing'
);

const depositing = getDataAndInvoke<Context, Service>(
  {src: 'getDepositingInfo'},
  {src: 'depositing'},
  'postFundSetup'
);

const postFundSetup = getDataAndInvoke<Init, Service>(
  {src: 'getPostFundSetup'},
  {src: 'supportState'},
  'success'
);

type Context = Init;
export const config: MachineConfig<Context, any, any> = {
  key: PROTOCOL,
  initial: 'preFundSetup',
  states: {
    preFundSetup,
    depositing,
    postFundSetup,
    success: {type: 'final'}
  }
};

const services = (store: Store) => ({
  depositing: Depositing.machine(store),
  supportState: SupportState.machine(store),
  getDepositingInfo: getDepositingInfo(store),
  getPreFundSetup: getPreFundSetup(store),
  getPostFundSetup: getPostFundSetup(store)
});
type Service = keyof ReturnType<typeof services>;

const options = (store: Store) => ({services: services(store)});

export const machine: MachineFactory<Init, any> = (store: Store, init: Init) => {
  return Machine(config).withConfig(options(store), init);
};

import {filter, map, take, tap} from 'rxjs/operators';
import _ from 'lodash';

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
      filter(s => s.turnNum.lte(1)),
      tap(s => {
        if (!_.isEqual(s.outcome, ctx.allocation)) throw 'Unexpected outcome';
        if (!_.isEqual(s.appData, ctx.appData)) throw 'Unexpected appData';
        if (!_.isEqual(s.appDefinition, ctx.appDefinition)) throw 'Unexpected appDefinition';
      }),
      map(s => ({state: {...s, turnNum: bigNumberify(1)}})),
      take(1)
    )
    .toPromise();

const getPostFundSetup = (store: Store) => (ctx: Init): Promise<SupportState.Init> =>
  store
    .channelUpdatedFeed(ctx.channelId)
    .pipe(
      map(e => _.sortBy(e.states, s => s.turnNum)[0]),
      filter(s => s.turnNum.eq(1)),
      tap(s => {
        if (!_.isEqual(s.outcome, ctx.allocation)) throw 'Unexpected outcome';
        if (!_.isEqual(s.appData, ctx.appData)) throw 'Unexpected appData';
        if (!_.isEqual(s.appDefinition, ctx.appDefinition)) throw 'Unexpected appDefinition';
      }),
      map(s => ({state: {...s, turnNum: bigNumberify(3)}})),
      take(1)
    )
    .toPromise();

const getDepositingInfo = (store: Store) => async ({channelId}: Init): Promise<Depositing.Init> => {
  const {supported, myIndex} = await store.getEntry(channelId);
  const {allocationItems} = checkThat(supported?.outcome, isSimpleEthAllocation);

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

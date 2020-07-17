const PROTOCOL = 'virtual-defunding-as-hub';
import {
  checkThat,
  isSimpleEthAllocation,
  BN,
  isGuarantees,
  isIndirectFunding,
  AllocationItem
} from '@statechannels/wallet-core';

import {StateNodeConfig, assign, DoneInvokeEvent, Machine} from 'xstate';
import {map, filter, tap, first} from 'rxjs/operators';
import _ from 'lodash';

import {getDataAndInvoke} from '../utils/helpers';
import {ChannelStoreEntry} from '../store/channel-store-entry';
import {Store} from '../store';
import {OutcomeIdx} from './virtual-funding-as-leaf';
import {defundGuarantorInLedger} from './virtual-defunding-as-leaf';
import {SupportState} from '.';

export type Init = {jointChannelId: string};
const {add} = BN;

type IDs = [string, string];
type ChannelIds = {guarantorChannelIds: IDs; ledgerChannelIds: IDs};
type ChannelsSet = Init & ChannelIds;
const enum Leaf {
  A = 0,
  B = 1
}

const checkChannelsService = (store: Store) => async ({
  jointChannelId
}: Init): Promise<ChannelIds> => {
  const {funding: jointFunding} = await store.getEntry(jointChannelId);
  const {guarantorChannelIds} = checkThat(jointFunding, isGuarantees);

  const {funding: leftGuarantorFunding} = await store.getEntry(guarantorChannelIds[Leaf.A]);
  const {ledgerId: leftLedgerId} = checkThat(leftGuarantorFunding, isIndirectFunding);

  const {funding: rightGuarantorFunding} = await store.getEntry(guarantorChannelIds[Leaf.B]);
  const {ledgerId: rightLedgerId} = checkThat(rightGuarantorFunding, isIndirectFunding);

  return {guarantorChannelIds, ledgerChannelIds: [leftLedgerId, rightLedgerId]};
};

const checkChannels: StateNodeConfig<ChannelsSet, any, any> = {
  invoke: {src: checkChannelsService.name, onDone: 'defundTarget'},
  exit: assign<ChannelsSet>((_: Init, {data}: DoneInvokeEvent<ChannelIds>) => data)
};

const finalJointChannelUpdate = (store: Store) => async ({
  jointChannelId
}: ChannelsSet): Promise<SupportState.Init> =>
  store
    .channelUpdatedFeed(jointChannelId)
    .pipe(
      // Wait for the new update
      filter(({latest, supported}) => latest.turnNum > supported.turnNum),
      // Validate the update
      tap(({latest, supported}: ChannelStoreEntry) => {
        const newItems = checkThat(latest.outcome, isSimpleEthAllocation).allocationItems;
        const supportedItems = checkThat(supported.outcome, isSimpleEthAllocation).allocationItems;

        const invariantHubAllocation = _.isEqual(newItems[1], supportedItems[1]);

        if (!invariantHubAllocation) throw new Error('Hub allocation changed');

        const amount = (i: AllocationItem) => i.amount;
        const supportedAmount = supportedItems.map(amount).reduce(add);
        const newAmount = newItems.map(amount).reduce(add);
        const invariantTotal = supportedAmount === newAmount;

        if (!invariantTotal) throw new Error('Total allocation changed');
      }),
      map(({latest}) => ({state: latest})),
      first()
    )
    .toPromise();

const defundTarget: StateNodeConfig<any, any, any> = getDataAndInvoke(
  {src: finalJointChannelUpdate.name},
  {src: 'supportState'},
  'defundGuarantors'
);

const defundGuarantor = (leaf: Leaf, store: Store) => async ({
  guarantorChannelIds,
  jointChannelId,
  ledgerChannelIds
}: ChannelsSet) => {
  const role = leaf === 0 ? OutcomeIdx.A : OutcomeIdx.B;
  const {supported} = await store.getEntry(jointChannelId);
  const {allocationItems} = checkThat(supported.outcome, isSimpleEthAllocation);
  const targetChannelId = allocationItems[0].destination;

  return defundGuarantorInLedger(store)({
    role,
    ledgerId: ledgerChannelIds[leaf],
    guarantorChannelId: guarantorChannelIds[leaf],
    jointChannelId,
    targetChannelId
  });
};
const defundLeftGuarantor = (store: Store) => async (
  ctx: ChannelsSet
): Promise<SupportState.Init> => defundGuarantor(0, store)(ctx);
const defundRightGuarantor = (store: Store) => async (
  ctx: ChannelsSet
): Promise<SupportState.Init> => defundGuarantor(0, store)(ctx);

const supportState = (store: Store) => SupportState.machine(store);

const defundGuarantors: StateNodeConfig<any, any, any> = {
  type: 'parallel',
  states: {
    defundLeft: getDataAndInvoke({src: defundLeftGuarantor.name}, {src: supportState.name}),
    defundRight: getDataAndInvoke({src: defundRightGuarantor.name}, {src: supportState.name})
  },
  exit: 'deleteChannels',
  onDone: 'success'
};

export const config: StateNodeConfig<any, any, any> = {
  key: PROTOCOL,
  initial: 'checkChannels',
  states: {
    checkChannels,
    defundTarget,
    defundGuarantors,
    success: {type: 'final'}
  }
};

const options = (store: Store) => ({
  services: {
    checkChannelsService: checkChannelsService(store),
    defundLeftGuarantor: defundLeftGuarantor(store),
    defundRightGuarantor: defundRightGuarantor(store),
    finalJointChannelUpdate: finalJointChannelUpdate(store),
    supportState: supportState(store)
  }
});

export const machine = (store: Store) => Machine(config).withConfig(options(store));

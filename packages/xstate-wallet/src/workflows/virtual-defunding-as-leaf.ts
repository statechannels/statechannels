import {checkThat, getDataAndInvoke} from '../utils';
import {isVirtualFunding, isIndirectFunding, isGuarantee} from '../store/memory-store';
import {SupportState} from '.';
import {isSimpleEthAllocation, simpleEthAllocation} from '../utils/outcome';
import {OutcomeIdx, ParticipantIdx} from './virtual-funding-as-leaf';
import {StateNodeConfig, assign, DoneInvokeEvent, Machine} from 'xstate';

import {Store} from '../store';
import {nextState} from '../store/state-utils';
import _ from 'lodash';

export type Init = {targetChannelId: string};
const PROTOCOL = 'virtual-defunding-as-leaf';

const checkChannelsService = (store: Store) => async (ctx: Init): Promise<ChannelIds> => {
  const {funding: targetFunding} = await store.getEntry(ctx.targetChannelId);
  const {jointChannelId} = checkThat(targetFunding, isVirtualFunding);

  const {funding: jointFunding, myIndex} = await store.getEntry(jointChannelId);
  const {guarantorChannelId} = checkThat(jointFunding, isGuarantee);
  const role = myIndex === ParticipantIdx.A ? OutcomeIdx.A : OutcomeIdx.B;

  const {funding: guarantorFunding} = await store.getEntry(guarantorChannelId);
  const {ledgerId} = checkThat(guarantorFunding, isIndirectFunding);

  return {jointChannelId, guarantorChannelId, ledgerId, role};
};

type ChannelIds = {
  jointChannelId: string;
  guarantorChannelId: string;
  ledgerId: string;
  role: OutcomeIdx;
};
type ChannelsSet = Init & ChannelIds;

const checkChannels: StateNodeConfig<ChannelsSet, any, any> = {
  invoke: {src: checkChannelsService.name, onDone: 'defundTarget'},
  exit: assign<ChannelsSet>((_: Init, {data}: DoneInvokeEvent<ChannelIds>) => data)
};

const finalJointChannelUpdate = (store: Store) => async (
  ctx: ChannelsSet
): Promise<SupportState.Init> => {
  const {jointChannelId, targetChannelId} = ctx;

  const {supported: targetChannelState} = await store.getEntry(targetChannelId);
  if (!targetChannelState.isFinal) throw new Error('Target channel not finalized');

  const {supported: jointState} = await store.getEntry(jointChannelId);
  if (!jointState) throw 'No supported state in joint channel';

  const jointAllocation = checkThat(jointState.outcome, isSimpleEthAllocation).allocationItems;
  const targetOutcome = checkThat(targetChannelState.outcome, isSimpleEthAllocation)
    .allocationItems;
  const outcome = simpleEthAllocation([
    targetOutcome[0],
    jointAllocation[OutcomeIdx.Hub],
    targetOutcome[1]
  ]);

  return {state: nextState(jointState, outcome)};
};

const defundTarget: StateNodeConfig<any, any, any> = _.merge(
  getDataAndInvoke({src: finalJointChannelUpdate.name}, {src: 'supportState'}, 'defundGuarantor'),
  {exit: ['deleteTargetChannel']}
);

const defundGuarantorInLedger = (store: Store) => async ({
  jointChannelId,
  ledgerId,
  guarantorChannelId,
  role
}: ChannelsSet): Promise<SupportState.Init> => {
  const {supported: jointState} = await store.getEntry(jointChannelId);
  const jAlloc = checkThat(jointState.outcome, isSimpleEthAllocation).allocationItems;

  const {supported: ledgerState} = await store.getEntry(ledgerId);
  const {allocationItems: lAlloc} = checkThat(ledgerState.outcome, isSimpleEthAllocation);
  const ledgerWithoutGuarantor = _.filter(lAlloc, a => a.destination !== guarantorChannelId);

  const [hub, leaf] = ledgerWithoutGuarantor.slice(0, 2);
  const BadOutcome = new Error('Bad outcomes');
  if (hub.destination !== jAlloc[OutcomeIdx.Hub].destination) throw BadOutcome;
  if (leaf.destination !== jAlloc[role].destination) throw BadOutcome;

  const outcome = simpleEthAllocation([
    {destination: hub.destination, amount: hub.amount.add(jAlloc[2 - role].amount)},
    {destination: leaf.destination, amount: leaf.amount.add(jAlloc[role].amount)},
    ...ledgerWithoutGuarantor.slice(2)
  ]);
  return {state: nextState(ledgerState, outcome)};
};

const defundGuarantor: StateNodeConfig<any, any, any> = _.merge(
  getDataAndInvoke({src: defundGuarantorInLedger.name}, {src: 'supportState'}, 'success'),
  {exit: ['deleteJointChannel', 'deleteGuarantorChannel']}
);

export const config: StateNodeConfig<any, any, any> = {
  key: PROTOCOL,
  initial: 'checkChannels',
  states: {checkChannels, defundTarget, defundGuarantor, success: {type: 'final'}}
};

const services = (store: Store) => ({
  checkChannelsService: checkChannelsService(store),
  defundGuarantorInLedger: defundGuarantorInLedger(store),
  finalJointChannelUpdate: finalJointChannelUpdate(store),
  supportState: SupportState.machine(store)
});
const actions = (_: Store) => ({});
const options = (store: Store) => ({services: services(store), actions: actions(store)});

export const machine = (store: Store) => Machine(config).withConfig(options(store));

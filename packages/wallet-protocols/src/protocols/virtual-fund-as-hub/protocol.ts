import { Channel } from '@statechannels/nitro-protocol';

import { Store } from '../../store';
import { Balance } from '../../types';
import { connectToStore, getDataAndInvoke } from '../../machine-utils';
import { VirtualLeaf, CreateNullChannel, SupportState, LedgerFunding } from '../';
import { FINAL } from '../..';
const PROTOCOL = 'virtual-funding-as-hub';

export interface Init {
  balances: Balance[];
  targetChannelId: string;
  hubAddress: string;
  jointChannel: Channel;
  guarantorChannels: [Channel, Channel];
}

const jointChannelArgs = (store: Store) => ({
  jointChannel,
  balances,
}: Init): CreateNullChannel.Init =>
  VirtualLeaf.jointChannelArgs(store)({
    jointChannel: jointChannel,
    balances: balances,
    hubAddress: jointChannel.participants[1],
  });

const createJointChannel = getDataAndInvoke('jointChannelArgs', 'createNullChannel');

const guarantorArgs = (index: VirtualLeaf.Indices) => (store: Store) => ({
  jointChannel,
  guarantorChannels,
}: Init): CreateNullChannel.Init =>
  VirtualLeaf.guarantorChannelArgs(store)({
    jointChannel,
    guarantorChannel: guarantorChannels[index],
    index,
  });

const leftGuarantorArgs = guarantorArgs(0);
const createLeftGuarantorChannel = getDataAndInvoke('leftGuarantorArgs', 'createNullChannel');

const rightGuarantorArgs = guarantorArgs(1);
const createRightGuarantorChannel = getDataAndInvoke('rightGuarantorArgs', 'createNullChannel');

const parallel = 'parallel' as 'parallel';
const createChannels = {
  type: parallel,
  states: { createLeftGuarantorChannel, createRightGuarantorChannel, createJointChannel },
  onDone: 'fundGuarantors',
};

const fundGuarantorArgs = (index: VirtualLeaf.Indices) => ({
  guarantorChannels,
  balances,
  hubAddress,
}: Init): LedgerFunding.Init =>
  VirtualLeaf.fundGuarantorArgs({
    guarantorChannel: guarantorChannels[index],
    index,
    balances,
    hubAddress,
  });
const fundGuarantors = {
  type: parallel,
  states: {
    fundLeftGuarantor: {
      invoke: { src: 'ledgerFunding', data: fundGuarantorArgs(VirtualLeaf.Indices.Left) },
    },
    fundRightGuarantor: {
      invoke: { src: 'ledgerFunding', data: fundGuarantorArgs(VirtualLeaf.Indices.Right) },
    },
  },
  onDone: 'fundTarget',
};

const fundTarget = getDataAndInvoke('fundTargetArgs', 'supportState', 'success');

// PROTOCOL DEFINITION
export const config = {
  key: PROTOCOL,
  initial: 'createChannels',
  states: { createChannels, fundGuarantors, fundTarget, success: { type: FINAL } },
};

const options = (store: Store) => ({
  services: {
    fundTargetArgs: VirtualLeaf.fundTargetArgs(store),
    createNullChannel: CreateNullChannel.machine(store),
    supportState: SupportState.machine(store),
    jointChannelArgs: jointChannelArgs(store),
    leftGuarantorArgs: leftGuarantorArgs(store),
    rightGuarantorArgs: rightGuarantorArgs(store),
  },
});

export const machine = connectToStore<any>(config, options);

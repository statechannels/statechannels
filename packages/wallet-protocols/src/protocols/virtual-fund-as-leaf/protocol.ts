import { Guarantee, AllocationItem, Allocation } from '@statechannels/nitro-protocol';
import _ from 'lodash';

import { Channel, getChannelId, outcomesEqual } from '../../';
import { add } from '../../mathOps';
import { Balance } from '../../types';
import { ethGuaranteeOutcome, ethAllocationOutcome } from '../../calculations';
import { Store } from '../../store';
import { connectToStore, getDataAndInvoke } from '../../machine-utils';

import { CreateNullChannel, SupportState, LedgerFunding } from '..';
const PROTOCOL = 'virtual-fund-as-leaf';

export enum Indices {
  Left = 0,
  Right = 1,
}

export interface Init {
  balances: Balance[];
  ledgerId: string;
  targetChannelId: string;
  hubAddress: string;
  guarantorChannel: Channel;
  jointChannel: Channel;
  index: Indices.Left | Indices.Right;
}

const allocationItem = (balance: Balance): AllocationItem => ({
  destination: balance.address,
  amount: balance.wei,
});

export const jointChannelArgs = (store: Store) => ({
  jointChannel,
  balances,
  hubAddress,
}: Pick<Init, 'jointChannel' | 'balances' | 'hubAddress'>): CreateNullChannel.Init => {
  const allocation = jointChannelAllocation(balances, hubAddress);

  return {
    channel: jointChannel,
    outcome: ethAllocationOutcome(allocation, store.ethAssetHolderAddress),
  };
};
const createJointChannel = getDataAndInvoke('jointChannelArgs', 'createNullChannel');

function jointChannelAllocation(balances: Balance[], hubAddress: string) {
  const total = balances.map(b => b.wei).reduce(add);
  const allocation = [
    allocationItem(balances[0]),
    { destination: hubAddress, amount: total },
    allocationItem(balances[1]),
  ];
  return allocation;
}

export const guarantorChannelArgs = (store: Store) => ({
  jointChannel,
  index,
  guarantorChannel,
}: Pick<Init, 'jointChannel' | 'index' | 'guarantorChannel'>): CreateNullChannel.Init => {
  const { participants } = jointChannel;

  const guarantee: Guarantee = {
    targetChannelId: getChannelId(jointChannel),
    // Note that index in the joint channel is twice the index in the target channel
    // This is easier to generalize to n-participant virtual channels
    destinations: [participants[2 * index], participants[1]],
  };

  return {
    channel: guarantorChannel,
    outcome: ethGuaranteeOutcome(guarantee, store.ethAssetHolderAddress),
  };
};
const createGuarantorChannel = getDataAndInvoke('guarantorChannelArgs', 'createNullChannel');

const createChannels = {
  type: 'parallel' as 'parallel',
  states: { createGuarantorChannel, createJointChannel },
  onDone: 'fundGuarantor',
};

export const fundGuarantorArgs = ({
  guarantorChannel,
  balances,
  index,
  hubAddress,
}: Pick<Init, 'guarantorChannel' | 'balances' | 'hubAddress' | 'index'>): LedgerFunding.Init => {
  const deductions: Allocation = balances.map(b => ({ destination: b.address, amount: b.wei }));
  deductions[1 - index].destination = hubAddress;

  return { targetChannelId: getChannelId(guarantorChannel), deductions };
};

const fundGuarantor = getDataAndInvoke('fundGuarantorArgs', 'ledgerFunding', 'fundTarget');

export function fundTargetArgs(store: Store) {
  return async ({
    jointChannel,
    balances,
    hubAddress,
    targetChannelId,
  }: Init): Promise<SupportState.Init> => {
    const { latestSupportedState } = await store.getEntry(getChannelId(jointChannel));
    const expectedAllocation = jointChannelAllocation(balances, hubAddress);
    if (
      !outcomesEqual(
        latestSupportedState.outcome,
        ethAllocationOutcome(expectedAllocation, store.ethAssetHolderAddress)
      )
    ) {
      throw 'Unexpected outcome';
    }

    const { amount } = expectedAllocation[1];
    return {
      state: {
        ...latestSupportedState,
        turnNum: latestSupportedState.turnNum + 1,
        outcome: ethAllocationOutcome(
          [
            { destination: targetChannelId, amount },
            { destination: hubAddress, amount },
          ],
          store.ethAssetHolderAddress
        ),
      },
    };
  };
}
const fundTarget = getDataAndInvoke('fundTargetArgs', 'supportState', 'success');

// PROTOCOL DEFINITION
export const config = {
  key: PROTOCOL,
  initial: 'createChannels',
  states: { createChannels, fundGuarantor, fundTarget, success: { type: 'final' as 'final' } },
};

const options = (store: Store) => ({
  services: {
    fundGuarantorArgs,
    fundTargetArgs: fundTargetArgs(store),
    createNullChannel: CreateNullChannel.machine(store),
    supportState: SupportState.machine(store),
  },
});

export const machine = connectToStore<any>(config, options);

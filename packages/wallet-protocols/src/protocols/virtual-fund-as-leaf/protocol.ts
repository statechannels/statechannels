import { assign } from 'xstate';
import { Guarantee, AllocationItem } from '@statechannels/nitro-protocol';

import { Channel, getChannelId, outcomesEqual } from '../../';
import { add } from '../../mathOps';
import { Balance } from '../../types';
import { ethAllocationOutcome, ethGuaranteeOutcome } from '../../calculations';
import { Store } from '../../store';
import { CHAIN_ID } from '../../constants';
import { connectToStore, getDataAndInvoke } from '../../machine-utils';

import { CreateNullChannel, SupportState, LedgerFunding } from '..';

const PROTOCOL = 'virtual-funding-as-leaf';

enum Indices {
  Left = 0,
  Right = 1,
}

export interface Init {
  balances: Balance[];
  ledgerId: string;
  targetChannelId: string;
  hubAddress: string;
  index: Indices.Left | Indices.Right;
}

const allocationItem = (balance: Balance): AllocationItem => ({
  destination: balance.address,
  amount: balance.wei,
});
type ChannelsKnown = Init & {
  jointChannel: Channel;
  guarantorChannel: Channel;
};
function jointChannelArgs({
  jointChannel,
  balances,
  hubAddress,
}: ChannelsKnown): CreateNullChannel.Init {
  const allocation = jointChannelAllocation(balances, hubAddress);

  return { channel: jointChannel, outcome: ethAllocationOutcome(allocation, 'TODO') };
}
const createJointChannel = {
  invoke: {
    src: 'createNullChannel',
    data: jointChannelArgs,
  },
};

function jointChannelAllocation(balances: Balance[], hubAddress: string) {
  const total = balances.map(b => b.wei).reduce(add);
  const allocation = [
    allocationItem(balances[0]),
    { destination: hubAddress, amount: total },
    allocationItem(balances[1]),
  ];
  return allocation;
}

function guarantorChannelArgs({
  jointChannel,
  index,
  guarantorChannel,
}: ChannelsKnown): CreateNullChannel.Init {
  const { participants } = jointChannel;

  const guarantee: Guarantee = {
    targetChannelId: getChannelId(jointChannel),
    // Note that index in the joint channel is twice the index in the target channel
    // This is easier to generalize to n-participant virtual channels
    destinations: [participants[2 * index], participants[1]],
  };

  return { channel: guarantorChannel, outcome: ethGuaranteeOutcome(guarantee, 'TODO') };
}
const createGuarantorChannel = {
  invoke: {
    src: 'createNullChannel',
    data: guarantorChannelArgs,
  },
};

const assignChannels = (store: Store) =>
  assign(
    (init: Init): ChannelsKnown => {
      const { hubAddress, targetChannelId, index } = init;
      const participants = store.getEntry(targetChannelId).participants.map(p => p.destination);
      const jointParticipants = [participants[0], hubAddress, participants[1]];
      const jointChannel: Channel = {
        participants: jointParticipants,
        channelNonce: store.getNextNonce(jointParticipants),
        chainId: CHAIN_ID,
      };

      const guarantorParticipants = [participants[index], hubAddress];
      const guarantorChannel: Channel = {
        participants: guarantorParticipants,
        channelNonce: store.getNextNonce(guarantorParticipants),
        chainId: CHAIN_ID,
      };

      return {
        ...init,
        jointChannel,
        guarantorChannel,
      };
    }
  );
const createChannels = {
  entry: 'assignChannels',
  type: 'parallel' as 'parallel',
  states: {
    createGuarantorChannel,
    createJointChannel,
  },
  onDone: 'fundGuarantor',
};

function fundGuarantorArgs(_: Store) {
  return async ({}: ChannelsKnown): Promise<LedgerFunding.Init> => {
    // TODO: We might need to change ledger-funding a little to
    // accept arguments compatible with funding a guarantor channel.
    // This is easy if you skip the "lok ledger channel" step, and just pass
    // - the ledger channel
    // - the target channel
    // - balances to fund the target with
    throw 'Unimplemented';
  };
}
const fundGuarantor = getDataAndInvoke('fundGuarantorArgs', 'ledgerFunding', 'fundTarget');

function fundTargetArgs(store: Store) {
  return async ({
    jointChannel,
    balances,
    hubAddress,
    targetChannelId,
  }: ChannelsKnown): Promise<SupportState.Init> => {
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
  actions: { assignChannels: assignChannels(store) },
  services: {
    fundGuarantorArgs: fundGuarantorArgs(store),
    fundTargetArgs: fundTargetArgs(store),
    createNullChannel: CreateNullChannel.machine(store),
    supportState: SupportState.machine(store),
  },
});

export const machine = connectToStore(config, options);

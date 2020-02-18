import {
  Outcome as NitroOutcome,
  isAllocationOutcome,
  AllocationItem as NitroAllocationItem,
  convertAddressToBytes32
} from '@statechannels/nitro-protocol';
import {bigNumberify} from 'ethers/utils';
import {Allocation} from '@statechannels/client-api-schema';
import {AddressZero} from 'ethers/constants';

import {ETH_ASSET_HOLDER_ADDRESS} from '../constants';

import {
  Outcome,
  AllocationItem,
  SimpleEthAllocation,
  SimpleTokenAllocation,
  MixedAllocation
} from './types';

export function convertFromNitroOutcome(outcome: NitroOutcome): Outcome {
  if (outcome.length === 0) {
    throw new Error('Cannot handle empty outcome');
  } else if (outcome.length === 1) {
    const firstOutcome = outcome[0];

    if (firstOutcome.assetHolderAddress === ETH_ASSET_HOLDER_ADDRESS) {
      return isAllocationOutcome(firstOutcome)
        ? {
            type: 'SimpleEthAllocation',
            allocationItems: convertFromNitroAllocationItems(firstOutcome.allocationItems)
          }
        : {
            type: 'SimpleEthGuarantee',
            guarantorAddress: firstOutcome.guarantee.targetChannelId,
            destinations: firstOutcome.guarantee.destinations
          };
    } else {
      return isAllocationOutcome(firstOutcome)
        ? {
            type: 'SimpleTokenAllocation',
            tokenAddress: firstOutcome.assetHolderAddress, // TODO: Look up token for assetHolder
            allocationItems: convertFromNitroAllocationItems(firstOutcome.allocationItems)
          }
        : {
            type: 'SimpleTokenGuarantee',
            tokenAddress: firstOutcome.assetHolderAddress, // TODO: Look up token for assetHolder
            guarantorAddress: firstOutcome.guarantee.targetChannelId,
            destinations: firstOutcome.guarantee.destinations
          };
    }
  } else {
    const ethAllocation = outcome.filter(
      o => o.assetHolderAddress === ETH_ASSET_HOLDER_ADDRESS && isAllocationOutcome(o)
    );
    const tokenAllocations = outcome.filter(
      o => o.assetHolderAddress !== ETH_ASSET_HOLDER_ADDRESS && isAllocationOutcome(o)
    );
    return {
      type: 'MixedAllocation',
      ethAllocation: ethAllocation
        ? (convertFromNitroOutcome(ethAllocation) as SimpleEthAllocation)
        : undefined,
      tokenAllocations: tokenAllocations
        ? tokenAllocations.map(t => convertFromNitroOutcome([t]) as SimpleTokenAllocation)
        : undefined
    };
  }
}

function convertFromNitroAllocationItems(allocationItems: NitroAllocationItem[]): AllocationItem[] {
  return allocationItems.map(a => ({
    amount: bigNumberify(a.amount),
    destination: a.destination
  }));
}
function convertToNitroAllocationItems(allocationItems: AllocationItem[]): NitroAllocationItem[] {
  return allocationItems.map(a => ({
    amount: a.amount.toHexString(),
    destination:
      a.destination.length === 42 ? convertAddressToBytes32(a.destination) : a.destination
  }));
}

export function convertToNitroOutcome(outcome: Outcome): NitroOutcome {
  switch (outcome.type) {
    case 'SimpleEthAllocation':
      return [
        {
          assetHolderAddress: ETH_ASSET_HOLDER_ADDRESS,
          allocationItems: convertToNitroAllocationItems(outcome.allocationItems)
        }
      ];
    case 'SimpleTokenAllocation':
      return [
        {
          assetHolderAddress: outcome.tokenAddress, // TODO: Map to assetholder address
          allocationItems: convertToNitroAllocationItems(outcome.allocationItems)
        }
      ];
    case 'SimpleEthGuarantee':
      return [
        {
          assetHolderAddress: ETH_ASSET_HOLDER_ADDRESS,
          guarantee: {
            targetChannelId: outcome.guarantorAddress,
            destinations: outcome.destinations.map(convertAddressToBytes32)
          }
        }
      ];
    case 'SimpleTokenGuarantee':
      return [
        {
          assetHolderAddress: outcome.tokenAddress, // TODO: Map to assetholder address,
          guarantee: {
            targetChannelId: outcome.guarantorAddress,
            destinations: outcome.destinations.map(convertAddressToBytes32)
          }
        }
      ];
    case 'MixedAllocation':
      const nitroOutcome: NitroOutcome = [];
      if (outcome.ethAllocation) {
        nitroOutcome.push(convertToNitroOutcome(outcome.ethAllocation)[0]);
      }
      return (outcome.ethAllocation ? convertToNitroOutcome(outcome.ethAllocation) : []).concat(
        outcome.tokenAllocations?.map(a => convertToNitroOutcome(a)[0]) || []
      );
  }
}

export function convertAllocationsToOutcome(
  allocations: Allocation[]
): MixedAllocation | SimpleEthAllocation | SimpleTokenAllocation | undefined {
  if (allocations.length === 0) {
    return undefined;
  }
  if (allocations.length === 1) {
    return convertAllocationToOutcome(allocations[0]);
  } else {
    const ethAllocation = allocations.find(a => a.token === AddressZero);
    const tokenAllocations = allocations.filter(a => a.token !== AddressZero);
    return {
      type: 'MixedAllocation',
      ethAllocation: ethAllocation
        ? (convertAllocationToOutcome(ethAllocation) as SimpleEthAllocation)
        : undefined,
      tokenAllocations: tokenAllocations
        ? (tokenAllocations.map(a => convertAllocationToOutcome(a)) as SimpleTokenAllocation[])
        : undefined
    };
  }
}

function convertAllocationToOutcome(
  allocation: Allocation
): SimpleEthAllocation | SimpleTokenAllocation {
  return {
    type: allocation.token ? 'SimpleTokenAllocation' : 'SimpleEthAllocation',
    tokenAddress: allocation.token,
    allocationItems: allocation.allocationItems.map(a => ({
      amount: bigNumberify(a.amount),
      destination: a.destination
    }))
  };
}

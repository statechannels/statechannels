import {Allocations} from '@statechannels/client-api-schema';
import {SimpleAllocation, MixedAllocation} from '../../store/types';
import {bigNumberify} from 'ethers/utils';
import {ETH_ASSET_HOLDER_ADDRESS, ETH_TOKEN} from '../../constants';
import {makeDestination} from '../../utils';

export const externalEthAllocation: Allocations = [
  {
    token: ETH_TOKEN,
    allocationItems: [
      {
        amount: '0x5',
        destination: '0x000000000000000000000000A5C9d076B3FC5910d67b073CBF75C4e13a5AC6E5'
      },
      {
        amount: '0x5',
        destination: '0x000000000000000000000000BAF5D86514365D487ea69B7D7c85913E5dF51648'
      }
    ]
  }
];

export const internalEthAllocation: SimpleAllocation = {
  assetHolderAddress: ETH_ASSET_HOLDER_ADDRESS,
  allocationItems: [
    {
      amount: bigNumberify('0x5'),
      destination: makeDestination('0xA5C9d076B3FC5910d67b073CBF75C4e13a5AC6E5')
    },
    {
      amount: bigNumberify('0x5'),
      destination: makeDestination('0xBAF5D86514365D487ea69B7D7c85913E5dF51648')
    }
  ],
  type: 'SimpleAllocation'
};

export const externalMixedAllocation: Allocations = [
  externalEthAllocation[0],
  {
    token: '0x18f8d9125d8B87deA957F3E81EfD2F05C3120C0d',
    allocationItems: [
      {
        amount: '0x1',
        destination: '0x000000000000000000000000A5C9d076B3FC5910d67b073CBF75C4e13a5AC6E5'
      },
      {
        amount: '0x1',
        destination: '0x000000000000000000000000BAF5D86514365D487ea69B7D7c85913E5dF51648'
      }
    ]
  }
];

export const internalMixedAllocation: MixedAllocation = {
  type: 'MixedAllocation',
  simpleAllocations: [
    internalEthAllocation,
    {
      type: 'SimpleAllocation',
      assetHolderAddress: '0x18f8d9125d8B87deA957F3E81EfD2F05C3120C0d',
      allocationItems: [
        {
          amount: bigNumberify('0x1'),
          destination: makeDestination('0xA5C9d076B3FC5910d67b073CBF75C4e13a5AC6E5')
        },
        {
          amount: bigNumberify('0x1'),
          destination: makeDestination('0xBAF5D86514365D487ea69B7D7c85913E5dF51648')
        }
      ]
    }
  ]
};

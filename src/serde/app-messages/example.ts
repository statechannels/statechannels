import {Allocations} from '@statechannels/client-api-schema';
import {SimpleAllocation, MixedAllocation} from '../../store/types';
import {bigNumberify} from 'ethers/utils';
import {ETH_ASSET_HOLDER_ADDRESS, ETH_TOKEN} from '../../constants';
import {makeDestination} from '../../utils/outcome';

export const externalEthAllocation: Allocations = [
  {
    token: ETH_TOKEN,
    allocationItems: [
      {amount: '0x5', destination: '0xa5c9D076b3FC5910d67B073cbF75c4E13a5AC6e5'},
      {amount: '0x5', destination: '0xbaF5D86514365d487ea69B7d7C85913e5Df51648'}
    ]
  }
];

export const internalEthAllocation: SimpleAllocation = {
  assetHolderAddress: ETH_ASSET_HOLDER_ADDRESS,
  allocationItems: [
    {
      amount: bigNumberify('0x5'),
      destination: makeDestination('0xa5c9D076b3FC5910d67B073cbF75c4E13a5AC6e5')
    },
    {
      amount: bigNumberify('0x5'),
      destination: makeDestination('0xbaF5D86514365d487ea69B7d7C85913e5Df51648')
    }
  ],
  type: 'SimpleAllocation'
};

export const externalMixedAllocation: Allocations = [
  externalEthAllocation[0],
  {
    token: '0x18f8d9125d8B87deA957F3E81EfD2F05C3120C0d',
    allocationItems: [
      {amount: '0x1', destination: '0xa5c9D076b3FC5910d67B073cbF75c4E13a5AC6e5'},
      {amount: '0x1', destination: '0xbaF5D86514365d487ea69B7d7C85913e5Df51648'}
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
          destination: makeDestination('0xa5c9D076b3FC5910d67B073cbF75c4E13a5AC6e5')
        },
        {
          amount: bigNumberify('0x1'),
          destination: makeDestination('0xbaF5D86514365d487ea69B7d7C85913e5Df51648')
        }
      ]
    }
  ]
};

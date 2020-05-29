import {Allocations} from '@statechannels/client-api-schema';
import {SimpleAllocation, MixedAllocation} from '../../store/types';
import {hexZeroPad} from '@ethersproject/bytes';
import {ETH_ASSET_HOLDER_ADDRESS} from '../../config';
import {makeDestination} from '../../utils';
import {ETH_TOKEN} from '../../constants';
import {BigNumber} from 'ethers';

export const externalEthAllocation: Allocations = [
  {
    token: ETH_TOKEN,
    allocationItems: [
      {
        amount: hexZeroPad('0x5', 32),
        destination: '0x000000000000000000000000A5C9d076B3FC5910d67b073CBF75C4e13a5AC6E5'
      },
      {
        amount: hexZeroPad('0x5', 32),
        destination: '0x000000000000000000000000BAF5D86514365D487ea69B7D7c85913E5dF51648'
      }
    ]
  }
];

// TODO: Comparing bigNumbers in a test is fragile
// since BigNumber.from('0x1') ~= BigNumber.from('0x01')
// We should probably just a jest matcher instead
export const internalEthAllocation: SimpleAllocation = {
  assetHolderAddress: ETH_ASSET_HOLDER_ADDRESS,
  allocationItems: [
    {
      amount: BigNumber.from(hexZeroPad('0x5', 32)),
      destination: makeDestination('0xA5C9d076B3FC5910d67b073CBF75C4e13a5AC6E5')
    },
    {
      amount: BigNumber.from(hexZeroPad('0x5', 32)),
      destination: makeDestination('0xBAF5D86514365D487ea69B7D7c85913E5dF51648')
    }
  ],
  type: 'SimpleAllocation'
};

export const externalMixedAllocation: Allocations = [
  externalEthAllocation[0],
  {
    token: '0x1000000000000000000000000000000000000001',
    allocationItems: [
      {
        amount: hexZeroPad('0x1', 32),
        destination: '0x000000000000000000000000A5C9d076B3FC5910d67b073CBF75C4e13a5AC6E5'
      },
      {
        amount: hexZeroPad('0x1', 32),
        destination: '0x000000000000000000000000BAF5D86514365D487ea69B7D7c85913E5dF51648'
      }
    ]
  }
];

// TODO: Comparing bigNumbers in a test is fragile
// since BigNumber.from('0x1') ~= BigNumber.from('0x01')
// We should probably just a jest matcher instead
export const internalMixedAllocation: MixedAllocation = {
  type: 'MixedAllocation',
  simpleAllocations: [
    internalEthAllocation,
    {
      type: 'SimpleAllocation',
      assetHolderAddress: '0x1111111111111111111111111111111111111111',
      allocationItems: [
        {
          amount: BigNumber.from(hexZeroPad('0x1', 32)),
          destination: makeDestination('0xA5C9d076B3FC5910d67b073CBF75C4e13a5AC6E5')
        },
        {
          amount: BigNumber.from(hexZeroPad('0x1', 32)),
          destination: makeDestination('0xBAF5D86514365D487ea69B7D7c85913E5dF51648')
        }
      ]
    }
  ]
};

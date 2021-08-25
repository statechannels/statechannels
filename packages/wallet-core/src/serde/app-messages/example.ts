import {Outcome as AppOutcome} from '@statechannels/client-api-schema';
import {utils} from 'ethers';
import {AllocationType} from '@statechannels/exit-format';

import {makeAddress, Outcome} from '../../types';
import {makeDestination} from '../../utils';
import {BN} from '../../bignumber';
import {zeroAddress} from '../../config';

export const externalEthAllocation: AppOutcome = [
  {
    asset: zeroAddress,
    metadata: '0x',
    allocations: [
      {
        amount: utils.hexZeroPad('0x5', 32),
        destination: '0x000000000000000000000000A5C9d076B3FC5910d67b073CBF75C4e13a5AC6E5',
        metadata: '0x',
        allocationType: AllocationType.simple
      },
      {
        amount: utils.hexZeroPad('0x5', 32),
        destination: '0x000000000000000000000000BAF5D86514365D487ea69B7D7c85913E5dF51648',
        metadata: '0x',
        allocationType: AllocationType.simple
      }
    ]
  }
];

// TODO: Comparing bigNumbers in a test is fragile
// since BigNumber.from('0x1') ~= BigNumber.from('0x01')
// We should probably just a jest matcher instead
export const internalEthAllocation: Outcome = [
  {
    asset: zeroAddress,
    metadata: '0x',
    allocations: [
      {
        amount: BN.from(utils.hexZeroPad('0x5', 32)),
        destination: makeDestination('0xA5C9d076B3FC5910d67b073CBF75C4e13a5AC6E5'),
        allocationType: AllocationType.simple,
        metadata: '0x'
      },
      {
        amount: BN.from(utils.hexZeroPad('0x5', 32)),
        destination: makeDestination('0xBAF5D86514365D487ea69B7D7c85913E5dF51648'),
        allocationType: AllocationType.simple,
        metadata: '0x'
      }
    ]
  }
];

export const externalMixedAllocation: AppOutcome = [
  externalEthAllocation[0],
  {
    asset: '0x1000000000000000000000000000000000000001',
    metadata: '0x',
    allocations: [
      {
        amount: utils.hexZeroPad('0x1', 32),
        destination: makeDestination(
          '0x000000000000000000000000a5c9d076b3fc5910d67b073cbf75c4e13a5ac6e5'
        ),
        metadata: '0x',
        allocationType: AllocationType.simple
      },
      {
        amount: utils.hexZeroPad('0x1', 32),
        destination: makeDestination(
          '0x000000000000000000000000baf5d86514365d487ea69b7d7c85913e5df51648'
        ),
        metadata: '0x',
        allocationType: AllocationType.simple
      }
    ]
  }
];

// TODO: Comparing bigNumbers in a test is fragile
// since BigNumber.from('0x1') ~= BigNumber.from('0x01')
// We should probably just a jest matcher instead
export const internalMixedAllocation: Outcome = [
  ...internalEthAllocation,
  {
    asset: makeAddress('0x1000000000000000000000000000000000000001'),
    metadata: '0x',
    allocations: [
      {
        amount: BN.from(utils.hexZeroPad('0x1', 32)),
        destination: makeDestination('0xA5C9d076B3FC5910d67b073CBF75C4e13a5AC6E5'),
        allocationType: AllocationType.simple,
        metadata: '0x'
      },
      {
        amount: BN.from(utils.hexZeroPad('0x1', 32)),
        destination: makeDestination('0xBAF5D86514365D487ea69B7D7c85913E5dF51648'),
        allocationType: AllocationType.simple,
        metadata: '0x'
      }
    ]
  }
];

import {constants} from 'ethers';
import {AllocationType} from '@statechannels/exit-format';

import {makeDestination} from '../utils';
import {outcomesEqual} from '../state-utils';
import {makeAddress, SingleAssetOutcome} from '../types';
import {BN} from '../bignumber';

const AddressZero = makeAddress(constants.AddressZero);
const HashZero = constants.HashZero;

const singleAssetOutcome1: SingleAssetOutcome = {
  asset: AddressZero,
  metadata: '0x',
  allocations: [
    {
      destination: makeDestination(HashZero),
      amount: BN.from('0x2'),
      metadata: '0x',
      allocationType: AllocationType.simple
    }
  ]
};

const singleAssetOutcome2: SingleAssetOutcome = {
  asset: AddressZero,
  metadata: '0x',
  allocations: [
    {
      destination: makeDestination(HashZero),
      amount: BN.from('0x02'),
      metadata: '0x',
      allocationType: AllocationType.simple
    }
  ]
};

describe('outcomesEqual', () => {
  it('returns equal for identical SimpleAllocations', async () => {
    expect(outcomesEqual([singleAssetOutcome1], [singleAssetOutcome1])).toEqual(true);
  });

  it('returns equal for equivalent SimpleAllocations', async () => {
    expect(outcomesEqual([singleAssetOutcome1], [singleAssetOutcome2])).toEqual(true);
  });
});

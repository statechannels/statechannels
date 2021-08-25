import {constants} from 'ethers';

import {makeDestination} from '../utils';
import {outcomesEqual} from '../state-utils';
import {makeAddress, SingleAssetOutcome} from '../types';
import {BN} from '../bignumber';

const AddressZero = makeAddress(constants.AddressZero);
const HashZero = constants.HashZero;

const singleAssetOutcome1: SingleAssetOutcome = {
  asset: AddressZero,
  allocations: [{destination: makeDestination(HashZero), amount: BN.from('0x2')}]
};

const singleAssetOutcome2: SingleAssetOutcome = {
  asset: AddressZero,
  allocations: [{destination: makeDestination(HashZero), amount: BN.from('0x02')}]
};

describe('outcomesEqual', () => {
  it('returns equal for identical SimpleAllocations', async () => {
    expect(outcomesEqual([singleAssetOutcome1], [singleAssetOutcome1])).toEqual(true);
  });

  it('returns equal for equivalent SimpleAllocations', async () => {
    expect(outcomesEqual([singleAssetOutcome1], [singleAssetOutcome2])).toEqual(true);
  });
});

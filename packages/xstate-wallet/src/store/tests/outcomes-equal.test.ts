import {outcomesEqual} from '../state-utils';
import {SimpleAllocation, Destination} from '../types';
import {AddressZero, HashZero} from '@ethersproject/constants';
import {BigNumber} from 'ethers';

const simpleAllocation1: SimpleAllocation = {
  type: 'SimpleAllocation',
  assetHolderAddress: AddressZero,
  allocationItems: [{destination: HashZero as Destination, amount: BigNumber.from('0x2')}]
};

const simpleAllocation2: SimpleAllocation = {
  type: 'SimpleAllocation',
  assetHolderAddress: AddressZero,
  allocationItems: [{destination: HashZero as Destination, amount: BigNumber.from('0x02')}]
};

describe('outcomesEqual', () => {
  it('returns equal for identical SimpleAllocations', async () => {
    expect(outcomesEqual(simpleAllocation1, simpleAllocation1)).toEqual(true);
  });

  it('returns equal for equivalent SimpleAllocations', async () => {
    expect(outcomesEqual(simpleAllocation1, simpleAllocation2)).toEqual(true);
  });
});

import {outcomesEqual} from '../state-utils';
import {SimpleAllocation} from '../types';
import {AddressZero, HashZero} from 'ethers/constants';
import {bigNumberify} from 'ethers/utils';

const simpleAllocation1 = {
  type: 'SimpleAllocation',
  assetHolderAddress: AddressZero,
  allocationItems: [{destination: HashZero, amount: bigNumberify('0x2')}]
} as SimpleAllocation;

const simpleAllocation2 = {
  type: 'SimpleAllocation',
  assetHolderAddress: AddressZero,
  allocationItems: [{destination: HashZero, amount: bigNumberify('0x02')}]
} as SimpleAllocation;

describe('outcomesEqual', () => {
  it('returns equal for identical SimpleAllocations', async () => {
    expect(outcomesEqual(simpleAllocation1, simpleAllocation1)).toEqual(true);
  });

  it('returns equal for equivalent SimpleAllocations', async () => {
    expect(outcomesEqual(simpleAllocation1, simpleAllocation2)).toEqual(true);
  });
});

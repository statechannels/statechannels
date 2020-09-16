import {constants} from 'ethers';
const {AddressZero, HashZero} = constants;
import {Destination} from '@statechannels/nitro-protocol';

import {outcomesEqual} from '../state-utils';
import {SimpleAllocation} from '../types';
import {BN} from '../bignumber';

const simpleAllocation1: SimpleAllocation = {
  type: 'SimpleAllocation',
  assetHolderAddress: AddressZero,
  allocationItems: [{destination: HashZero as Destination, amount: BN.from('0x2')}]
};

const simpleAllocation2: SimpleAllocation = {
  type: 'SimpleAllocation',
  assetHolderAddress: AddressZero,
  allocationItems: [{destination: HashZero as Destination, amount: BN.from('0x02')}]
};

describe('outcomesEqual', () => {
  it('returns equal for identical SimpleAllocations', async () => {
    expect(outcomesEqual(simpleAllocation1, simpleAllocation1)).toEqual(true);
  });

  it('returns equal for equivalent SimpleAllocations', async () => {
    expect(outcomesEqual(simpleAllocation1, simpleAllocation2)).toEqual(true);
  });
});

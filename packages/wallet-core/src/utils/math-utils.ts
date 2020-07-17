import {BigNumberish} from 'ethers';

import {BN} from '../bignumber';

// This stuff should be replaced with some big number logic

export const add = (a: BigNumberish, b: BigNumberish) => BN.add(a || 0, b || 0);

export const subtract = (a: BigNumberish, b: BigNumberish) => {
  const numA = BN.from(a || 0);
  const numB = BN.from(b || 0);
  if (BN.gt(numB, numA)) {
    throw new Error('Unsafe subtraction');
  }
  return BN.sub(numA, numB);
};
export const max = (a: BigNumberish, b: BigNumberish) => (BN.gt(a, b) ? BN.from(a) : BN.from(b));

export const gt = (a: BigNumberish, b: BigNumberish) => Number(a) > Number(b);
export const eq = (a: BigNumberish, b: BigNumberish) => Number(a) === Number(b);

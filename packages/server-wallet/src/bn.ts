import {BigNumber as BN, BigNumberish} from 'ethers';

type T = BigNumberish;
const compare = (method: 'eq' | 'lt' | 'gt' | 'lte' | 'gte') => (a: T, b: T): boolean =>
  typeof a === typeof b && BN.from(a)[method](b);

const op = (method: 'add' | 'sub' | 'mul') => (a: T, b: T) => {
  if (typeof a === 'string' || typeof b === 'string') {
    return BN.from(a)
      [method](b)
      .toHexString();
  } else {
    return BN.from(a)
      [method](b)
      .toNumber();
  }
};

export const BigNumber = {
  eq: compare('eq'),
  lt: compare('lt'),
  gt: compare('gt'),
  lte: compare('lte'),
  gte: compare('gte'),
  add: op('add'),
  sub: op('sub'),
  mul: op('mul')
};

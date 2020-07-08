import {BigNumber as EthersBigNumber, BigNumberish} from 'ethers';
import {Uint256} from './store-types';

type T = BigNumberish;
const compare = (method: 'eq' | 'lt' | 'gt' | 'lte' | 'gte') => (a: T, b: T): boolean =>
  typeof a === typeof b && EthersBigNumber.from(a)[method](b);

const op = (method: 'add' | 'sub' | 'mul') => (a: T, b: T) => {
  if (typeof a === 'string' || typeof b === 'string') {
    return EthersBigNumber.from(a)
      [method](b)
      .toHexString();
  } else {
    return EthersBigNumber.from(a)
      [method](b)
      .toNumber();
  }
};

export class BigNumber extends EthersBigNumber {
  static eq = compare('eq');
  static lt = compare('lt');
  static gt = compare('gt');
  static lte = compare('lte');
  static gte = compare('gte');
  static add = op('add');
  static sub = op('sub');
  static mul = op('mul');
}

import {BigNumber as EthersBigNumber, BigNumberish} from 'ethers';
import {Uint256} from './types';

type T = BigNumberish;

const binaryOperator = <S extends any = Uint256>(name: keyof EthersBigNumber) => (
  a: T,
  b: T
): S => {
  if (typeof EthersBigNumber.from(a)[name] !== 'function') throw Error(`Invalid method ${name}`);

  const result = (EthersBigNumber.from(a)[name] as any)(b);

  return EthersBigNumber.isBigNumber(result) ? result.toHexString() : result;
};

const unaryOperator = <S extends any = Uint256>(name: keyof EthersBigNumber) => (a: T): S => {
  if (typeof EthersBigNumber.from(a)[name] !== 'function') throw Error(`Invalid method ${name}`);

  const result = (EthersBigNumber.from(a)[name] as any)();
  return EthersBigNumber.isBigNumber(result) ? result.toHexString() : result;
};

/**
 * This is a convenience class that looks like instances of ether's BigNumber class.
 * This way, people can call
 * ```
 * BN.eq(2, '3') // false
 * BN.add('0x123', 4) // '0x661'
 * BN.add('0xabc', 10) // '0xac6'
 */

export class BN {
  static eq = binaryOperator<boolean>('eq');
  static lt = binaryOperator<boolean>('lt');
  static gt = binaryOperator<boolean>('gt');
  static lte = binaryOperator<boolean>('lte');
  static gte = binaryOperator<boolean>('gte');
  static add = binaryOperator('add');
  static sub = binaryOperator('sub');
  static mul = binaryOperator('mul');
  static div = binaryOperator('div');
  static mod = binaryOperator('mod');
  static pow = binaryOperator('pow');
  static abs = unaryOperator('abs');
  static isNegative = unaryOperator<boolean>('isNegative');
  static isZero = unaryOperator<boolean>('isZero');
  static toNumber = unaryOperator<number>('toNumber');
  static toHexString = unaryOperator('toHexString');

  static from = (n: BigNumberish | BN): Uint256 => EthersBigNumber.from(n).toHexString() as Uint256;
  static isBigNumber = val => typeof val === 'string' && !!val.match(/^0x[0-9A-Fa-f]{0,64}$/);
}

export const Zero = BN.from(0);

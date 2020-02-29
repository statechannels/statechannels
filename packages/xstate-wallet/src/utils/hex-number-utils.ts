import {BigNumber, bigNumberify} from 'ethers/utils';
import {HexNumberString} from '../store/types';

type numberish = number | HexNumberString | BigNumber;

export function toHex(value: number | HexNumberString | BigNumber): HexNumberString {
  if (typeof value === 'number') {
    return bigNumberify(value).toHexString();
  } else if (typeof value === 'string') {
    // TODO: Check if formatted properly?
    return value;
  } else {
    return value.toHexString();
  }
}

function toBN(a: numberish): BigNumber {
  return bigNumberify(toHex(a));
}
export function toNumber(a: numberish): number {
  return bigNumberify(a).toNumber();
}

export function compare(a: numberish, b: numberish): number {
  const difference = toBN(a).sub(toBN(b));
  return difference.gt(0) ? 1 : difference.eq(0) ? 0 : -1;
}

export function gt(a: numberish, b: numberish): boolean {
  return compare(a, b) > 0;
}
export function gte(a: numberish, b: numberish): boolean {
  return compare(a, b) >= 0;
}
export function lt(a: numberish, b: numberish): boolean {
  return compare(a, b) < 0;
}
export function lte(a: numberish, b: numberish): boolean {
  return compare(a, b) <= 0;
}
export function eq(a: numberish, b: numberish): boolean {
  return compare(a, b) === 0;
}

export function add(a: numberish, b: numberish): HexNumberString {
  return toBN(a)
    .add(toBN(b))
    .toHexString();
}

export function sub(a: numberish, b: numberish): HexNumberString {
  return toBN(a)
    .sub(toBN(b))
    .toHexString();
}

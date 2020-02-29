import {BigNumber, bigNumberify} from 'ethers/utils';
import {HexNumberString, isHexNumberString} from '../store/types';

type numberish = number | HexNumberString | BigNumber | string;

export function toString(value: numberish): string {
  return (toHex(value) as unknown) as string;
}
export function toHex(value: number | HexNumberString | BigNumber | string): HexNumberString {
  const hexValue = bigNumberify(value as string | BigNumber | number).toHexString();
  if (isHexNumberString(hexValue)) {
    return hexValue;
  } else {
    throw new Error(`Value ${hexValue} is not a properly formatted hex string`);
  }
}

function toBN(a: numberish): BigNumber {
  return bigNumberify(toHex(a) as any);
}
export function toNumber(a: numberish): number {
  return toBN(a).toNumber();
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
  return toHex(
    toBN(a)
      .add(toBN(b))
      .toHexString()
  );
}

export function sub(a: numberish, b: numberish): HexNumberString {
  return toHex(
    toBN(a)
      .sub(toBN(b))
      .toHexString()
  );
}

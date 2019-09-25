import { bigNumberify } from 'ethers/utils';

export function addHex(a: string, b: string): string {
  return bigNumberify(a)
    .add(bigNumberify(b))
    .toHexString();
}
export function subHex(a: string, b: string): string {
  return bigNumberify(a)
    .sub(bigNumberify(b))
    .toHexString();
}

export function eqHex(a: string, b: string) {
  return bigNumberify(a).eq(b);
}

export function eqHexArray(a: string[], b: string[]): boolean {
  return (
    a.length === b.length &&
    a.reduce((equalsSoFar, aVal, idx) => equalsSoFar && eqHex(aVal, b[idx]), true)
  );
}

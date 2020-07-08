import { BigNumber } from 'ethers';

const bigNumberify = (n: number | string) => BigNumber.from(n);
export function addHex(a: string, b: string): string {
  return bigNumberify(a)
    .add(bigNumberify(b))
    .toHexString();
}

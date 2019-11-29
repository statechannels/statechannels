import {bigNumberify} from 'ethers/utils';

export function addHex(a: string, b: string): string {
  return bigNumberify(a)
    .add(bigNumberify(b))
    .toHexString();
}

import { toHex32, padBytes32 } from './utils';

export function pack(stateType, aBal, bBal, points) {
  return (
    "0x" +
    toHex32(stateType) +
    toHex32(aBal) +
    toHex32(bBal) +
    toHex32(points)
  );
}

import BN from 'bn.js';
import { padBytes32 } from 'fmg-core';

export default function bnToHex(bn: BN) {
  return padBytes32('0x' + bn.toString(16));
}

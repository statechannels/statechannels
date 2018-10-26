import BN from 'bn.js';

export default function hexToBN(hex: string) {
  return new BN(hex.slice(2), 16);
}

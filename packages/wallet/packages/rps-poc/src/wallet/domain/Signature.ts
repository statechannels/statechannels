import { toDecimal, isHexStrict } from 'web3-utils';
export class Signature {
  // TODO: move to fmg-core
  signature: string;
  r: string;
  s: string;
  v: number;

  constructor(signature: string) {
    if (!isHexStrict(signature)) {
      throw new Error('Invalid input: signature must be a hex string');
    }

    if (signature.length !== 132) {
      throw new Error('Invalid input: signature must be 65 bytes');
    }

    this.signature = signature;
    this.r = '0x' + signature.slice(2, 66);
    this.s = '0x' + signature.slice(66, 130);
    this.v = toDecimal('0x' + signature.slice(130, 132));
  }
}

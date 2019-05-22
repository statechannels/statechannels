import { Address, Uint256 } from 'fmg-core';

export class Blockchain {
  static async fund(channelID: Address, expectedHeld: Uint256, value: Uint256): Promise<Uint256> {
    return new Promise<string>((resolve, reject) => resolve('a'));
  }
}

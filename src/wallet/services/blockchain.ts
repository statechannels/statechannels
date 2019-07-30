import { Address, Uint256 } from 'fmg-core';

import * as AsyncLock from 'async-lock';
import { nitroAdjudicator } from '../utilities/blockchain';
const lock = new AsyncLock();
export class Blockchain {
  static nitro: any;
  static async fund(channelID: Address, expectedHeld: Uint256, value: Uint256): Promise<Uint256> {
    // We lock to prevent issues with the transaction nonce getting out of sync in ethers.js
    return lock.acquire('depositing', async () => {
      await Blockchain.attachNitro();

      const tx = await Blockchain.nitro.deposit(channelID, expectedHeld, { value });
      await tx.wait();

      return (await Blockchain.nitro.holdings(channelID)).toString();
    });
  }

  static async holdings(channelID: Address): Promise<Uint256> {
    await Blockchain.attachNitro();

    return await Blockchain.nitro.holdings(channelID).toHexString();
  }

  private static async attachNitro() {
    Blockchain.nitro = Blockchain.nitro || (await nitroAdjudicator());
  }
}

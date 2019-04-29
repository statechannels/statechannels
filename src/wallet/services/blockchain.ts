import { Address, Uint256 } from 'fmg-core';

import { nitroAdjudicator } from '../utilities/blockchain';

export class Blockchain {
  static nitro: any;
  static async fund(channelID: Address, value: Uint256): Promise<Uint256> {
    await Blockchain.attachNitro();

    const tx = await Blockchain.nitro.deposit(channelID, { value });
    await tx.wait();

    return (await Blockchain.nitro.holdings(channelID)).toString();
  }

  static async holdings(channelID: Address): Promise<Uint256> {
    await Blockchain.attachNitro();

    return await Blockchain.nitro.holdings(channelID).toHexString();
  }

  private static async attachNitro() {
    Blockchain.nitro = Blockchain.nitro || (await nitroAdjudicator());
  }
}

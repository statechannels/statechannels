import AsyncLock from 'async-lock';
import {Address, Uint256} from '../../types';
import {ethAssetHolder} from '../utilities/blockchain';

const lock = new AsyncLock();
export class Blockchain {
  static ethAssetHolder: any;
  static async fund(channelID: Address, expectedHeld: Uint256, value: Uint256): Promise<Uint256> {
    // We lock to avoid this issue: https://github.com/ethers-io/ethers.js/issues/363
    // When ethers.js attempts to run multiple transactions around the same time it results in an error
    // due to the nonce getting out of sync.
    // To avoid this we only allow deposit transactions to happen serially.
    await Blockchain.attachEthAssetHolder();

    return lock.acquire('depositing', async () => {
      const tx = await Blockchain.ethAssetHolder.deposit(channelID, expectedHeld, value, {
        value
      });
      await tx.wait();

      return (await Blockchain.ethAssetHolder.holdings(channelID)).toString();
    });
  }

  static async holdings(channelID: Address): Promise<Uint256> {
    await Blockchain.attachEthAssetHolder();

    return await Blockchain.ethAssetHolder.holdings(channelID).toHexString();
  }

  private static async attachEthAssetHolder() {
    if (Blockchain.ethAssetHolder) {
      return;
    }
    const newAssetHolder = await ethAssetHolder();
    // eslint-disable-next-line require-atomic-updates
    Blockchain.ethAssetHolder = Blockchain.ethAssetHolder || newAssetHolder;
  }
}

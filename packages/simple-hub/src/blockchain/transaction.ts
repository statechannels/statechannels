import AsyncLock from 'async-lock';
import {ethAssetHolder} from './asset-holder';
import {Contract} from 'ethers';

const lock = new AsyncLock();
export class Blockchain {
  static ethAssetHolder: Contract;
  static async fund(channelID: string, expectedHeld: string, value: string): Promise<string> {
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

  private static async attachEthAssetHolder() {
    if (Blockchain.ethAssetHolder) {
      return;
    }
    const newAssetHolder = await ethAssetHolder();
    Blockchain.ethAssetHolder = Blockchain.ethAssetHolder || newAssetHolder;
  }
}

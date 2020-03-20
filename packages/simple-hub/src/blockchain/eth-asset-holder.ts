import AsyncLock from 'async-lock';
import {Contract, ContractFactory, ethers, providers} from 'ethers';
import {BigNumber} from 'ethers/utils';
import {ContractArtifacts} from '@statechannels/nitro-protocol';
import {cHubChainPK} from '../constants';

const rpcEndpoint = process.env.RPC_ENDPOINT;
const provider = new providers.JsonRpcProvider(rpcEndpoint);
const walletWithProvider = new ethers.Wallet(cHubChainPK, provider);

const lock = new AsyncLock();
export class Blockchain {
  static ethAssetHolder: Contract;
  static async fund(channelID: string, value: BigNumber): Promise<string> {
    // We lock to avoid this issue: https://github.com/ethers-io/ethers.js/issues/363
    // When ethers.js attempts to run multiple transactions around the same time it results in an error
    // due to the nonce getting out of sync.
    // To avoid this we only allow deposit transactions to happen serially.
    await Blockchain.attachEthAssetHolder();

    return lock.acquire('depositing', async release => {
      const expectedHeld: BigNumber = await Blockchain.ethAssetHolder.holdings(channelID);
      if (expectedHeld.gte(value)) return;

      const tx = await Blockchain.ethAssetHolder.deposit(
        channelID,
        expectedHeld.toHexString(),
        value,
        {value: value.sub(expectedHeld)}
      );
      await tx.wait();

      const holdings = await Blockchain.ethAssetHolder.holdings(channelID).toString();
      release();
      return holdings;
    });
  }

  private static async attachEthAssetHolder() {
    if (Blockchain.ethAssetHolder) {
      return Blockchain.ethAssetHolder;
    }
    const newAssetHolder = await createEthAssetHolder();
    Blockchain.ethAssetHolder = Blockchain.ethAssetHolder || newAssetHolder;
    return Blockchain.ethAssetHolder;
  }
}

export async function createEthAssetHolder() {
  let ethAssetHolderFactory: ContractFactory;
  try {
    ethAssetHolderFactory = await ContractFactory.fromSolidity(
      ContractArtifacts.EthAssetHolderArtifact,
      walletWithProvider
    );
  } catch (err) {
    if (err.message.match('bytecode must be a valid hex string')) {
      throw new Error(`Contract not deployed on network ${process.env.CHAIN_NETWORK_ID}`);
    }

    throw err;
  }

  const contract = await ethAssetHolderFactory.attach(process.env.ETH_ASSET_HOLDER_ADDRESS);

  return contract;
}

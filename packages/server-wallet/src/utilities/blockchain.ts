import {ContractArtifacts} from '@statechannels/nitro-protocol';
import {Contract, ContractFactory, ethers, providers} from 'ethers';

import config from '../config';

const rpcEndpoint = config.rpcEndpoint;
const provider = new providers.JsonRpcProvider(rpcEndpoint);
const walletWithProvider = new ethers.Wallet(config.serverSignerPrivateKey, provider);

export async function ethAssetHolder(): Promise<Contract> {
  let ethAssetHolderFactory: ContractFactory;
  try {
    ethAssetHolderFactory = await ContractFactory.fromSolidity(
      ContractArtifacts.EthAssetHolderArtifact,
      walletWithProvider
    );
  } catch (err) {
    if (err.message.match('bytecode must be a valid hex string')) {
      throw new Error(`Contract not deployed on network ${config.chainNetworkID}`);
    }

    throw err;
  }

  if (!config.ethAssetHolderAddress) {
    throw new Error('ETH_ASSET_HOLDER_ADDRESS not defined');
  }

  const contract = await ethAssetHolderFactory.attach(config.ethAssetHolderAddress);

  return contract;
}

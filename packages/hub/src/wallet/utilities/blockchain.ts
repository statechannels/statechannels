import EthAssetHolderArtifact from '@statechannels/nitro-protocol/build/contracts/ETHAssetHolder.json';
import {getNetworkContext} from '@statechannels/ganache-deployer';

import {ContractFactory, ethers, providers} from 'ethers';
import {HUB_SIGNER_PRIVATE_KEY} from '../../constants';

const neworkIdToRpcEndpoint = networkId => {
  if (networkId === process.env.ROPSTEN_NETWORK_ID) {
    return process.env.INFURA_JSON_RPC_ENDPOINT;
  } else {
    // Assuming Ganache
    return process.env.GANACHE_JSON_RPC_ENDPOINT;
  }
};

const rpcEndpoint = neworkIdToRpcEndpoint(process.env.CHAIN_NETWORK_ID);
const provider = new providers.JsonRpcProvider(rpcEndpoint);
const walletWithProvider = new ethers.Wallet(HUB_SIGNER_PRIVATE_KEY, provider);

export async function ethAssetHolder() {
  return setupContract(EthAssetHolderArtifact);
}

async function setupContract(artifact: any) {
  let ethAssetHolderFactory;
  try {
    ethAssetHolderFactory = await ContractFactory.fromSolidity(artifact, walletWithProvider);
  } catch (err) {
    if (err.message.match('bytecode must be a valid hex string')) {
      throw new Error(`Contract not deployed on network ${process.env.CHAIN_NETWORK_ID}`);
    }

    throw err;
  }

  const networkContext = getNetworkContext();
  // eslint-disable-next-line
  const contract = await ethAssetHolderFactory.attach(networkContext['ETHAssetHolder'].address);

  return contract;
}

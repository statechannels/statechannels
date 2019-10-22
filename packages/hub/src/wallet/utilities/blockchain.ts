import * as contracts from '../../utilities/contracts';

import { ContractFactory, ethers, providers } from 'ethers';
import { linkedByteCode } from 'magmo-devtools';
import { HUB_SIGNER_PRIVATE_KEY } from '../../constants';

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

export async function nitroAdjudicator() {
  return setupContract(contracts.nitroAdjudicatorArtifact);
}

async function setupContract(artifact: any) {
  Object.defineProperty(artifact, 'bytecode', {
    value: linkedByteCode(artifact, contracts.commitmentArtifact, process.env.CHAIN_NETWORK_ID),
  });
  Object.defineProperty(artifact, 'bytecode', {
    value: linkedByteCode(artifact, contracts.rulesArtifact, process.env.CHAIN_NETWORK_ID),
  });

  let nitroFactory;
  try {
    nitroFactory = await ContractFactory.fromSolidity(artifact, walletWithProvider);
  } catch (err) {
    if (err.message.match('bytecode must be a valid hex string')) {
      throw new Error(`Contract not deployed on network ${process.env.CHAIN_NETWORK_ID}`);
    }

    throw err;
  }
  const contract = await nitroFactory.attach(
    artifact.networks[process.env.CHAIN_NETWORK_ID].address,
  );

  return contract;
}

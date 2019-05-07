import * as contracts from '../../utilities/contracts';

import { ContractFactory, ethers, providers } from 'ethers';
import { linkedByteCode } from 'magmo-devtools';
import { HUB_SIGNER_PRIVATE_KEY } from '../../constants';

const provider = new providers.JsonRpcProvider(process.env.JSON_RPS_ENDPOINT);
const walletWithProvider = new ethers.Wallet(HUB_SIGNER_PRIVATE_KEY, provider);

export async function nitroAdjudicator() {
  return setupContract(contracts.nitroAdjudicatorArtifact);
}

async function setupContract(artifact: any) {
  Object.defineProperty(artifact, 'bytecode', {
    value: linkedByteCode(artifact, contracts.commitmentArtifact, process.env.NETWORK_ID),
  });
  Object.defineProperty(artifact, 'bytecode', {
    value: linkedByteCode(artifact, contracts.rulesArtifact, process.env.NETWORK_ID),
  });

  let nitroFactory;
  try {
    nitroFactory = await ContractFactory.fromSolidity(artifact, walletWithProvider);
  } catch (err) {
    if (err.message.match('bytecode must be a valid hex string')) {
      throw new Error(`Contract not deployed on network ${process.env.NETWORK_ID}`);
    }

    throw err;
  }
  const contract = await nitroFactory.attach(artifact.networks[process.env.NETWORK_ID].address);

  return contract;
}

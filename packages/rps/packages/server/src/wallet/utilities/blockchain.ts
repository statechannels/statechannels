import * as CommitmentArtifact from 'magmo-common-data/prebuilt-contracts/Commitment.json';
import * as nitroAdjudicatorArtifact from 'magmo-common-data/prebuilt-contracts/NitroAdjudicator.json';
import * as RulesArtifact from 'magmo-common-data/prebuilt-contracts/Rules.json';

import { ContractFactory, ethers, providers } from 'ethers';
import { linkedByteCode } from 'magmo-devtools';
import { HUB_SIGNER_PRIVATE_KEY } from '../../constants';

const provider = new providers.JsonRpcProvider(process.env.JSON_RPS_ENDPOINT);
const walletWithProvider = new ethers.Wallet(HUB_SIGNER_PRIVATE_KEY, provider);

export async function nitroAdjudicator() {
  return setupContract(nitroAdjudicatorArtifact);
}

async function setupContract(artifact: any) {
  Object.defineProperty(artifact, 'bytecode', {
    value: linkedByteCode(artifact, CommitmentArtifact, process.env.NETWORK_ID),
  });
  Object.defineProperty(artifact, 'bytecode', {
    value: linkedByteCode(artifact, RulesArtifact, process.env.NETWORK_ID),
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

import { ethers } from 'ethers';
import { getWalletWithEthAndProvider, linkedByteCode, getNetworkId } from 'magmo-devtools';

// @ts-ignore
import CommitmentArtifact from '../build/contracts/Commitment.json';
// @ts-ignore
import CountingCommitmentArtifact from '../build/contracts/CountingCommitment.json';
// @ts-ignore
import CountingAppArtifact from '../build/contracts/CountingApp.json';

export async function getCountingApp() {
  const networkId = await getNetworkId();

  CountingAppArtifact.bytecode = linkedByteCode(CountingAppArtifact, CommitmentArtifact, networkId);
  CountingAppArtifact.bytecode = linkedByteCode(
    CountingAppArtifact,
    CountingCommitmentArtifact,
    networkId,
  );

  const wallet = getWalletWithEthAndProvider();

  const address = CountingAppArtifact.networks[networkId].address;
  return ethers.ContractFactory.fromSolidity(CountingAppArtifact, wallet).attach(address);
}

import { ContractFactory, ethers } from 'ethers';
import linker from 'solc/linker';
import { getNetworkId, getGanacheProvider } from 'magmo-devtools';
import { Channel, asEthersObject, Commitment } from 'fmg-core';
import CommitmentArtifact from '../build/contracts/Commitment.json';
import ConsensusCommitmentArtifact from '../build/contracts/ConsensusCommitment.json';
import TestConsensusCommitmentArtifact from '../build/contracts/TestConsensusCommitment.json';

import { commitments as ConsensusApp } from '../src/consensus-app';

jest.setTimeout(20000);
let consensusCommitment: ethers.Contract;
const provider = getGanacheProvider();
const providerSigner = provider.getSigner();

async function setupContracts() {
  const networkId = await getNetworkId();

  ConsensusCommitmentArtifact.bytecode = linker.linkBytecode(ConsensusCommitmentArtifact.bytecode, {
    Commitment: CommitmentArtifact.networks[networkId].address,
  });

  TestConsensusCommitmentArtifact.bytecode = linker.linkBytecode(
    TestConsensusCommitmentArtifact.bytecode,
    { Commitment: CommitmentArtifact.networks[networkId].address },
  );

  TestConsensusCommitmentArtifact.bytecode = linker.linkBytecode(
    TestConsensusCommitmentArtifact.bytecode,
    { ConsensusCommitment: ConsensusCommitmentArtifact.networks[networkId].address },
  );

  consensusCommitment = await ContractFactory.fromSolidity(
    TestConsensusCommitmentArtifact,
    providerSigner,
  ).deploy();
  await consensusCommitment.deployed();
}

describe('ConsensusCommitment', () => {
  const participantA = new ethers.Wallet(
    '6cbed15c793ce57650b9877cf6fa156fbef513c4e6134f022a85b1ffdd59b2a1',
  );
  const participantB = new ethers.Wallet(
    '6370fd033278c143179d81c5526140625662b8daa446c22ee2d73db3707e620c',
  );
  const participants = [participantA.address, participantB.address];
  const proposedDestination = [participantB.address];

  const allocation = [
    ethers.utils.bigNumberify(5).toHexString(),
    ethers.utils.bigNumberify(4).toHexString(),
  ];
  const proposedAllocation = [ethers.utils.bigNumberify(9).toHexString()];

  const channel: Channel = { channelType: participantB.address, nonce: 0, participants }; // just use any valid address
  const defaults = { channel, allocation, destination: participants };
  const commitment: Commitment = ConsensusApp.appCommitment({
    ...defaults,
    turnNum: 6,
    commitmentCount: 0,
    consensusCounter: 1,
    proposedAllocation,
    proposedDestination,
  });

  it('works', async () => {
    await setupContracts();
    const consensusCommitmentAttrs = await consensusCommitment.fromFrameworkCommitment(
      asEthersObject(commitment),
    );

    expect(consensusCommitmentAttrs).toMatchObject({
      consensusCounter: 1,
      // currentAllocation: allocation, // TODO: Figure out how to compare BigNumber and Uint256
      currentDestination: participants,
      // proposedAllocation,
      proposedDestination,
    });
  });
});

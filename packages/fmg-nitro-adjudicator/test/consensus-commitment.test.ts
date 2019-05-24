import { ethers } from 'ethers';
import { getNetworkId, getGanacheProvider } from 'magmo-devtools';
import { Channel, asEthersObject, Commitment, CommitmentType } from 'fmg-core';
import TestConsensusCommitmentArtifact from '../build/contracts/TestConsensusCommitment.json';

import { UpdateType, initialConsensus, asCoreCommitment, propose } from '../src/consensus-app';
import { bigNumberify } from 'ethers/utils';

jest.setTimeout(20000);
let consensusCommitment: ethers.Contract;
const provider = getGanacheProvider();
const providerSigner = provider.getSigner();

async function setupContracts() {
  const networkId = await getNetworkId();
  const address = TestConsensusCommitmentArtifact.networks[networkId].address;
  const abi = TestConsensusCommitmentArtifact.abi;
  consensusCommitment = await new ethers.Contract(address, abi, provider);
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
  const commitment: Commitment = asCoreCommitment(
    propose(
      {
        ...defaults,
        turnNum: 6,
        commitmentCount: 0,
        commitmentType: CommitmentType.App,
        appAttributes: {
          proposedAllocation,
          proposedDestination,
          furtherVotesRequired: 0,
          updateType: UpdateType.Consensus,
        },
      },
      proposedAllocation,
      proposedDestination,
    ),
  );

  it('works', async () => {
    await setupContracts();
    const consensusCommitmentAttrs = await consensusCommitment.fromFrameworkCommitment(
      asEthersObject(commitment),
    );

    const consensusCommitmentObject = convertToConsensusCommitmentObject(consensusCommitmentAttrs);
    expect(consensusCommitmentObject).toMatchObject({
      furtherVotesRequired: 1,
      currentAllocation: allocation,
      currentDestination: participants,
      proposedAllocation,
      proposedDestination,
      updateType: UpdateType.Proposal,
    });
  });
});

// TODO: Will this ever be needed outside of this test?
// Normally we just want to convert to AppAttrs
function convertToConsensusCommitmentObject(consensusCommitmentArgs) {
  return {
    furtherVotesRequired: parseInt(consensusCommitmentArgs[0], 10),
    currentAllocation: consensusCommitmentArgs[1].map(bigNumberify).map(bn => bn.toHexString()),
    currentDestination: consensusCommitmentArgs[2],
    proposedAllocation: consensusCommitmentArgs[3].map(bigNumberify).map(bn => bn.toHexString()),
    proposedDestination: consensusCommitmentArgs[4],
    updateType: parseInt(consensusCommitmentArgs[5], 10),
  };
}

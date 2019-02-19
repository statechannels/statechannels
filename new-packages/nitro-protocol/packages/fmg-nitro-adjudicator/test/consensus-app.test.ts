import { ContractFactory, ethers } from 'ethers';
import linker from 'solc/linker';
import {
  getNetworkId,
  getGanacheProvider,
  assertRevert,
  delay,
} from 'magmo-devtools';
import { Channel, BigNumber, ethereumArgs } from 'fmg-core';

import CommitmentArtifact from '../build/contracts/Commitment.json';
import RulesArtifact from '../build/contracts/Rules.json';
import ConsensusCommitmentArtifact from '../build/contracts/ConsensusCommitment.json';
import ConsensusAppArtifact from '../build/contracts/ConsensusApp.json';

import { commitments } from '../src/consensus-app';

jest.setTimeout(20000);
let consensusApp: ethers.Contract;
const provider = getGanacheProvider();
const providerSigner = provider.getSigner();

async function setupContracts() {
  const networkId = await getNetworkId();

  ConsensusCommitmentArtifact.bytecode = linker.linkBytecode(
    ConsensusCommitmentArtifact.bytecode,
    { Commitment: CommitmentArtifact.networks[networkId].address },
  );

  ConsensusAppArtifact.bytecode = linker.linkBytecode(
    ConsensusAppArtifact.bytecode,
    {
      Commitment: CommitmentArtifact.networks[networkId].address,
      Rules: RulesArtifact.networks[networkId].address,
      ConsensusCommitment: ConsensusCommitmentArtifact.networks[networkId].address,
    }
  );

  consensusApp = await ContractFactory.fromSolidity(ConsensusAppArtifact, providerSigner).deploy();
  await consensusApp.deployed();
}

async function invalidTransition(fromCommitment, toCommitment, reason?) {
  assertRevert(
    consensusApp.validTransition(ethereumArgs(fromCommitment), ethereumArgs(toCommitment)),
    reason
  );
}

async function validTransition(fromCommitment, toCommitment) {
  expect(await consensusApp.validTransition(ethereumArgs(fromCommitment), ethereumArgs(toCommitment))).toBe(true);
}

describe('ConsensusApp', () => {
  afterEach(async () => {
    await delay(); // ensure that asserted reverts are captured before the jest test exits
  });

  const participantA = new ethers.Wallet(
    '6cbed15c793ce57650b9877cf6fa156fbef513c4e6134f022a85b1ffdd59b2a1',
  );
  const participantB = new ethers.Wallet(
    '6370fd033278c143179d81c5526140625662b8daa446c22ee2d73db3707e620c',
  );
  const participantC = new ethers.Wallet(
    '5e1b32fb763f62e1d19a9c9cd8c5417bd31b7d697ee018a8afe3cac2292fdd3e'
  );
  const participants = [participantA.address, participantB.address, participantC.address];
  const NUM_PARTICIPANTS = participants.length;
  const proposedDestination = [participantA.address, participantB.address];

  const allocation = [new BigNumber(1), new BigNumber(2), new BigNumber(3)];
  const proposedAllocation = [new BigNumber(4), new BigNumber(2)];

  const channel: Channel = { channelType: participantB.address, channelNonce: new BigNumber(0), participants }; // just use any valid address
  const defaults = { channel, allocation, destination: participants, turnNum: 6, proposedDestination, proposedAllocation, commitmentCount: 0 };

  beforeAll(async () => {
    await setupContracts();
  });

  it.skip('reverts when the proposed allocation and the proposed destination are the incorrect length', async () => {
    // I think this test should fail, since this requirement prevents
    // the nitro protocol
    const fromCommitment = commitments.appCommitment({
      ...defaults,
      turnNum: 6,
      consensusCounter: 0,
    });
    const toCommitment = commitments.appCommitment({
      ...defaults,
       allocation: proposedAllocation,
       destination: participants,
       turnNum: 6,
       consensusCounter: 1,
       proposedAllocation: [new BigNumber(1), new BigNumber(2)],
       proposedDestination: [participantA.address], 
    });
    invalidTransition(fromCommitment, toCommitment, "ConsensusApp: newCommitment.proposedAllocation.length must match newCommitment.proposedDestination.length");
  });

  it('reverts when the consensusCount does not increment and is not reset', async () => {
    const fromCommitment = commitments.appCommitment({
      ...defaults,
      turnNum: 6,
      consensusCounter: 0,
    });
    const toCommitment = commitments.appCommitment({
      ...defaults,
       turnNum: 6,
       consensusCounter: 2,

    });
    invalidTransition(fromCommitment, toCommitment, "ConsensusApp: Invalid input -- consensus counters out of range");
  });

  describe('when the consensus round has finished', () => {
    const fromCommitment = commitments.appCommitment({
      ...defaults,
      turnNum: 6,
      consensusCounter: NUM_PARTICIPANTS - 1,
    });
    const toCommitmentArgs = {
      ...defaults,
      allocation: proposedAllocation,
      destination: proposedDestination,
      turnNum: 6,
      consensusCounter: 0,
    };

    it('returns true when the current balances have properly been set', async () => {
      const toCommitment = commitments.appCommitment(toCommitmentArgs);
      validTransition(fromCommitment, toCommitment);
    });

    it('reverts when the consensusCounter is not reset', async () => {
      const toCommitment = commitments.appCommitment({
        ...toCommitmentArgs,
        consensusCounter: 1,
      });

      invalidTransition(fromCommitment, toCommitment, "ConsensusApp: consensus counter must be reset at the end of the consensus round");
    });

    it('reverts when the new commitment\'s proposed allocation does not match the new commitment\'s current allocation ', async () => {
      const toCommitment = commitments.appCommitment({
        ...toCommitmentArgs,
        allocation: [new BigNumber(99)],
        destination: [participantA.address],
      });

      invalidTransition(fromCommitment, toCommitment, "ConsensusApp: newCommitment.currentAllocation must match newCommitment.proposedAllocation at the end of the consensus round");
    });
    it('reverts when the new commitment\'s proposed destination does not match the new commitment\'s current destination ', async () => {
      const toCommitment = commitments.appCommitment({
        ...toCommitmentArgs,
        destination: participants,
      });

      invalidTransition(fromCommitment, toCommitment, "ConsensusApp: newCommitment.currentDestination must match newCommitment.proposedDestination at the end of the consensus round");
    });
  });

  describe('when the consensus round is ongoing and the counter was not reset', () => {
    const fromCommitment = commitments.appCommitment({
      ...defaults,
      consensusCounter: 0,
    });
    const toCommitmentArgs = {
      ...defaults,
      consensusCounter: 1,
    };
    it('returns true when the consensus round is ongoing and the proposed balances haven\'t changed', async () => {
      const toCommitment = commitments.appCommitment(toCommitmentArgs);
      validTransition(fromCommitment, toCommitment);
    });

    it('reverts when the currentAllocation changes', async () => {
      const toCommitment = commitments.appCommitment({
        ...toCommitmentArgs,
        allocation: [new BigNumber(99)],
        destination: [participantA.address],
      });

      invalidTransition(fromCommitment, toCommitment, "ConsensusApp: currentAllocations must match during consensus round");
    });
    it('reverts when the currentDestination changes', async () => {
      const toCommitment = commitments.appCommitment({
        ...toCommitmentArgs,
        allocation,
        destination: [participantB.address, participantA.address, participantC.address],
      });

      invalidTransition(fromCommitment, toCommitment, "ConsensusApp: currentDestinations must match during consensus round");
    });

    it('reverts when the proposedAllocation changes', async () => {
      const toCommitment = commitments.appCommitment({
        ...toCommitmentArgs,
        proposedAllocation: [new BigNumber(99), new BigNumber(88)],
      });

      invalidTransition(fromCommitment, toCommitment, "ConsensusApp: proposedAllocations must match during consensus round");
    });

    it('reverts when the proposedDestination changes', async () => {
      const toCommitment = commitments.appCommitment({
        ...toCommitmentArgs,
        proposedDestination: [participantB.address, participantA.address],
      });

      invalidTransition(fromCommitment, toCommitment, "ConsensusApp: proposedDestinations must match during consensus round");
    });
  });

  describe('when the consensus round is ongoing and the counter was reset', () => {
    const fromCommitment = commitments.appCommitment({
      ...defaults,
      consensusCounter: 1,
    });
    const toCommitmentArgs = {
      ...defaults,
      consensusCounter: 0,
    };
    it('returns true when the consensus round is reset before the end of the round', async () => {
      const toCommitment = commitments.appCommitment(toCommitmentArgs);
      validTransition(fromCommitment, toCommitment);
    });

    it('reverts when the currentAllocation changes', async () => {
      const toCommitment = commitments.appCommitment({
        ...toCommitmentArgs,
        allocation: proposedAllocation,
      });

      invalidTransition(fromCommitment, toCommitment, "CountingApp: currentAllocations must be equal when resetting the consensusCounter before the end of the round");
    });
    it('reverts when the currentDestination changes', async () => {
      const toCommitment = commitments.appCommitment({
        ...toCommitmentArgs,
        allocation,
        destination: [participantB.address, participantA.address, participantC.address],
      });

      invalidTransition(fromCommitment, toCommitment, "CountingApp: currentDestinations must be equal when resetting the consensusCounter before the end of the round");
    });
  });
});
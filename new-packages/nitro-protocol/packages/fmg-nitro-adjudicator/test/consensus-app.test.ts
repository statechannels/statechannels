import { ethers } from 'ethers';
import { getNetworkId, getGanacheProvider, expectRevert, delay } from 'magmo-devtools';
import { Channel, ethereumArgs, toUint256, Commitment } from 'fmg-core';

import ConsensusAppArtifact from '../build/contracts/ConsensusApp.json';

import { commitments, UpdateType } from '../src/consensus-app';

jest.setTimeout(20000);
let consensusApp: ethers.Contract;
const provider = getGanacheProvider();
const providerSigner = provider.getSigner();

async function setupContracts() {
  const networkId = await getNetworkId();
  const address = ConsensusAppArtifact.networks[networkId].address;
  const abi = ConsensusAppArtifact.abi;
  consensusApp = await new ethers.Contract(address, abi, provider);
}

async function invalidTransition(fromCommitment, toCommitment, reason?) {
  expect.assertions(1);
  await expectRevert(
    () => consensusApp.validTransition(ethereumArgs(fromCommitment), ethereumArgs(toCommitment)),
    reason,
  );
}

async function validTransition(fromCommitment, toCommitment) {
  expect(
    await consensusApp.validTransition(ethereumArgs(fromCommitment), ethereumArgs(toCommitment)),
  ).toBe(true);
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
    '5e1b32fb763f62e1d19a9c9cd8c5417bd31b7d697ee018a8afe3cac2292fdd3e',
  );
  const participants = [participantA.address, participantB.address, participantC.address];
  const NUM_PARTICIPANTS = participants.length;
  const proposedDestination = [participantA.address, participantB.address];

  const allocation = [toUint256(1), toUint256(2), toUint256(3)];
  const proposedAllocation = [toUint256(4), toUint256(2)];

  const channel: Channel = { channelType: participantB.address, nonce: 0, participants }; // just use any valid address
  const defaults = {
    channel,
    allocation,
    destination: participants,
    turnNum: 6,
    proposedDestination,
    proposedAllocation,
    commitmentCount: 0,
  };

  beforeAll(async () => {
    await setupContracts();
  });

  describe('the propose transition', async () => {
    const fromCommitmentArgs = {
      ...defaults,
      turnNum: 6,
      furtherVotesRequired: 0,
      updateType: UpdateType.Consensus,
    };
    const toCommitmentArgs = {
      ...defaults,
      allocation,
      destination: participants,
      turnNum: 6,
      furtherVotesRequired: 2,
      updateType: UpdateType.Proposal,
    };

    it('returns true on a valid transition', async () => {
      const fromCommitment = commitments.appCommitment(fromCommitmentArgs);
      const toCommitment = commitments.appCommitment(toCommitmentArgs);
      await validTransition(fromCommitment, toCommitment);
    });

    itRevertsWhenTheBalancesAreChanged(fromCommitmentArgs, toCommitmentArgs);

    itRevertsWhenFurtherVotesRequiredIsNotIntialized(fromCommitmentArgs, toCommitmentArgs);
  });

  describe('the pass transition', async () => {
    const fromCommitmentArgs = {
      ...defaults,
      turnNum: 6,
      furtherVotesRequired: 0,
      updateType: UpdateType.Consensus,
    };
    const toCommitmentArgs = {
      ...defaults,
      turnNum: 6,
      furtherVotesRequired: 0,
      updateType: UpdateType.Consensus,
    };

    it('returns true on a valid transition', async () => {
      const fromCommitment = commitments.appCommitment(fromCommitmentArgs);
      const toCommitment = commitments.appCommitment(toCommitmentArgs);
      await validTransition(fromCommitment, toCommitment);
    });

    itRevertsWhenTheBalancesAreChanged(fromCommitmentArgs, toCommitmentArgs);
    itRevertsWhenTheProposalsAreChanged(fromCommitmentArgs, toCommitmentArgs);
  });

  describe('the propose alternative transition', async () => {
    const fromCommitmentArgs = {
      ...defaults,
      turnNum: 6,
      furtherVotesRequired: 1,
      updateType: UpdateType.Proposal,
    };
    const toCommitmentArgs = {
      ...defaults,
      turnNum: 6,
      furtherVotesRequired: 2,
      updateType: UpdateType.Proposal,
    };

    it('returns true on a valid transition', async () => {
      const fromCommitment = commitments.appCommitment(fromCommitmentArgs);
      const toCommitment = commitments.appCommitment(toCommitmentArgs);
      await validTransition(fromCommitment, toCommitment);
    });

    it('reverts when the furtherVotesRequired is not re-initialized', async () => {
      const fromCommitment = commitments.appCommitment({ ...fromCommitmentArgs });
      const toCommitment = commitments.appCommitment({
        ...toCommitmentArgs,
        furtherVotesRequired: 1,
      });
      await invalidTransition(fromCommitment, toCommitment);
    });
    itRevertsWhenTheBalancesAreChanged(fromCommitmentArgs, toCommitmentArgs);
  });

  describe('the vote transition', async () => {
    const fromCommitmentArgs = {
      ...defaults,
      turnNum: 6,
      furtherVotesRequired: 2,
      updateType: UpdateType.Proposal,
    };
    const toCommitmentArgs = {
      ...defaults,
      turnNum: 6,
      furtherVotesRequired: 1,
      updateType: UpdateType.Proposal,
    };

    it('returns true on a valid transition', async () => {
      const fromCommitment = commitments.appCommitment(fromCommitmentArgs);
      const toCommitment = commitments.appCommitment(toCommitmentArgs);
      await validTransition(fromCommitment, toCommitment);
    });

    itRevertsWhenFurtherVotesRequiredIsNotDecremented(fromCommitmentArgs, toCommitmentArgs);
    itRevertsWhenTheBalancesAreChanged(fromCommitmentArgs, toCommitmentArgs);
    itRevertsWhenTheProposalsAreChanged(fromCommitmentArgs, toCommitmentArgs);
  });

  describe('the final vote transition', async () => {
    const fromCommitmentArgs = {
      ...defaults,
      turnNum: 6,
      furtherVotesRequired: 1,
      updateType: UpdateType.Proposal,
    };
    const toCommitmentArgs = {
      ...defaults,
      turnNum: 6,
      furtherVotesRequired: 0,
      proposedAllocation: [],
      proposedDestination: [],
      allocation: proposedAllocation,
      destination: proposedDestination,
      updateType: UpdateType.Consensus,
    };

    it('returns true on a valid transition', async () => {
      const fromCommitment = commitments.appCommitment(fromCommitmentArgs);
      const toCommitment = commitments.appCommitment(toCommitmentArgs);
      await validTransition(fromCommitment, toCommitment);
    });

    itRevertsForAnInvalidConsensusState(fromCommitmentArgs, toCommitmentArgs);
    itRevertsWhenTheBalancesAreNotUpdated(fromCommitmentArgs, toCommitmentArgs);
  });

  describe('the veto transition', async () => {
    const fromCommitmentArgs = {
      ...defaults,
      turnNum: 6,
      furtherVotesRequired: 2,
      updateType: UpdateType.Proposal,
    };
    const toCommitmentArgs = {
      ...defaults,
      turnNum: 6,
      proposedAllocation: [],
      proposedDestination: [],
      furtherVotesRequired: 3,
      updateType: UpdateType.Consensus,
    };

    it('returns true on a valid transition', async () => {
      const fromCommitment = commitments.appCommitment(fromCommitmentArgs);
      const toCommitment = commitments.appCommitment(toCommitmentArgs);
      await validTransition(fromCommitment, toCommitment);
    });

    itRevertsWhenTheBalancesAreChanged(fromCommitmentArgs, toCommitmentArgs);
    itRevertsForAnInvalidConsensusState(fromCommitmentArgs, toCommitmentArgs);
  });

  // Helper functions
  function itRevertsForAnInvalidConsensusState(fromCommitmentArgs, toCommitmentArgs) {
    it('reverts when the proposedAllocation is not empty', async () => {
      const fromCommitment = commitments.appCommitment({ ...fromCommitmentArgs });

      const toCommitmentAllocation = commitments.appCommitment({
        ...toCommitmentArgs,
        proposedAllocation: allocation,
      });

      await invalidTransition(
        fromCommitment,
        toCommitmentAllocation,
        "ConsensusApp: 'proposedAllocation' must be reset during consensus.",
      );
    });
    it('reverts when the proposedDestination is not empty', async () => {
      const fromCommitment = commitments.appCommitment({ ...fromCommitmentArgs });

      const toCommitmentAllocation = commitments.appCommitment({
        ...toCommitmentArgs,
        proposedDestination: participants,
      });

      await invalidTransition(
        fromCommitment,
        toCommitmentAllocation,
        "ConsensusApp: 'proposedDestination' must be reset during consensus.",
      );
    });
  }

  function itRevertsWhenFurtherVotesRequiredIsNotIntialized(fromCommitmentArgs, toCommitmentArgs) {
    it('reverts when further votes requires is not initialized properly', async () => {
      const fromCommitment = commitments.appCommitment({ ...fromCommitmentArgs });
      const toCommitment = commitments.appCommitment({
        ...toCommitmentArgs,
        furtherVotesRequired: 0,
      });
      await invalidTransition(
        fromCommitment,
        toCommitment,
        'Consensus App: furtherVotesRequired needs to be initialized to the correct value.',
      );
    });
  }

  function itRevertsWhenFurtherVotesRequiredIsNotDecremented(fromCommitmentArgs, toCommitmentArgs) {
    it('reverts when further votes requires is not decremented properly', async () => {
      const fromCommitment = commitments.appCommitment({ ...fromCommitmentArgs });
      const toCommitment = commitments.appCommitment({
        ...toCommitmentArgs,
        furtherVotesRequired: 0,
      });
      await invalidTransition(
        fromCommitment,
        toCommitment,
        'Consensus App: furtherVotesRequired should be decremented by 1',
      );
    });
  }

  function itRevertsWhenTheBalancesAreNotUpdated(fromCommitmentArgs, toCommitmentArgs) {
    it('reverts when the allocation is not updated', async () => {
      const fromCommitment = commitments.appCommitment({ ...fromCommitmentArgs });

      const toCommitmentDifferentAllocation = commitments.appCommitment({
        ...toCommitmentArgs,
        allocation,
      });

      await invalidTransition(fromCommitment, toCommitmentDifferentAllocation);
    });
    it('reverts when the destination is not updated', async () => {
      const fromCommitment = commitments.appCommitment({ ...fromCommitmentArgs });

      const toCommitmentDifferentDestination = commitments.appCommitment({
        ...toCommitmentArgs,
        destination: participants,
      });

      await invalidTransition(fromCommitment, toCommitmentDifferentDestination);
    });
  }

  function itRevertsWhenTheBalancesAreChanged(fromCommitmentArgs, toCommitmentArgs) {
    it('reverts when the allocation is changed', async () => {
      const fromCommitment = commitments.appCommitment({ ...fromCommitmentArgs });

      const toCommitmentDifferentAllocation = commitments.appCommitment({
        ...toCommitmentArgs,
        allocation: proposedAllocation,
      });

      await invalidTransition(
        fromCommitment,
        toCommitmentDifferentAllocation,
        "ConsensusApp: 'allocation' must be the same between commitments.",
      );
    });
    it('reverts when the destination is changed', async () => {
      const fromCommitment = commitments.appCommitment({ ...fromCommitmentArgs });

      const toCommitmentDifferentDestination = commitments.appCommitment({
        ...toCommitmentArgs,
        destination: proposedDestination,
      });

      await invalidTransition(
        fromCommitment,
        toCommitmentDifferentDestination,
        "ConsensusApp: 'destination' must be the same between commitments.",
      );
    });
  }

  function itRevertsWhenTheProposalsAreChanged(fromCommitmentArgs, toCommitmentArgs) {
    it('reverts when the proposedAllocation is changed', async () => {
      const fromCommitment = commitments.appCommitment({ ...fromCommitmentArgs });

      const toCommitmentDifferentAllocation = commitments.appCommitment({
        ...toCommitmentArgs,
        proposedAllocation: allocation,
      });

      await invalidTransition(
        fromCommitment,
        toCommitmentDifferentAllocation,
        "ConsensusApp: 'proposedAllocation' must be the same between commitments.",
      );
    });
    it('reverts when the proposedDestination is changed', async () => {
      const fromCommitment = commitments.appCommitment({ ...fromCommitmentArgs });

      const toCommitmentDifferentDestination = commitments.appCommitment({
        ...toCommitmentArgs,
        proposedDestination: participants,
      });

      await invalidTransition(
        fromCommitment,
        toCommitmentDifferentDestination,
        "ConsensusApp: 'proposedDestination' must be the same between commitments.",
      );
    });
  }
});

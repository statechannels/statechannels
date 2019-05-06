import { ethers } from 'ethers';
import { getNetworkId, getGanacheProvider, expectRevert, delay } from 'magmo-devtools';
import { Channel, ethereumArgs, toUint256 } from 'fmg-core';

import ConsensusAppArtifact from '../build/contracts/ConsensusApp.json';

import {
  commitments,
  propose,
  initialConsensus,
  pass,
  proposeAlternative,
  vote,
  ConsensusBaseCommitment,
  finalVote,
  veto,
} from '../src/consensus-app';

jest.setTimeout(20000);
let consensusApp: ethers.Contract;
const provider = getGanacheProvider();

async function setupContracts() {
  const networkId = await getNetworkId();
  const address = ConsensusAppArtifact.networks[networkId].address;
  const abi = ConsensusAppArtifact.abi;
  consensusApp = await new ethers.Contract(address, abi, provider);
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

  const oneVoteComplete = propose(
    initialConsensus(defaults),
    proposedAllocation,
    proposedDestination,
  );
  const twoVotesComplete = vote(
    propose(initialConsensus(defaults), proposedAllocation, proposedDestination),
  );

  beforeAll(async () => {
    await setupContracts();
  });

  describe('the propose transition', async () => {
    const fromCommitment = initialConsensus(defaults);
    const toCommitment = propose(fromCommitment, proposedAllocation, proposedDestination);
    it('returns true on a valid transition', async () => {
      await validTransition(fromCommitment, toCommitment);
    });

    itRevertsWhenTheBalancesAreChanged(fromCommitment, toCommitment);

    itRevertsWhenFurtherVotesRequiredIsNotIntialized(fromCommitment, toCommitment);
  });

  describe('the pass transition', async () => {
    const fromCommitment = initialConsensus(defaults);
    const toCommitment = pass(fromCommitment);

    it('returns true on a valid transition', async () => {
      await validTransition(fromCommitment, toCommitment);
    });

    itRevertsWhenTheBalancesAreChanged(fromCommitment, toCommitment);
    itRevertsWhenTheProposalsAreChanged(fromCommitment, toCommitment);
  });

  describe('the propose alternative transition', async () => {
    const fromCommitment = oneVoteComplete;

    const alternativeProposedDestination = [participantA.address];
    const alternativeProposedAllocation = [toUint256(6)];

    const toCommitment = proposeAlternative(
      fromCommitment,
      alternativeProposedAllocation,
      alternativeProposedDestination,
    );

    it('returns true on a valid transition', async () => {
      await validTransition(fromCommitment, toCommitment);
    });

    it('reverts when the furtherVotesRequired is not re-initialized', async () => {
      await invalidTransition(fromCommitment, {
        ...toCommitment,
        furtherVotesRequired: 1,
      });
    });
    itRevertsWhenTheBalancesAreChanged(fromCommitment, toCommitment);
  });

  describe('the vote transition', async () => {
    const fromCommitment = oneVoteComplete;
    const toCommitment = vote(fromCommitment);

    it('returns true on a valid transition', async () => {
      await validTransition(fromCommitment, toCommitment);
    });

    itRevertsWhenFurtherVotesRequiredIsNotDecremented(fromCommitment, toCommitment);
    itRevertsWhenTheBalancesAreChanged(fromCommitment, toCommitment);
    itRevertsWhenTheProposalsAreChanged(fromCommitment, toCommitment);
  });

  describe('the final vote transition', async () => {
    const fromCommitment = twoVotesComplete;
    const toCommitment = finalVote(fromCommitment);

    it('returns true on a valid transition', async () => {
      await validTransition(fromCommitment, toCommitment);
    });

    itRevertsForAnInvalidConsensusState(fromCommitment, toCommitment);
    itRevertsWhenTheBalancesAreNotUpdated(fromCommitment, toCommitment);
  });

  describe('the veto transition', async () => {
    const fromCommitment = oneVoteComplete;

    const toCommitment = veto(fromCommitment);

    it('returns true on a valid transition', async () => {
      await validTransition(fromCommitment, toCommitment);
    });

    itRevertsWhenTheBalancesAreChanged(fromCommitment, toCommitment);
    itRevertsForAnInvalidConsensusState(fromCommitment, toCommitment);
  });

  // Helper functions

  async function invalidTransition(
    fromConsensusCommitment: ConsensusBaseCommitment,
    toConsensusCommitment: ConsensusBaseCommitment,
    reason?,
  ) {
    expect.assertions(1);
    const fromCommitment = commitments.appCommitment(fromConsensusCommitment);
    const toCommitment = commitments.appCommitment(toConsensusCommitment);
    await expectRevert(
      () => consensusApp.validTransition(ethereumArgs(fromCommitment), ethereumArgs(toCommitment)),
      reason,
    );
  }

  async function validTransition(
    fromConsensusCommitment: ConsensusBaseCommitment,
    toConsensusCommitment: ConsensusBaseCommitment,
  ) {
    const fromCommitment = commitments.appCommitment(fromConsensusCommitment);
    const toCommitment = commitments.appCommitment(toConsensusCommitment);
    expect(
      await consensusApp.validTransition(ethereumArgs(fromCommitment), ethereumArgs(toCommitment)),
    ).toBe(true);
  }

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
      const toCommitment = {
        ...toCommitmentArgs,
        furtherVotesRequired: 0,
      };
      await invalidTransition(
        fromCommitmentArgs,
        toCommitment,
        'Consensus App: furtherVotesRequired needs to be initialized to the correct value.',
      );
    });
  }

  function itRevertsWhenFurtherVotesRequiredIsNotDecremented(fromCommitmentArgs, toCommitmentArgs) {
    it('reverts when further votes requires is not decremented properly', async () => {
      const toCommitment = {
        ...toCommitmentArgs,
        furtherVotesRequired: 0,
      };
      await invalidTransition(
        fromCommitmentArgs,
        toCommitment,
        'Consensus App: furtherVotesRequired should be decremented by 1',
      );
    });
  }

  function itRevertsWhenTheBalancesAreNotUpdated(fromCommitmentArgs, toCommitmentArgs) {
    it('reverts when the allocation is not updated', async () => {
      const toCommitmentDifferentAllocation = {
        ...toCommitmentArgs,
        allocation,
      };

      await invalidTransition(fromCommitmentArgs, toCommitmentDifferentAllocation);
    });
    it('reverts when the destination is not updated', async () => {
      const toCommitmentDifferentDestination = {
        ...toCommitmentArgs,
        destination: participants,
      };

      await invalidTransition(fromCommitmentArgs, toCommitmentDifferentDestination);
    });
  }

  function itRevertsWhenTheBalancesAreChanged(fromCommitmentArgs, toCommitmentArgs) {
    it('reverts when the allocation is changed', async () => {
      const toCommitmentDifferentAllocation = {
        ...toCommitmentArgs,
        allocation: proposedAllocation,
      };

      await invalidTransition(
        fromCommitmentArgs,
        toCommitmentDifferentAllocation,
        "ConsensusApp: 'allocation' must be the same between commitments.",
      );
    });
    it('reverts when the destination is changed', async () => {
      const toCommitmentDifferentDestination = {
        ...toCommitmentArgs,
        destination: proposedDestination,
      };

      await invalidTransition(
        fromCommitmentArgs,
        toCommitmentDifferentDestination,
        "ConsensusApp: 'destination' must be the same between commitments.",
      );
    });
  }

  function itRevertsWhenTheProposalsAreChanged(fromCommitmentArgs, toCommitmentArgs) {
    it('reverts when the proposedAllocation is changed', async () => {
      const toCommitmentDifferentAllocation = {
        ...toCommitmentArgs,
        proposedAllocation: allocation,
      };

      await invalidTransition(
        fromCommitmentArgs,
        toCommitmentDifferentAllocation,
        "ConsensusApp: 'proposedAllocation' must be the same between commitments.",
      );
    });
    it('reverts when the proposedDestination is changed', async () => {
      const toCommitmentDifferentDestination = {
        ...toCommitmentArgs,
        proposedDestination: participants,
      };

      await invalidTransition(
        fromCommitmentArgs,
        toCommitmentDifferentDestination,
        "ConsensusApp: 'proposedDestination' must be the same between commitments.",
      );
    });
  }
});

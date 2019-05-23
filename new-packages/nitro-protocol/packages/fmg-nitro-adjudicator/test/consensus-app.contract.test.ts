import { ethers } from 'ethers';
import { getNetworkId, getGanacheProvider, expectRevert, delay } from 'magmo-devtools';
import { Channel, ethereumArgs, toUint256, CommitmentType } from 'fmg-core';

import ConsensusAppArtifact from '../build/contracts/ConsensusApp.json';

import {
  propose,
  initialConsensus,
  pass,
  vote,
  ConsensusBaseCommitment,
  finalVote,
  veto,
  AppCommitment,
  asCoreCommitment,
  UpdateType,
  AppAttributes,
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
  const participantD = new ethers.Wallet(
    '0cd211e36788b51c08ec3c622266e0eaddb6a1a028a8fbdd60797c6adf7a3392',
  );
  const participants = [
    participantA.address,
    participantB.address,
    participantC.address,
    participantD.address,
  ];
  const proposedDestination = [participantA.address, participantB.address];

  const allocation = [toUint256(1), toUint256(2), toUint256(3), toUint256(4)];
  const proposedAllocation = [toUint256(6), toUint256(4)];
  const alternativeProposedDestination = [participantB.address, participantC.address];
  const alternativeProposedAllocation = [toUint256(4), toUint256(6)];

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
  const threeVotesComplete = vote(
    vote(propose(initialConsensus(defaults), proposedAllocation, proposedDestination)),
  );

  beforeAll(async () => {
    await setupContracts();
  });

  describe('validConsensusCommitment', () => {
    const fromCommitment = threeVotesComplete;
    const toCommitment = finalVote(fromCommitment);
    itRevertsForAnInvalidConsensusCommitment(fromCommitment, toCommitment);
  });

  describe('validProposeCommitment', () => {
    const fromCommitment = initialConsensus(defaults);
    const toCommitment = propose(fromCommitment, proposedAllocation, proposedDestination);
    itRevertsForAnInvalidProposeCommitment(fromCommitment, toCommitment);
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
    itRevertsForAnInvalidConsensusCommitment(fromCommitment, toCommitment);
  });

  describe('the vote transition', async () => {
    const fromCommitment = twoVotesComplete;
    const toCommitment = vote(fromCommitment);

    itReturnsTrueOnAValidTransition(fromCommitment, toCommitment);
    itRevertsWhenFurtherVotesRequiredIsNotDecremented(fromCommitment, toCommitment);
    itRevertsWhenTheBalancesAreChanged(fromCommitment, toCommitment);
    itRevertsWhenTheProposalsAreChanged(fromCommitment, toCommitment);
  });

  describe('the final vote transition', async () => {
    const fromCommitment = threeVotesComplete;
    const toCommitment = finalVote(fromCommitment);

    itReturnsTrueOnAValidTransition(fromCommitment, toCommitment);
    itRevertsWhenTheBalancesAreNotUpdated(fromCommitment, toCommitment);
  });

  describe('the veto transition', async () => {
    const fromCommitment = oneVoteComplete;
    const toCommitment = veto(fromCommitment);

    itReturnsTrueOnAValidTransition(fromCommitment, toCommitment);
    itRevertsWhenTheBalancesAreChanged(fromCommitment, toCommitment);
  });

  // Helper functions

  function appCommitment(
    c: ConsensusBaseCommitment,
    attrs?: Partial<AppAttributes>,
  ): AppCommitment {
    switch (c.appAttributes.updateType) {
      case UpdateType.Proposal:
        return {
          ...c,
          commitmentType: CommitmentType.App,
          appAttributes: {
            ...c.appAttributes,
            ...attrs,
            updateType: UpdateType.Proposal,
          },
        };
      case UpdateType.Consensus:
        return {
          ...c,
          commitmentType: CommitmentType.App,
          appAttributes: {
            ...c.appAttributes,
            ...attrs,
            updateType: UpdateType.Consensus,
          },
        };
    }
  }

  async function invalidTransition(
    fromConsensusCommitment: ConsensusBaseCommitment,
    toConsensusCommitment: ConsensusBaseCommitment,
    reason?,
  ) {
    expect.assertions(1);
    const fromCommitment = appCommitment(fromConsensusCommitment);
    const toCommitment = appCommitment(toConsensusCommitment);
    await expectRevert(
      async () =>
        await consensusApp.validTransition(
          ethereumArgs(asCoreCommitment(fromCommitment)),
          ethereumArgs(asCoreCommitment(toCommitment)),
        ),
      reason,
    );
  }

  async function validTransition(
    fromConsensusCommitment: ConsensusBaseCommitment,
    toConsensusCommitment: ConsensusBaseCommitment,
  ) {
    const fromCommitment = appCommitment(fromConsensusCommitment);
    const toCommitment = appCommitment(toConsensusCommitment);
    expect(
      await consensusApp.validTransition(
        ethereumArgs(asCoreCommitment(fromCommitment)),
        ethereumArgs(asCoreCommitment(toCommitment)),
      ),
    ).toBe(true);
  }

  function itReturnsTrueOnAValidTransition(fromCommitment, toCommitment) {
    it('returns true on a valid transition', async () => {
      await validTransition(fromCommitment, toCommitment);
    });
  }

  function itRevertsForAnInvalidConsensusCommitment(fromCommitmentArgs, toCommitmentArgs) {
    it('reverts when the furtherVotesRequired is not zero', async () => {
      const fromCommitment = appCommitment(fromCommitmentArgs);

      const toCommitmentAllocation = appCommitment(toCommitmentArgs, {
        furtherVotesRequired: 1,
      });

      await invalidTransition(
        fromCommitment,
        toCommitmentAllocation,
        "ConsensusApp: 'furtherVotesRequired' must be 0 during consensus.",
      );
    });

    it('reverts when the proposedAllocation is not empty', async () => {
      const fromCommitment = appCommitment(fromCommitmentArgs);
      const toCommitmentAllocation = appCommitment(toCommitmentArgs, {
        proposedAllocation: allocation,
      });

      await invalidTransition(
        fromCommitment,
        toCommitmentAllocation,
        "ConsensusApp: 'proposedAllocation' must be reset during consensus.",
      );
    });

    it('reverts when the proposedDestination is not empty', async () => {
      const fromCommitment = appCommitment(fromCommitmentArgs);

      const toCommitmentAllocation = appCommitment(toCommitmentArgs, {
        proposedDestination: participants,
      });

      await invalidTransition(
        fromCommitment,
        toCommitmentAllocation,
        "ConsensusApp: 'proposedDestination' must be reset during consensus.",
      );
    });
  }

  function itRevertsForAnInvalidProposeCommitment(fromCommitmentArgs, toCommitmentArgs) {
    it('reverts when the furtherVotesRequired is zero', async () => {
      const fromCommitment = appCommitment(fromCommitmentArgs);

      const toCommitmentAllocation = appCommitment(toCommitmentArgs, {
        furtherVotesRequired: 0,
      });

      await invalidTransition(
        fromCommitment,
        toCommitmentAllocation,
        "ConsensusApp: 'furtherVotesRequired' must not be 0 during propose.",
      );
    });

    it('reverts when the proposedAllocation is empty', async () => {
      const fromCommitment = appCommitment(fromCommitmentArgs);

      const toCommitmentAllocation = appCommitment(toCommitmentArgs, {
        proposedAllocation: [],
      });

      await invalidTransition(
        fromCommitment,
        toCommitmentAllocation,
        "ConsensusApp: 'proposedAllocation' must not be empty during propose.",
      );
    });

    it('reverts when the proposedDestination and proposedAllocation are not the same length', async () => {
      const fromCommitment = appCommitment(fromCommitmentArgs);

      const toCommitmentAllocation = appCommitment(toCommitmentArgs, {
        proposedAllocation,
        proposedDestination: participants,
      });

      await invalidTransition(
        fromCommitment,
        toCommitmentAllocation,
        "ConsensusApp: 'proposedDestination' and 'proposedAllocation' must be the same length during propose.",
      );
    });
  }

  function itRevertsWhenFurtherVotesRequiredIsNotIntialized(fromCommitmentArgs, toCommitmentArgs) {
    it('reverts when further votes requires is not initialized properly', async () => {
      const toCommitment = appCommitment(toCommitmentArgs, { furtherVotesRequired: 1 });
      await invalidTransition(
        fromCommitmentArgs,
        toCommitment,
        'Consensus App: furtherVotesRequired needs to be initialized to the correct value.',
      );
    });
  }

  function itRevertsWhenFurtherVotesRequiredIsNotDecremented(fromCommitmentArgs, toCommitmentArgs) {
    it('reverts when further votes requires is not decremented properly', async () => {
      const toCommitment = appCommitment(toCommitmentArgs, {
        furtherVotesRequired: fromCommitmentArgs.appAttributes.furtherVotesRequired,
      });

      await invalidTransition(
        fromCommitmentArgs,
        toCommitment,
        'Consensus App: furtherVotesRequired should be decremented by 1',
      );
    });
  }

  function itRevertsWhenTheBalancesAreNotUpdated(fromCommitmentArgs, toCommitmentArgs) {
    it('reverts when the allocation is not updated', async () => {
      const toCommitmentDifferentAllocation = appCommitment({
        ...toCommitmentArgs,
        allocation,
      });

      await invalidTransition(fromCommitmentArgs, toCommitmentDifferentAllocation);
    });
    it('reverts when the destination is not updated', async () => {
      const toCommitmentDifferentDestination = appCommitment({
        ...toCommitmentArgs,
        destination: participants,
      });

      await invalidTransition(fromCommitmentArgs, toCommitmentDifferentDestination);
    });
  }

  function itRevertsWhenTheBalancesAreChanged(fromCommitmentArgs, toCommitmentArgs) {
    it('reverts when the allocation is changed', async () => {
      const toCommitmentDifferentAllocation = appCommitment({
        ...toCommitmentArgs,
        allocation: proposedAllocation,
      });

      await invalidTransition(
        fromCommitmentArgs,
        toCommitmentDifferentAllocation,
        "ConsensusApp: 'allocation' must be the same between ",
      );
    });
    it('reverts when the destination is changed', async () => {
      const toCommitmentDifferentDestination = appCommitment({
        ...toCommitmentArgs,
        destination: proposedDestination,
      });

      await invalidTransition(
        fromCommitmentArgs,
        toCommitmentDifferentDestination,
        "ConsensusApp: 'destination' must be the same between ",
      );
    });
  }

  function itRevertsWhenTheProposalsAreChanged(fromCommitmentArgs, toCommitmentArgs) {
    it('reverts when the proposedAllocation is changed', async () => {
      const toCommitmentDifferentAllocation = appCommitment(toCommitmentArgs, {
        proposedAllocation: alternativeProposedAllocation,
      });

      await invalidTransition(
        fromCommitmentArgs,
        toCommitmentDifferentAllocation,
        "ConsensusApp: 'proposedAllocation' must be the same between ",
      );
    });
    it('reverts when the proposedDestination is changed', async () => {
      const toCommitmentDifferentDestination = appCommitment(toCommitmentArgs, {
        proposedDestination: alternativeProposedDestination,
      });

      await invalidTransition(
        fromCommitmentArgs,
        toCommitmentDifferentDestination,
        "ConsensusApp: 'proposedDestination' must be the same between ",
      );
    });
  }
});

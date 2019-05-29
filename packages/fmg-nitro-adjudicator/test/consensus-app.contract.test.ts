import { ethers } from 'ethers';
import { getNetworkId, getGanacheProvider, expectRevert, delay } from 'magmo-devtools';
import { Channel, ethereumArgs, toUint256, CommitmentType } from 'fmg-core';

import TestConsensusAppArtifact from '../build/contracts/TestConsensusApp.json';

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
  AppAttributes,
  consensusCommitmentArgs,
} from '../src/consensus-app';

jest.setTimeout(20000);
let consensusApp: ethers.Contract;
const provider = getGanacheProvider();

async function setupContracts() {
  const networkId = await getNetworkId();
  const address = TestConsensusAppArtifact.networks[networkId].address;
  const abi = TestConsensusAppArtifact.abi;
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
  const twoVotesComplete = vote(oneVoteComplete);
  const threeVotesComplete = vote(twoVotesComplete);
  const fourVotesComplete = finalVote(threeVotesComplete);

  beforeAll(async () => {
    await setupContracts();
  });

  describe('validTransition', () => {
    const fromCommitment = initialConsensus(defaults);
    const toCommitment = initialConsensus(defaults);
    const consensusCommitment = appCommitment(fourVotesComplete, {
      proposedAllocation: allocation,
    });
    const proposalCommitment = appCommitment(threeVotesComplete, {
      proposedAllocation: [],
    });

    it('calls the consensus commitment validator on the new commitment', async () => {
      await invalidTransition(
        fromCommitment,
        consensusCommitment,
        "ConsensusApp: 'proposedAllocation' must be reset during consensus.",
      );
    });

    it('calls the propose commitment validators on the new commitment', async () => {
      await invalidTransition(
        fromCommitment,
        proposalCommitment,
        "ConsensusApp: 'proposedAllocation' must not be empty during propose.",
      );
    });

    it('calls the consensus commitment validator on the new commitment', async () => {
      await invalidTransition(
        consensusCommitment,
        toCommitment,
        "ConsensusApp: 'proposedAllocation' must be reset during consensus.",
      );
    });

    it('calls the propose commitment validator on the new commitment', async () => {
      await invalidTransition(
        proposalCommitment,
        toCommitment,
        "ConsensusApp: 'proposedAllocation' must not be empty during propose.",
      );
    });
  });

  describe('the propose transition', async () => {
    const fromCommitment = initialConsensus(defaults);
    const toCommitment = propose(fromCommitment, proposedAllocation, proposedDestination);

    itReturnsTrueOnAValidTransition(fromCommitment, toCommitment);
    itRevertsWhenTheBalancesAreChanged(fromCommitment, toCommitment);
  });

  describe('the pass transition', async () => {
    const fromCommitment = initialConsensus(defaults);
    const toCommitment = pass(fromCommitment);

    itReturnsTrueOnAValidTransition(fromCommitment, toCommitment);
    itRevertsWhenTheBalancesAreChanged(fromCommitment, toCommitment);
  });

  describe('the vote transition', async () => {
    const fromCommitment = twoVotesComplete;
    const toCommitment = vote(fromCommitment);

    itReturnsTrueOnAValidTransition(fromCommitment, toCommitment);
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
  });

  describe('validConsensusCommitment', () => {
    const validatorName = 'validateConsensusCommitment';
    const commitmentArgs = finalVote(threeVotesComplete);

    it('reverts when the furtherVotesRequired is not zero', async () => {
      const commitmentAllocation = appCommitment(commitmentArgs, {
        furtherVotesRequired: 1,
      });

      await invalidCommitment(
        commitmentAllocation,
        validatorName,
        "ConsensusApp: 'furtherVotesRequired' must be 0 during consensus.",
      );
    });

    it('reverts when the proposedAllocation is not empty', async () => {
      const commitmentAllocation = appCommitment(commitmentArgs, {
        proposedAllocation: allocation,
      });

      await invalidCommitment(
        commitmentAllocation,
        validatorName,
        "ConsensusApp: 'proposedAllocation' must be reset during consensus.",
      );
    });

    it('reverts when the proposedDestination is not empty', async () => {
      const commitmentAllocation = appCommitment(commitmentArgs, {
        proposedDestination: participants,
      });

      await invalidCommitment(
        commitmentAllocation,
        validatorName,
        "ConsensusApp: 'proposedDestination' must be reset during consensus.",
      );
    });
  });

  describe('validateProposeCommitment', () => {
    const validatorName: CommitmentValidator = 'validateProposeCommitment';
    const commitmentArgs = propose(
      initialConsensus(defaults),
      proposedAllocation,
      proposedDestination,
    );

    it('reverts when the furtherVotesRequired is zero', async () => {
      const commitmentAllocation = appCommitment(commitmentArgs, {
        furtherVotesRequired: 0,
      });

      await invalidCommitment(
        commitmentAllocation,
        validatorName,
        "ConsensusApp: 'furtherVotesRequired' must not be 0 during propose.",
      );
    });

    it('reverts when the proposedAllocation is empty', async () => {
      const commitmentAllocation = appCommitment(commitmentArgs, {
        proposedAllocation: [],
      });

      await invalidCommitment(
        commitmentAllocation,
        validatorName,
        "ConsensusApp: 'proposedAllocation' must not be empty during propose.",
      );
    });

    it('reverts when the proposedDestination and proposedAllocation are not the same length', async () => {
      const commitmentAllocation = appCommitment(commitmentArgs, {
        proposedAllocation,
        proposedDestination: participants,
      });

      await invalidCommitment(
        commitmentAllocation,
        validatorName,
        "ConsensusApp: 'proposedDestination' and 'proposedAllocation' must be the same length during propose.",
      );
    });
  });

  // Helper functions

  function appCommitment(
    c: ConsensusBaseCommitment,
    attrs?: Partial<AppAttributes>,
  ): AppCommitment {
    return {
      ...c,
      commitmentType: CommitmentType.App,
      appAttributes: {
        ...c.appAttributes,
        ...attrs,
      },
    };
  }

  type CommitmentValidator = 'validateProposeCommitment' | 'validateConsensusCommitment';

  function getCommitmentValidator(validatorName: CommitmentValidator): (c) => any {
    return c => consensusApp[`${validatorName}Pub`](consensusCommitmentArgs(c));
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

  async function invalidCommitment(
    consensusCommitment: ConsensusBaseCommitment,
    validatorName: CommitmentValidator,
    reason?,
  ) {
    expect.assertions(1);
    const commitment = appCommitment(consensusCommitment);
    await expectRevert(async () => await getCommitmentValidator(validatorName)(commitment), reason);
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

  async function expectInvalidCommitment(
    commitment: AppCommitment,
    validatorName: CommitmentValidator,
    reason?,
  ) {
    if (reason) {
      expectRevert(async () => await getCommitmentValidator(validatorName)(commitment), reason);
    } else {
      expectRevert(async () => await getCommitmentValidator(validatorName)(commitment));
    }
  }

  async function expectValidCommitment(
    commitment: AppCommitment,
    validatorName: CommitmentValidator,
  ) {
    expect(await getCommitmentValidator(validatorName)(commitment)).toBe(true);
  }

  function itReturnsTrueOnAValidTransition(fromCommitment, toCommitment) {
    it('returns true on a valid transition', async () => {
      validTransition(fromCommitment, toCommitment);
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

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
  const twoVotesComplete = vote(
    propose(initialConsensus(defaults), proposedAllocation, proposedDestination),
  );
  const threeVotesComplete = vote(
    vote(propose(initialConsensus(defaults), proposedAllocation, proposedDestination)),
  );

  beforeAll(async () => {
    await setupContracts();
  });

  describe.only('the propose transition', async () => {
    const validator: TransitionValidator = 'validatePropose';

    const fromCommitment = initialConsensus(defaults);
    const toCommitment = propose(fromCommitment, proposedAllocation, proposedDestination);

    itReturnsTrueOnAValidTransition(fromCommitment, toCommitment, validator);
    itRevertsWhenTheBalancesAreChanged(fromCommitment, toCommitment, validator);
  });

  describe.only('the pass transition', async () => {
    const validator: TransitionValidator = 'validatePass';
    const fromCommitment = initialConsensus(defaults);
    const toCommitment = pass(fromCommitment);

    itReturnsTrueOnAValidTransition(fromCommitment, toCommitment, validator);
    itRevertsWhenTheBalancesAreChanged(fromCommitment, toCommitment, validator);
  });

  describe.only('the vote transition', async () => {
    const validator: TransitionValidator = 'validateVote';
    const fromCommitment = twoVotesComplete;
    const toCommitment = vote(fromCommitment);

    itReturnsTrueOnAValidTransition(fromCommitment, toCommitment, validator);
    itRevertsWhenTheBalancesAreChanged(fromCommitment, toCommitment, validator);
    itRevertsWhenTheProposalsAreChanged(fromCommitment, toCommitment, validator);
  });

  describe.only('the final vote transition', async () => {
    const validator: TransitionValidator = 'validateFinalVote';
    const fromCommitment = threeVotesComplete;
    const toCommitment = finalVote(fromCommitment);

    itReturnsTrueOnAValidTransition(fromCommitment, toCommitment, validator);
    // itRevertsWhenTheBalancesAreNotUpdated(fromCommitment, toCommitment);
  });

  describe.only('the veto transition', async () => {
    const validator: TransitionValidator = 'validateVeto';
    const fromCommitment = oneVoteComplete;
    const toCommitment = veto(fromCommitment);

    itReturnsTrueOnAValidTransition(fromCommitment, toCommitment, validator);
  });

  describe('validConsensusCommitment', () => {
    const fromCommitment = threeVotesComplete;
    const toCommitment = finalVote(fromCommitment);
    // itRevertsForAnInvalidConsensusCommitment(fromCommitment, toCommitment);
  });

  describe('validProposeCommitment', () => {
    const fromCommitment = initialConsensus(defaults);
    const toCommitment = propose(fromCommitment, proposedAllocation, proposedDestination);
    // itRevertsForAnInvalidProposeCommitment(fromCommitment, toCommitment);
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

  type TransitionValidator =
    | 'validatePropose'
    | 'validateVote'
    | 'validateFinalVote'
    | 'validateVeto'
    | 'validatePass';
  type CommitmentValidator = 'validateProposeCommitment' | 'validateConsensusCommitment';
  function getTransitionValidator(validatorName: TransitionValidator): (c1, c2) => any {
    if (validatorName === 'validatePropose') {
      return (c1, c2) => {
        return consensusApp[`${validatorName}Pub`](
          consensusCommitmentArgs(c1),
          consensusCommitmentArgs(c2),
          participants.length,
        );
      };
    } else {
      return (c1, c2) =>
        consensusApp[`${validatorName}Pub`](
          consensusCommitmentArgs(c1),
          consensusCommitmentArgs(c2),
        );
    }
  }

  function getCommitmentValidator(validatorName: CommitmentValidator): (c) => any {
    return c => consensusApp[`${validatorName}Pub`](consensusCommitmentArgs(c));
  }

  async function invalidTransition(
    fromConsensusCommitment: ConsensusBaseCommitment,
    toConsensusCommitment: ConsensusBaseCommitment,
    validatorName: TransitionValidator,
    reason?,
  ) {
    expect.assertions(1);
    const fromCommitment = appCommitment(fromConsensusCommitment);
    const toCommitment = appCommitment(toConsensusCommitment);
    await expectRevert(
      async () => await getTransitionValidator(validatorName)(fromCommitment, toCommitment),
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

  function itReturnsTrueOnAValidTransition(
    fromCommitment,
    toCommitment,
    validatorName: TransitionValidator,
  ) {
    it('returns true on a valid transition', async () => {
      await getTransitionValidator(validatorName)(fromCommitment, toCommitment);
    });
  }

  function itRevertsForAnInvalidConsensusCommitment(
    commitmentArgs,
    validatorName: CommitmentValidator,
  ) {
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
  }

  function itRevertsForAnInvalidProposeCommitment(
    commitmentArgs,
    validatorName: CommitmentValidator,
  ) {
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
  }

  function itRevertsWhenTheBalancesAreNotUpdated(
    fromCommitmentArgs,
    toCommitmentArgs,
    validatorName: TransitionValidator,
  ) {
    it('reverts when the allocation is not updated', async () => {
      const toCommitmentDifferentAllocation = appCommitment({
        ...toCommitmentArgs,
        allocation,
      });

      await invalidTransition(fromCommitmentArgs, toCommitmentDifferentAllocation, validatorName);
    });
    it('reverts when the destination is not updated', async () => {
      const toCommitmentDifferentDestination = appCommitment({
        ...toCommitmentArgs,
        destination: participants,
      });

      await invalidTransition(fromCommitmentArgs, toCommitmentDifferentDestination, validatorName);
    });
  }

  function itRevertsWhenTheBalancesAreChanged(
    fromCommitmentArgs,
    toCommitmentArgs,
    validatorName: TransitionValidator,
  ) {
    it('reverts when the allocation is changed', async () => {
      const toCommitmentDifferentAllocation = appCommitment({
        ...toCommitmentArgs,
        allocation: proposedAllocation,
      });

      await invalidTransition(
        fromCommitmentArgs,
        toCommitmentDifferentAllocation,
        validatorName,
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
        validatorName,
        "ConsensusApp: 'destination' must be the same between ",
      );
    });
  }

  function itRevertsWhenTheProposalsAreChanged(
    fromCommitmentArgs,
    toCommitmentArgs,
    validatorName: TransitionValidator,
  ) {
    it('reverts when the proposedAllocation is changed', async () => {
      const toCommitmentDifferentAllocation = appCommitment(toCommitmentArgs, {
        proposedAllocation: alternativeProposedAllocation,
      });

      await invalidTransition(
        fromCommitmentArgs,
        toCommitmentDifferentAllocation,
        validatorName,
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
        validatorName,
        "ConsensusApp: 'proposedDestination' must be the same between ",
      );
    });
  }
});

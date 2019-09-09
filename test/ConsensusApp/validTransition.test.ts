import {ethers} from 'ethers';
// @ts-ignore
import ConsensusAppArtifact from '../../build/contracts/ConsensusApp.json';

import {defaultAbiCoder} from 'ethers/utils';
import {setupContracts} from '../test-helpers';
import {expectRevert} from 'magmo-devtools';

const provider = new ethers.providers.JsonRpcProvider(
  `http://localhost:${process.env.DEV_GANACHE_PORT}`,
);
let consensusApp: ethers.Contract;
interface ConsensusAppVariablePart {
  appData: string;
  outcome: string;
}

// constant values
const emptyOutcome = '0x';
const defaultOutcome1 = '0x1';
const defaultOutcome2 = '0x2';
const defaultOutcome3 = '0x3';

const defaultTurn = 1;

const noValidTransitionError = 'ConsensusApp: No valid transition found';

beforeAll(async () => {
  consensusApp = await setupContracts(provider, ConsensusAppArtifact);
});

describe('validTransition', () => {
  it('valid consensus -> propose', async () => {
    const variablePartOld = constructConsensusVariablePart(0, defaultOutcome1, emptyOutcome);
    const variablePartNew = constructConsensusVariablePart(2);
    const isValid = await consensusApp.validTransition(
      variablePartOld,
      variablePartNew,
      defaultTurn,
      3,
    );
    expect(isValid).toBe(true);
  });

  it('invalid consensus -> propose: furtherVotesRequired too low', async () => {
    const variablePartOld = constructConsensusVariablePart(0, defaultOutcome1, emptyOutcome);
    const variablePartNew = constructConsensusVariablePart(1, defaultOutcome1, defaultOutcome1);

    await expectRevert(
      () => consensusApp.validTransition(variablePartOld, variablePartNew, defaultTurn, 3),
      noValidTransitionError,
    );
  });

  it('valid vote', async () => {
    const variablePartOld = constructConsensusVariablePart(2);
    const variablePartNew = constructConsensusVariablePart(1);
    expect(
      await consensusApp.validTransition(variablePartOld, variablePartNew, defaultTurn, 3),
    ).toBe(true);
  });

  it('invalid vote: furtherVotesRequired not decreased', async () => {
    const variablePartOld = constructConsensusVariablePart(2);
    const variablePartNew = constructConsensusVariablePart(2);

    await expectRevert(
      () => consensusApp.validTransition(variablePartOld, variablePartNew, defaultTurn, 4),
      noValidTransitionError,
    );
  });

  it('valid veto', async () => {
    const variablePartOld = constructConsensusVariablePart(2, defaultOutcome1, defaultOutcome2);
    const variablePartNew = constructConsensusVariablePart(0, defaultOutcome1, emptyOutcome);
    expect(
      await consensusApp.validTransition(variablePartOld, variablePartNew, defaultTurn, 3),
    ).toBe(true);
  });

  it('invalid veto: currentOutcome1 ≠ currentOutcome2', async () => {
    const variablePartOld = constructConsensusVariablePart(2, defaultOutcome1, defaultOutcome2);
    const variablePartNew = constructConsensusVariablePart(0, defaultOutcome2, emptyOutcome);
    await expectRevert(
      () => consensusApp.validTransition(variablePartOld, variablePartNew, defaultTurn, 3),
      noValidTransitionError,
    );
  });

  it('invalid veto: proposedOutcome not empty', async () => {
    const variablePartOld = constructConsensusVariablePart(2, defaultOutcome1, defaultOutcome2);
    const variablePartNew = constructConsensusVariablePart(0, defaultOutcome1, defaultOutcome2);
    await expectRevert(
      () => consensusApp.validTransition(variablePartOld, variablePartNew, defaultTurn, 3),
      noValidTransitionError,
    );
  });

  it('valid pass', async () => {
    const variablePartOld = constructConsensusVariablePart(0, defaultOutcome1, emptyOutcome);
    const variablePartNew = constructConsensusVariablePart(0, defaultOutcome1, emptyOutcome);
    expect(
      await consensusApp.validTransition(variablePartOld, variablePartNew, defaultTurn, 3),
    ).toBe(true);
  });

  it('invalid pass: currentOutcome1 ≠ currentOutcome2', async () => {
    const variablePartOld = constructConsensusVariablePart(0, defaultOutcome1, emptyOutcome);
    const variablePartNew = constructConsensusVariablePart(0, defaultOutcome2, emptyOutcome);
    await expectRevert(
      () => consensusApp.validTransition(variablePartOld, variablePartNew, defaultTurn, 3),
      noValidTransitionError,
    );
  });

  it('valid finalVote', async () => {
    const variablePartOld = constructConsensusVariablePart(1, defaultOutcome1, defaultOutcome2);
    const variablePartNew = constructConsensusVariablePart(0, defaultOutcome2, emptyOutcome);
    expect(
      await consensusApp.validTransition(variablePartOld, variablePartNew, defaultTurn, 3),
    ).toBe(true);
  });

  it('invalid finalVote: proposedOutcome1 ≠ currentOutcome2', async () => {
    const variablePartOld = constructConsensusVariablePart(1, defaultOutcome1, defaultOutcome2);
    const variablePartNew = constructConsensusVariablePart(0, defaultOutcome3, emptyOutcome);
    await expectRevert(
      () => consensusApp.validTransition(variablePartOld, variablePartNew, defaultTurn, 3),
      noValidTransitionError,
    );
  });

  it('invalid finalVote: proposedOutcome not empty', async () => {
    const variablePartOld = constructConsensusVariablePart(1, defaultOutcome1, defaultOutcome2);
    const variablePartNew = constructConsensusVariablePart(0, defaultOutcome2, defaultOutcome2);
    await expectRevert(
      () => consensusApp.validTransition(variablePartOld, variablePartNew, defaultTurn, 3),
      noValidTransitionError,
    );
  });
});

function constructConsensusVariablePart(
  furtherVotesRequired: number,
  currentOutcome: string = defaultOutcome1,
  proposedOutcome: string = defaultOutcome1,
): ConsensusAppVariablePart {
  const appData: string = defaultAbiCoder.encode(
    ['tuple(uint32, bytes)'],
    [[furtherVotesRequired, proposedOutcome]],
  );
  return {appData, outcome: currentOutcome};
}

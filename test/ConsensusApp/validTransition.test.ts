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
const chainId = 1234;
const participants = ['1', '2', '3'];
const defaultOutcome = defaultAbiCoder.encode(['bytes'], ['0x0']);
const noValidTransitionError = 'ConsensusApp: No valid transition found for commitments';

beforeAll(async () => {
  consensusApp = await setupContracts(provider, ConsensusAppArtifact);
});

describe('validTransition', () => {
  it('valid consensus -> propose', async () => {
    const variablePartOld = constructConsensusVariablePart(0);
    const variablePartNew = constructConsensusVariablePart(2);
    expect(await consensusApp.validTransition(variablePartOld, variablePartNew, 1, 3)).toBe(true);
  });

  it('invalid consensus -> propose', async () => {
    const variablePartOld = constructConsensusVariablePart(0);
    const variablePartNew = constructConsensusVariablePart(1);

    expectRevert(
      () => consensusApp.validTransition(variablePartOld, variablePartNew, 1, 3),
      noValidTransitionError,
    );
  });
});

function constructConsensusVariablePart(
  furtherVotesRequired: number,
  currentOutcome: string = defaultOutcome,
  proposedOutcome: string = defaultOutcome,
): ConsensusAppVariablePart {
  const appData: string = defaultAbiCoder.encode(
    ['tuple(uint32, bytes)'],
    [[furtherVotesRequired, proposedOutcome]],
  );
  return {appData, outcome: currentOutcome};
}

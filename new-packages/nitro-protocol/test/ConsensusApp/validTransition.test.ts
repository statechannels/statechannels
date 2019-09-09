import {ethers} from 'ethers';
// @ts-ignore
import ConsensusAppArtifact from '../../build/contracts/ConsensusApp.json';

import {defaultAbiCoder} from 'ethers/utils';
import {TransactionRequest} from 'ethers/providers';
import {setupContracts} from '../test-helpers';
import {expectRevert} from 'magmo-devtools';

const provider = new ethers.providers.JsonRpcProvider(
  `http://localhost:${process.env.DEV_GANACHE_PORT}`,
);
let consensusApp: ethers.Contract;
const ConsensusAppContractInterface = new ethers.utils.Interface(ConsensusAppArtifact.abi);
interface ConsensusAppVariablePart {
  appData: string;
  outcome: string;
}

function constructConsensusVariablePart(
  furtherVotesRequired: number,
  currentOutcome,
  proposedOutcome,
): ConsensusAppVariablePart {
  const appData: string = defaultAbiCoder.encode(
    ['tuple(uint32, bytes)'],
    [[furtherVotesRequired, proposedOutcome]],
  );
  return {appData, outcome: currentOutcome};
}

const turnNumB = 1; // not checked by contract
const numParticipants = 3;

const noValidTransitionError = 'ConsensusApp: No valid transition found';

beforeAll(async () => {
  consensusApp = await setupContracts(provider, ConsensusAppArtifact);
});

const description00 = 'valid consensus -> propose';
const description01 = 'invalid consensus -> propose: furtherVotesRequired too low';
const description02 = 'valid vote';
const description03 = 'invalid vote: furtherVotesRequired not decreased';
const description04 = 'valid veto';
const description05 = 'invalid veto: proposedOutcome not empty';
const description06 = 'valid pass';
const description07 = 'invalid pass: currentOutcome1 ≠ currentOutcome2';
const description08 = 'valid finalVote';
const description09 = 'invalid finalVote: proposedOutcome1 ≠ currentOutcome2';
const description10 = 'invalid finalVote: proposedOutcome not empty';

describe('validTransition', () => {
  it.each`
    description      | furtherVotesRequired | outcome           | proposedOutcome   | reason
    ${description00} | ${[0, 2]}            | ${['0x1', '0x1']} | ${['0x', '0x1']}  | ${undefined}
    ${description01} | ${[0, 1]}            | ${['0x1', '0x1']} | ${['0x', '0x1']}  | ${noValidTransitionError}
    ${description02} | ${[2, 1]}            | ${['0x1', '0x1']} | ${['0x1', '0x1']} | ${undefined}
    ${description03} | ${[2, 2]}            | ${['0x1', '0x1']} | ${['0x1', '0x1']} | ${noValidTransitionError}
    ${description04} | ${[2, 0]}            | ${['0x1', '0x1']} | ${['0x2', '0x']}  | ${undefined}
    ${description05} | ${[2, 0]}            | ${['0x1', '0x2']} | ${['0x2', '0x']}  | ${noValidTransitionError}
    ${description06} | ${[0, 0]}            | ${['0x1', '0x1']} | ${['0x', '0x']}   | ${undefined}
    ${description07} | ${[0, 0]}            | ${['0x1', '0x2']} | ${['0x', '0x']}   | ${noValidTransitionError}
    ${description08} | ${[1, 0]}            | ${['0x1', '0x2']} | ${['0x2', '0x']}  | ${undefined}
    ${description09} | ${[1, 0]}            | ${['0x1', '0x3']} | ${['0x2', '0x']}  | ${noValidTransitionError}
    ${description10} | ${[1, 0]}            | ${['0x1', '0x2']} | ${['0x2', '0x2']} | ${noValidTransitionError}
  `('$description', async ({furtherVotesRequired, outcome, proposedOutcome, reason}) => {
    const variablePartOld = constructConsensusVariablePart(
      furtherVotesRequired[0],
      outcome[0],
      proposedOutcome[0],
    );
    const variablePartNew = constructConsensusVariablePart(
      furtherVotesRequired[1],
      outcome[1],
      proposedOutcome[1],
    );
    const transactionRequest = {
      data: ConsensusAppContractInterface.functions.validTransition.encode([
        variablePartOld,
        variablePartNew,
        turnNumB,
        numParticipants,
      ]),
    };
    if (reason) {
      await expectRevert(() => sendTransaction(consensusApp.address, transactionRequest));
    } else {
      // send a transaction, so we can measure gas consumption
      await sendTransaction(consensusApp.address, transactionRequest);

      // just call the function, so we can check the return value easily
      const isValid = await consensusApp.validTransition(
        variablePartOld,
        variablePartNew,
        turnNumB,
        numParticipants,
      );
      expect(isValid).toBe(true);
    }
  });
});

async function sendTransaction(contractAddress: string, transaction: TransactionRequest) {
  // TODO import from test-helpers instead (does not yet exist pending rebase or merge)
  const signer = provider.getSigner();
  const response = await signer.sendTransaction({to: contractAddress, ...transaction});
  await response.wait();
}

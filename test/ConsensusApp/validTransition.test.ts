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
  votesReqd: number,
  currentOutcome,
  proposedOutcome,
): ConsensusAppVariablePart {
  const appData: string = defaultAbiCoder.encode(
    ['tuple(uint32, bytes)'],
    [[votesReqd, proposedOutcome]],
  );
  return {appData, outcome: currentOutcome};
}

const turnNumB = 1; // not checked by contract
const numParticipants = 3;

beforeAll(async () => {
  consensusApp = await setupContracts(provider, ConsensusAppArtifact);
});

describe('validTransition', () => {
  it.each`
    isValid  | votesReqd | outcomes          | proposedOutcomes  | description
    ${true}  | ${[0, 2]} | ${['0x1', '0x1']} | ${['0x1', '0x2']} | ${'valid consensus -> propose'}
    ${false} | ${[0, 1]} | ${['0x1', '0x1']} | ${['0x1', '0x2']} | ${'invalid consensus -> propose: votesReqd too low'}
    ${true}  | ${[2, 1]} | ${['0x1', '0x1']} | ${['0x2', '0x2']} | ${'valid vote'}
    ${false} | ${[1, 1]} | ${['0x1', '0x1']} | ${['0x2', '0x2']} | ${'invalid vote: votesReqd not decreased'}
    ${true}  | ${[1, 2]} | ${['0x1', '0x1']} | ${['0x2', '0x1']} | ${'valid veto'}
    ${true}  | ${[2, 2]} | ${['0x1', '0x1']} | ${['0x2', '0x2']} | ${'valid pass'}
    ${true}  | ${[1, 0]} | ${['0x1', '0x2']} | ${['0x2', '0x']}  | ${'valid finalVote'}
    ${false} | ${[1, 0]} | ${['0x1', '0x3']} | ${['0x2', '0x']}  | ${'invalid finalVote: proposedOutcome1 ≠ currentOutcome2'}
  `('$description', async ({isValid, outcomes, proposedOutcomes, votesReqd}) => {
    const variablePartA = constructConsensusVariablePart(
      votesReqd[0],
      outcomes[0],
      proposedOutcomes[0],
    );
    const variablePartB = constructConsensusVariablePart(
      votesReqd[1],
      outcomes[1],
      proposedOutcomes[1],
    );
    const transactionRequest = {
      data: ConsensusAppContractInterface.functions.validTransition.encode([
        variablePartA,
        variablePartB,
        turnNumB,
        numParticipants,
      ]),
    };
    if (isValid) {
      // send a transaction, so we can measure gas consumption
      await sendTransaction(consensusApp.address, transactionRequest);

      // just call the function, so we can check the return value easily
      const isValidFromCall = await consensusApp.validTransition(
        variablePartA,
        variablePartB,
        turnNumB,
        numParticipants,
      );
      expect(isValidFromCall).toBe(true);
    } else {
      await expectRevert(() => sendTransaction(consensusApp.address, transactionRequest));
    }
  });
});

async function sendTransaction(contractAddress: string, transaction: TransactionRequest) {
  // TODO import from test-helpers instead (does not yet exist pending rebase or merge)
  const signer = provider.getSigner();
  const response = await signer.sendTransaction({to: contractAddress, ...transaction});
  await response.wait();
}

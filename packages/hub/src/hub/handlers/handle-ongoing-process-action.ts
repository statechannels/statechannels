import {
  signCommitment2,
  SignedCommitment as ClientSignedCommitment,
  unreachable
} from '@statechannels/wallet';
import {ethers} from 'ethers';
import {Signature} from 'fmg-core';

import {CommitmentsReceived, StrategyProposed} from '@statechannels/wallet/lib/src/communication';
import * as communication from '@statechannels/wallet/lib/src/communication';
import {errors} from '../../wallet';
import {getCurrentCommitment} from '../../wallet/db/queries/getCurrentCommitment';

import {getProcess} from '../../wallet/db/queries/walletProcess';
import {SignedCommitment, updateLedgerChannel} from '../../wallet/services';
import {asConsensusCommitment} from '../../wallet/services/ledger-commitment';

import {HUB_ADDRESS, HUB_PRIVATE_KEY} from '../../constants';
import {MessageRelayRequested} from '../../wallet-client';

export async function handleOngoingProcessAction(
  action: StrategyProposed | CommitmentsReceived
): Promise<MessageRelayRequested[]> {
  switch (action.type) {
    case 'WALLET.COMMON.COMMITMENTS_RECEIVED':
      return handleCommitmentsReceived(action);
    case 'WALLET.FUNDING_STRATEGY_NEGOTIATION.STRATEGY_PROPOSED':
      return handleStrategyProposed(action);
    default:
      return unreachable(action);
  }
}

async function handleStrategyProposed(action: StrategyProposed) {
  const {processId, strategy} = action;
  const process = await getProcess(processId);
  if (!process) {
    throw errors.processMissing(processId);
  }

  const {theirAddress} = process;
  return [communication.sendStrategyApproved(theirAddress, processId, strategy)];
}

async function handleCommitmentsReceived(action: CommitmentsReceived) {
  {
    const {processId} = action;
    const walletProcess = await getProcess(processId);
    if (!walletProcess) {
      throw errors.processMissing(processId);
    }

    const incomingCommitments = action.signedCommitments;
    const commitmentRound: SignedCommitment[] = incomingCommitments.map(
      clientCommitmentToServerCommitment
    );

    // For the time being, just assume a two-party channel and proceed as normal.
    const {commitment: lastCommitment} = commitmentRound.slice(-1)[0];

    const participants = lastCommitment.channel.participants;
    const ourIndex = participants.indexOf(HUB_ADDRESS);

    const ledgerCommitmentRound = commitmentRound.map(signedCommitment => ({
      ledgerCommitment: asConsensusCommitment(signedCommitment.commitment),
      signature: signedCommitment.signature
    }));
    const currentCommitment = await getCurrentCommitment(lastCommitment);
    const {commitment, signature} = await updateLedgerChannel(
      ledgerCommitmentRound,
      currentCommitment && asConsensusCommitment(currentCommitment)
    );
    return participants
      .filter((_, idx) => idx !== ourIndex)
      .map(p =>
        communication.sendCommitmentsReceived(
          p,
          processId,
          [
            ...incomingCommitments,
            {
              commitment,
              signature: (signature as unknown) as string,
              signedState: signCommitment2(commitment, HUB_PRIVATE_KEY).signedState
            }
          ],
          action.protocolLocator
        )
      );
  }
}

function clientCommitmentToServerCommitment(signedCommitment: ClientSignedCommitment) {
  const {commitment, signature: stringSignature} = signedCommitment;
  const splitSignature = (ethers.utils.splitSignature(stringSignature) as unknown) as Signature;
  return {commitment, signature: splitSignature};
}

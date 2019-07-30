import { ethers } from 'ethers';
import { Signature } from 'fmg-core';
import { MessageRelayRequested } from 'magmo-wallet-client';
import * as communication from 'magmo-wallet/lib/src/communication';
import { CommitmentsReceived, ConcludeInstigated } from 'magmo-wallet/lib/src/communication';
import { HUB_ADDRESS } from '../../constants';
import { startConcludeProcess, startFundingProcess } from '../../wallet/db/queries/walletProcess';
import { updateRPSChannel } from '../services/rpsChannelManager';
import * as ongoing from './handle-ongoing-process-action';

export async function handleNewProcessAction(
  action: ConcludeInstigated | CommitmentsReceived,
): Promise<MessageRelayRequested[]> {
  switch (action.type) {
    case 'WALLET.COMMON.COMMITMENTS_RECEIVED':
      return handleCommitmentsReceived(action);
    case 'WALLET.NEW_PROCESS.CONCLUDE_INSTIGATED':
      return handleConcludeInstigated(action);
    default:
  }
}

async function handleCommitmentsReceived(
  action: CommitmentsReceived,
): Promise<MessageRelayRequested[]> {
  const { processId, signedCommitments } = action;
  const { participants } = signedCommitments[0].commitment.channel;
  const ourIndex = participants.indexOf(HUB_ADDRESS);
  const theirAddress = participants[(ourIndex + 1) % participants.length];
  await startFundingProcess({ processId, theirAddress });
  return ongoing.handleOngoingProcessAction(action);
}

async function handleConcludeInstigated(
  action: ConcludeInstigated,
): Promise<MessageRelayRequested[]> {
  const { commitment: theirCommitment, signature: theirSignature } = action.signedCommitment;
  const theirAddress = theirCommitment.channel.participants[0];
  const walletProcess = await startConcludeProcess({ action, theirAddress });

  const splitSignature = (ethers.utils.splitSignature(theirSignature) as unknown) as Signature;
  const { commitment, signature } = await updateRPSChannel(theirCommitment, splitSignature);
  return [
    communication.sendCommitmentReceived(
      theirAddress,
      walletProcess.processId,
      commitment,
      (signature as unknown) as string,
    ),
  ];
}

import { ethers } from 'ethers';
import { Signature } from 'fmg-core';
import { MessageRelayRequested } from 'magmo-wallet-client';
import * as communication from 'magmo-wallet/lib/src/communication';
import { ConcludeInstigated } from 'magmo-wallet/lib/src/communication';
import { startConcludeProcess } from '../../wallet/db/queries/walletProcess';
import { updateRPSChannel } from '../services/rpsChannelManager';

export async function handleNewProcessAction(
  action: ConcludeInstigated,
): Promise<MessageRelayRequested | undefined> {
  return handleConcludeInstigated(action);
}

async function handleConcludeInstigated(
  action: ConcludeInstigated,
): Promise<MessageRelayRequested> {
  const { commitment: theirCommitment, signature: theirSignature } = action.signedCommitment;
  const theirAddress = theirCommitment.channel.participants[0];
  const walletProcess = await startConcludeProcess({ action, theirAddress });

  const splitSignature = (ethers.utils.splitSignature(theirSignature) as unknown) as Signature;
  const { commitment, signature } = await updateRPSChannel(theirCommitment, splitSignature);
  return communication.sendCommitmentReceived(
    theirAddress,
    walletProcess.processId,
    commitment,
    (signature as unknown) as string,
  );
}

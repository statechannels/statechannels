import { ethers } from 'ethers';
import { Signature } from 'fmg-core';
import { unreachable } from 'magmo-wallet';
import * as communication from 'magmo-wallet/lib/src/communication';
import { ConcludeInstigated, RelayableAction } from 'magmo-wallet/lib/src/communication';
import { MessageRelayRequested } from 'magmo-wallet-client';
import { startConcludeProcess } from '../../wallet/db/queries/walletProcess';
import { updateRPSChannel } from '../services/rpsChannelManager';

export async function handleNewProcessAction(
  action: RelayableAction,
): Promise<MessageRelayRequested | undefined> {
  switch (action.type) {
    case 'WALLET.COMMON.COMMITMENT_RECEIVED':
    case 'WALLET.FUNDING_STRATEGY_NEGOTIATION.STRATEGY_PROPOSED':
    case 'WALLET.FUNDING_STRATEGY_NEGOTIATION.STRATEGY_APPROVED':
    case 'WALLET.COMMON.COMMITMENTS_RECEIVED':
    case 'WALLET.NEW_PROCESS.DEFUND_REQUESTED':
    case 'WALLET.MULTIPLE_RELAYABLE_ACTIONS':
      return undefined;
    case 'WALLET.NEW_PROCESS.CONCLUDE_INSTIGATED':
      return handleConcludeInstigated(action);
    default:
      return unreachable(action);
  }
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

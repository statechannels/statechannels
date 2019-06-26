import { ethers } from 'ethers';
import { Signature } from 'fmg-core';
import { unreachable } from 'magmo-wallet';
import * as communication from 'magmo-wallet/lib/src/communication';
import { ConcludeInstigated } from 'magmo-wallet/lib/src/communication';
import { startConcludeProcess } from '../../wallet/db/queries/walletProcess';
import { updateRPSChannel } from '../services/rpsChannelManager';

export async function handleNewProcessAction(ctx) {
  const action = ctx.request.body;
  if (!communication.isRelayableAction(action)) {
    throw new Error(`Action ${action.type} is not valid`);
  }

  switch (action.type) {
    case 'WALLET.COMMON.COMMITMENT_RECEIVED':
    case 'WALLET.FUNDING.STRATEGY_PROPOSED':
    case 'WALLET.FUNDING.STRATEGY_APPROVED':
    case 'WALLET.COMMON.COMMITMENTS_RECEIVED':
    case 'WALLET.NEW_PROCESS.DEFUND_REQUESTED':
    case 'WALLET.CONCLUDING.KEEP_LEDGER_CHANNEL_APPROVED':
    case 'WALLET.MULTIPLE_RELAYABLE_ACTIONS':
      return ctx;
    case 'WALLET.NEW_PROCESS.CONCLUDE_INSTIGATED':
      return handleConcludeInstigated(ctx, action);
    default:
      return unreachable(action);
  }
}

async function handleConcludeInstigated(ctx, action: ConcludeInstigated) {
  const { commitment: theirCommitment, signature: theirSignature } = action.signedCommitment;
  const theirAddress = theirCommitment.channel.participants[0];
  const walletProcess = await startConcludeProcess({ action, theirAddress });

  const splitSignature = (ethers.utils.splitSignature(theirSignature) as unknown) as Signature;
  const { commitment, signature } = await updateRPSChannel(theirCommitment, splitSignature);

  ctx.status = 201;
  ctx.body = communication.sendCommitmentReceived(
    theirAddress,
    walletProcess.processId,
    commitment,
    (signature as unknown) as string,
  );
  return ctx;
}

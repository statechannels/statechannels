import { unreachable } from 'magmo-wallet';
import { MessageRelayRequested } from 'magmo-wallet-client';
import { CommitmentsReceived, ConcludeInstigated } from 'magmo-wallet/lib/src/communication';
import { HUB_ADDRESS } from '../../constants';
import { startFundingProcess } from '../../wallet/db/queries/walletProcess';
import * as ongoing from './handle-ongoing-process-action';

export async function handleNewProcessAction(
  action: ConcludeInstigated | CommitmentsReceived,
): Promise<MessageRelayRequested[]> {
  switch (action.type) {
    case 'WALLET.COMMON.COMMITMENTS_RECEIVED':
      return handleCommitmentsReceived(action);
    case 'WALLET.NEW_PROCESS.CONCLUDE_INSTIGATED':
      throw new Error('The hub does not support the concluding application channels');
    default:
      return unreachable(action);
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

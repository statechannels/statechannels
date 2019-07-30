import { MessageRelayRequested } from 'magmo-wallet-client';
import {
  CommitmentReceived,
  CommitmentsReceived,
  ConcludeInstigated,
  RelayableAction,
  StrategyProposed,
} from 'magmo-wallet/lib/src/communication';
import { getProcess } from '../../wallet/db/queries/walletProcess';
import { handleNewProcessAction } from './handle-new-process-action';
import { handleOngoingProcessAction } from './handle-ongoing-process-action';

export async function handleWalletMessage(
  message: RelayableAction,
): Promise<MessageRelayRequested[]> {
  if (isNewProcessAction(message) && (await shouldHandleAsNewProcessAction(message))) {
    return handleNewProcessAction(message);
  } else if (isProtocolAction(message)) {
    return handleOngoingProcessAction(message);
  } else {
    return undefined;
  }
}

// TODO: We should define types for NewProcessAction and ProtocolAction

async function shouldHandleAsNewProcessAction(
  action: ConcludeInstigated | CommitmentsReceived,
): Promise<boolean> {
  if (action.type !== 'WALLET.COMMON.COMMITMENTS_RECEIVED') {
    return true;
  }
  return !(await getProcess(action.processId));
}

function isNewProcessAction(
  action: RelayableAction,
): action is ConcludeInstigated | CommitmentsReceived {
  return (
    action.type === 'WALLET.NEW_PROCESS.CONCLUDE_INSTIGATED' ||
    action.type === 'WALLET.COMMON.COMMITMENTS_RECEIVED'
  );
}

function isProtocolAction(
  action: RelayableAction,
): action is StrategyProposed | CommitmentReceived | CommitmentsReceived {
  return (
    action.type === 'WALLET.FUNDING_STRATEGY_NEGOTIATION.STRATEGY_PROPOSED' ||
    action.type === 'WALLET.COMMON.COMMITMENT_RECEIVED' ||
    action.type === 'WALLET.COMMON.COMMITMENTS_RECEIVED'
  );
}

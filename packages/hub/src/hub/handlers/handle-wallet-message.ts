import {
  CommitmentsReceived,
  ConcludeInstigated,
  RelayableAction,
  StrategyProposed
} from '@statechannels/engine/lib/src/communication';
import {MessageRelayRequested} from '../../wallet-client';
import {getProcess} from '../../wallet/db/queries/walletProcess';
import {handleNewProcessAction} from './handle-new-process-action';
import {handleOngoingProcessAction} from './handle-ongoing-process-action';

export async function handleWalletMessage(
  message: RelayableAction
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
  action: ConcludeInstigated | CommitmentsReceived
): Promise<boolean> {
  if (action.type === 'ENGINE.NEW_PROCESS.CONCLUDE_INSTIGATED') {
    return true;
  }
  if (action.type === 'ENGINE.COMMON.COMMITMENTS_RECEIVED') {
    return !(await getProcess(action.processId));
  }
}

function isNewProcessAction(
  action: RelayableAction
): action is ConcludeInstigated | CommitmentsReceived {
  return (
    action.type === 'ENGINE.NEW_PROCESS.CONCLUDE_INSTIGATED' ||
    action.type === 'ENGINE.COMMON.COMMITMENTS_RECEIVED'
  );
}

function isProtocolAction(
  action: RelayableAction
): action is StrategyProposed | CommitmentsReceived {
  return (
    action.type === 'ENGINE.FUNDING_STRATEGY_NEGOTIATION.STRATEGY_PROPOSED' ||
    action.type === 'ENGINE.COMMON.COMMITMENTS_RECEIVED'
  );
}

import {
  ConcludeInstigated,
  RelayableAction,
  SignedStatesReceived,
  StrategyProposed
} from '@statechannels/wallet/lib/src/communication';
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
  action: ConcludeInstigated | SignedStatesReceived
): Promise<boolean> {
  if (action.type === 'WALLET.NEW_PROCESS.CONCLUDE_INSTIGATED') {
    return true;
  }
  if (action.type === 'WALLET.COMMON.SIGNED_STATES_RECEIVED') {
    return !(await getProcess(action.processId));
  }
}

function isNewProcessAction(
  action: RelayableAction
): action is ConcludeInstigated | SignedStatesReceived {
  return (
    action.type === 'WALLET.NEW_PROCESS.CONCLUDE_INSTIGATED' ||
    action.type === 'WALLET.COMMON.SIGNED_STATES_RECEIVED'
  );
}

function isProtocolAction(
  action: RelayableAction
): action is StrategyProposed | SignedStatesReceived {
  return (
    action.type === 'WALLET.FUNDING_STRATEGY_NEGOTIATION.STRATEGY_PROPOSED' ||
    action.type === 'WALLET.COMMON.SIGNED_STATES_RECEIVED'
  );
}

import { RelayableAction } from 'magmo-wallet/lib/src/communication';
import { MessageRelayRequested } from '../../../../magmo-wallet-client/lib';
import { getProcess } from '../../wallet/db/queries/walletProcess';
import { handleNewProcessAction } from './handle-new-process-action';
import { handleOngoingProcessAction } from './handle-ongoing-process-action';

export async function handleWalletMessage(
  message: RelayableAction,
): Promise<MessageRelayRequested | undefined> {
  if (await isNewProcessAction(message)) {
    return handleNewProcessAction(message);
  } else if (await isProtocolAction(message)) {
    return handleOngoingProcessAction(message);
  } else {
    return undefined;
  }
}

function isNewProcessAction(action: RelayableAction): boolean {
  if (action.type === 'WALLET.NEW_PROCESS.CONCLUDE_INSTIGATED') {
    return true;
  } else {
    return false;
  }
}

async function isProtocolAction(action: RelayableAction): Promise<boolean> {
  if (
    action.type === 'WALLET.FUNDING_STRATEGY_NEGOTIATION.STRATEGY_PROPOSED' ||
    (action.type === 'WALLET.COMMON.COMMITMENT_RECEIVED' && !opensAppChannel()) ||
    (action.type === 'WALLET.COMMON.COMMITMENTS_RECEIVED' && !opensAppChannel())
  ) {
    const { processId } = action;
    const process = await getProcess(processId);
    if (!process) {
      throw new Error(`Process ${processId} is not running.`);
    }
    return true;
  }

  return false;
}

function opensAppChannel(): boolean {
  return false;
}

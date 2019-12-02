import {
  ConcludeInstigated,
  RelayActionWithMessage,
  SignedStatesReceived
} from '../../communication';
import {HUB_ADDRESS, unreachable} from '../../constants';
import {startFundingProcess} from '../../wallet/db/queries/walletProcess';
import * as ongoing from './handle-ongoing-process-action';

export async function handleNewProcessAction(
  action: ConcludeInstigated | SignedStatesReceived
): Promise<RelayActionWithMessage[]> {
  switch (action.type) {
    case 'WALLET.COMMON.SIGNED_STATES_RECEIVED':
      return handleSignedStatesReceived(action);
    case 'WALLET.NEW_PROCESS.CONCLUDE_INSTIGATED':
      throw new Error('The hub does not support the concluding application channels');
    default:
      return unreachable(action);
  }
}

async function handleSignedStatesReceived(
  action: SignedStatesReceived
): Promise<RelayActionWithMessage[]> {
  const {processId, signedStates} = action;
  const {participants} = signedStates[0].state.channel;
  const ourIndex = participants.indexOf(HUB_ADDRESS);
  const theirAddress = participants[(ourIndex + 1) % participants.length];
  await startFundingProcess({processId, theirAddress});
  return ongoing.handleOngoingProcessAction(action);
}

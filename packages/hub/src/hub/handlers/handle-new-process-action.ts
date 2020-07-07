import {
  RelayActionWithMessage,
  SignedStatesReceived,
  ChannelOpen,
  getProcessId,
  isChannelOpenAction
} from '../../communication';
import {HUB_ADDRESS} from '../../constants';
import {startFundingProcess} from '../../wallet/db/queries/walletProcess';
import * as ongoing from './handle-ongoing-process-action';

export async function handleNewProcessAction(
  action: ChannelOpen | SignedStatesReceived
): Promise<RelayActionWithMessage[]> {
  return handleOpenChannelReceived(action);
}

async function handleOpenChannelReceived(
  action: ChannelOpen | SignedStatesReceived
): Promise<RelayActionWithMessage[]> {
  const processId = getProcessId(action);
  let signedState;
  if (isChannelOpenAction(action)) {
    signedState = action.signedState;
  } else {
    const {signedStates} = action;
    signedState = signedStates[0];
  }
  const {participants} = signedState.state.channel;
  const ourIndex = participants.indexOf(HUB_ADDRESS);
  const theirAddress = participants[(ourIndex + 1) % participants.length];
  await startFundingProcess({processId, theirAddress});
  return ongoing.handleOngoingProcessAction(action);
}

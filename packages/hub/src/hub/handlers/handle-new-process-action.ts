import {
  ConcludeInstigated,
  RelayActionWithMessage,
  SignedStatesReceived,
  ChannelOpen,
  getProcessId
} from '../../communication';
import {HUB_ADDRESS, unreachable} from '../../constants';
import {startFundingProcess} from '../../wallet/db/queries/walletProcess';
import * as ongoing from './handle-ongoing-process-action';
import {signState} from '@statechannels/nitro-protocol/lib/src/signatures';

export async function handleNewProcessAction(
  action: ChannelOpen
): Promise<RelayActionWithMessage[]> {
  return handleOpenChannelReceived(action);
}

async function handleOpenChannelReceived(action: ChannelOpen): Promise<RelayActionWithMessage[]> {
  const processId = getProcessId(action);
  const {signedState} = action;
  const {participants} = signedState.state.channel;
  const ourIndex = participants.indexOf(HUB_ADDRESS);
  const theirAddress = participants[(ourIndex + 1) % participants.length];
  await startFundingProcess({processId, theirAddress});
  return ongoing.handleOngoingProcessAction(action);
}

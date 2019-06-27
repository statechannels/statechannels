import { unreachable } from '../../../utils/reducer-utils';
import { TwoPartyPlayerIndex } from '../../types';
import { playerAReducer, initialize as initializeA } from './player-a/reducer';
import { playerBReducer, initialize as initializeB } from './player-b/reducer';
import { SharedData } from '../../state';
import { ChannelState } from '../../channel-store';
import { isPlayerAState } from './player-a/states';
import { NonTerminalNewLedgerFundingState, NewLedgerFundingState } from './states';
import { NewLedgerFundingAction } from './actions';
import { ProtocolStateWithSharedData } from '..';

type ReturnVal = ProtocolStateWithSharedData<NewLedgerFundingState>;

export function initialize(
  processId: string,
  channel: ChannelState,
  sharedData: SharedData,
): ReturnVal {
  // todo: would be nice to avoid casting here
  const ourIndex: TwoPartyPlayerIndex = channel.ourIndex;

  switch (ourIndex) {
    case TwoPartyPlayerIndex.A:
      return initializeA(processId, channel.channelId, sharedData);
    case TwoPartyPlayerIndex.B:
      return initializeB(processId, channel.channelId, sharedData);
    default:
      return unreachable(ourIndex);
  }
}

export const newLedgerFundingReducer = (
  protocolState: NonTerminalNewLedgerFundingState,
  sharedData: SharedData,
  action: NewLedgerFundingAction,
): ReturnVal => {
  if (isPlayerAState(protocolState)) {
    return playerAReducer(protocolState, sharedData, action);
  } else {
    return playerBReducer(protocolState, sharedData, action);
  }
};

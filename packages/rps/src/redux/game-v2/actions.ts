import { BigNumber } from 'ethers/utils';
import { ChannelState } from '../../core';

interface UpdateChannelState {
  type: 'UpdateChannelState';
  channelState: ChannelState;
}
export const updateChannelState = (channelState: ChannelState): UpdateChannelState => ({
  type: 'UpdateChannelState',
  channelState,
});

interface JoinOpenGame {
  type: 'JoinOpenGame';
  opponentName: string;
  opponentAddress: string;
  roundBuyIn: BigNumber;
}

export const joinOpenGame = (
  opponentName: string,
  opponentAddress: string,
  roundBuyIn: BigNumber
): JoinOpenGame => ({
  type: 'JoinOpenGame',
  opponentName,
  opponentAddress,
  roundBuyIn,
});

export type GameAction = JoinOpenGame | UpdateChannelState;

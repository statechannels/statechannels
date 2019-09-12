import {Bytes32, Uint256} from './types';
import {keccak256, defaultAbiCoder} from 'ethers/utils';

export function hashChallengeMessage(challengeMessage: {
  largestTurnNum: Uint256;
  channelId: Bytes32;
}): Bytes32 {
  const {largestTurnNum, channelId} = challengeMessage;
  return keccak256(
    defaultAbiCoder.encode(
      ['uint256', 'uint256', 'string'],
      [largestTurnNum, channelId, 'forceMove'],
    ),
  );
}

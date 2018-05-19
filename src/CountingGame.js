import { toHex32, padBytes32 } from './utils';
import { pack as packCommon } from './CommonState';

export function pack(
  channelType,
  channelNonce,
  participantA,
  participantB,
  turnNum,
  stateType,
  aBal,
  bBal,
  count
) {
  let gameState = (
    "0x" +
    toHex32(stateType).substr(2) +
    toHex32(aBal).substr(2) +
    toHex32(bBal).substr(2) +
    toHex32(count).substr(2)
  );

  return packCommon(channelType, channelNonce, turnNum, participantA, participantB, gameState);
}

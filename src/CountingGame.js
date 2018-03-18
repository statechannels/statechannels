import { toHex32, padBytes32 } from './utils';
import { pack as packCommon } from './CommonState';

export function pack(
  channelType,
  channelNonce,
  participantA,
  participantB,
  stateNonce,
  stateType,
  aBal,
  bBal,
  points
) {
  let gameState = (
    "0x" +
    toHex32(stateType) +
    toHex32(aBal) +
    toHex32(bBal) +
    toHex32(points)
  );

  return packCommon(channelType, channelNonce, stateNonce, participantA, participantB, gameState);
}

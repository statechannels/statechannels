import {Bytes32} from './types';
import {keccak256, defaultAbiCoder} from 'ethers/utils';
import {State, hashState} from './state';

export function hashChallengeMessage(challengeState: State): Bytes32 {
  return keccak256(
    defaultAbiCoder.encode(['bytes32', 'string'], [hashState(challengeState), 'forceMove']),
  );
}

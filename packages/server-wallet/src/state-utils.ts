import {
  SignedStateWithHash,
  SignedStateVarsWithHash,
  ChannelConstants,
  State,
  hashState,
  Hashed,
} from '@statechannels/wallet-core';
import _ from 'lodash';

export const dropNonVariables = (s: SignedStateWithHash): SignedStateVarsWithHash =>
  _.pick(s, 'appData', 'outcome', 'isFinal', 'turnNum', 'stateHash', 'signatures');

export const dropNonConstants = (s: State): ChannelConstants =>
  _.pick(s, 'channelNonce', 'chainId', 'participants', 'appDefinition', 'challengeDuration');

export const addHash = <T extends State = State>(s: T): T & Hashed => ({
  ...s,
  stateHash: hashState(s),
});

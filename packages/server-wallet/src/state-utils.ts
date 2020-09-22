import {
  ChannelConstants,
  Hashed,
  SignedStateVarsWithHash,
  State,
  hashState,
  calculateChannelId,
} from '@statechannels/wallet-core';
import _ from 'lodash';

import {Bytes32} from './type-aliases';
import {Channel} from './models/channel';
import {recordFunctionMetrics} from './metrics';

export const dropNonVariables = (s: SignedStateVarsWithHash): SignedStateVarsWithHash =>
  _.pick(s, 'appData', 'outcome', 'isFinal', 'turnNum', 'stateHash', 'signatures');

export const dropNonConstants = (s: State): ChannelConstants =>
  _.pick(s, 'channelNonce', 'chainId', 'participants', 'appDefinition', 'challengeDuration');

export const addHash = <T extends State = State>(s: T): T & Hashed => ({
  ...s,
  stateHash: recordFunctionMetrics(hashState(s)),
});
export const addHashes = (c: Channel): Channel =>
  _.assign(c, {vars: c.vars.map(v => addHash({...c.channelConstants, ...v})) as any});

export const addChannelId = <T extends ChannelConstants = ChannelConstants>(
  c: T
): T & {channelId: Bytes32} => {
  (c as any).channelId = calculateChannelId(c);

  return c as any;
};

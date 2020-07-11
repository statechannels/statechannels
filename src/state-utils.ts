import {
  SignedStateWithHash,
  SignedStateVarsWithHash,
} from '@statechannels/wallet-core';
import _ from 'lodash';

export const dropNonVariables = (
  s: SignedStateWithHash
): SignedStateVarsWithHash =>
  (s = _.pick(
    s,
    'appData',
    'outcome',
    'isFinal',
    'turnNum',
    'stateHash',
    'signatures'
  ) as any);

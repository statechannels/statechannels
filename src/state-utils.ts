import {
  SignedStateWithHash,
  SignedStateVarsWithHash,
} from '@statechannels/wallet-core';
import _ from 'lodash';

export const extractVariables = (
  s: SignedStateWithHash
): SignedStateVarsWithHash =>
  _.pick(
    s,
    'appData',
    'outcome',
    'isFinal',
    'turnNum',
    'stateHash',
    'signatures'
  );

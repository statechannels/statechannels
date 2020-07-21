import {
  BN,
  SignedStateVariables,
  StateVariables,
  simpleEthAllocation,
} from '@statechannels/wallet-core';
import _ from 'lodash';

import {alice, bob} from './participants';
import {fixture} from './utils';

const defaultVars: StateVariables = {
  appData: '0x0000000000000000000000000000000000000000000000000000000000000000',
  isFinal: false,
  turnNum: 0,
  outcome: simpleEthAllocation([
    {destination: alice().destination, amount: BN.from(1)},
    {destination: bob().destination, amount: BN.from(3)},
  ]),
};

export const stateVars = fixture(defaultVars);

export const stateVarsWithSignatures = fixture<SignedStateVariables>(
  _.merge({signatures: []}, defaultVars)
);

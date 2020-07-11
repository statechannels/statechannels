import _ from 'lodash';
import {
  simpleEthAllocation,
  StateVariables,
  SignedStateVariables,
  BigNumber,
} from '@statechannels/wallet-core';
import { fixture } from './utils';
import { alice, bob } from './participants';

const defaultVars: StateVariables = {
  appData: '0x0000000000000000000000000000000000000000000000000000000000000000',
  isFinal: false,
  turnNum: 0,
  outcome: simpleEthAllocation([
    { destination: alice().destination, amount: BigNumber.from(1) },
    { destination: bob().destination, amount: BigNumber.from(3) },
  ]),
};

export const stateVars = fixture(defaultVars);

export const stateVarsWithSignatures = fixture<SignedStateVariables>(
  _.merge({ signatures: [] }, defaultVars)
);

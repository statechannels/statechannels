import _ from 'lodash';
import {
  State,
  SignedState,
  simpleEthAllocation,
  SignedStateWithHash,
  SignedStateVarsWithHash,
  SignedStateVariables,
  hashState,
  BigNumber,
} from '@statechannels/wallet-core';
import { fixture, Fixture } from './utils';
import { alice, bob } from './participants';

const defaultState: State = {
  appData: '0x0000000000000000000000000000000000000000000000000000000000000000',
  appDefinition: '0x0000000000000000000000000000000000000000',
  isFinal: false,
  turnNum: 0,
  outcome: simpleEthAllocation([
    { destination: alice().destination, amount: BigNumber.from(1) },
    { destination: bob().destination, amount: BigNumber.from(3) },
  ]),
  participants: [alice(), bob()],
  channelNonce: 1,
  chainId: '0x01',
  challengeDuration: 9001,
};

export const createState = fixture(defaultState);
export const stateWithSignatures = fixture<SignedState>(
  _.merge({ signatures: [] }, defaultState)
);

export const stateWithSignaturesAndHash: Fixture<SignedStateVarsWithHash> = function(
  opts?: Partial<SignedStateVariables>
): SignedStateWithHash {
  const state: SignedStateWithHash = createState(opts) as any;

  state.stateHash = hashState(state);
  return state;
};

import _ from 'lodash';
import {
  State,
  SignedState,
  simpleEthAllocation,
} from '@statechannels/wallet-core';
import { BigNumber } from 'ethers';
import { fixture } from './utils';
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

export const state = fixture(defaultState);
export const stateWithSignatures = fixture<SignedState>(
  _.merge({ signatures: [] }, defaultState)
);

import {SignedState, Payload} from '@statechannels/wallet-core';
import _ from 'lodash';

import {WALLET_VERSION} from '../../../version';

import {createState} from './states';

const emptyMessage = {walletVersion: WALLET_VERSION};

type WithState = {signedStates: SignedState[]};
export function messageWithState(props?: Partial<Payload>): Payload & WithState {
  const defaults = _.merge(emptyMessage, {signedStates: [createState()]});

  return _.merge(defaults, props);
}

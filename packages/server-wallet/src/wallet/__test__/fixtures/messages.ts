import {SignedState} from '@statechannels/wallet-core';
import _ from 'lodash';

import {AddressedMessage} from '../..';

import {createState} from './states';

const emptyMessage = {to: 'alice', from: 'bob'};

export const message = (props?: Partial<AddressedMessage>): AddressedMessage => {
  const defaults: AddressedMessage = _.cloneDeep(emptyMessage);

  return _.merge(defaults, props);
};

type WithState = {signedStates: SignedState[]};
export function messageWithState(props?: Partial<AddressedMessage>): AddressedMessage & WithState {
  const defaults = _.merge(emptyMessage, {signedStates: [createState()]});

  return _.merge(defaults, props);
}

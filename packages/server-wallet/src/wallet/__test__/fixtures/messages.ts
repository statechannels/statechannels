import {SignedState, Payload} from '@statechannels/wallet-core';
import _ from 'lodash';

import {createState} from './states';

const emptyMessage = {};

type WithState = {signedStates: SignedState[]};
export function messageWithState(props?: Partial<Payload>): Payload & WithState {
  const defaults = _.merge(emptyMessage, {signedStates: [createState()]});

  return _.merge(defaults, props);
}

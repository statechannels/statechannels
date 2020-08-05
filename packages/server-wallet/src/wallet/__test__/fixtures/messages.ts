import {SignedState, Message} from '@statechannels/wallet-core';
import _ from 'lodash';

import {createState} from './states';

const emptyMessage = {};

export const message = (props?: Partial<Message>): Message => {
  const defaults: Message = _.cloneDeep(emptyMessage);

  return _.merge(defaults, props);
};

type WithState = {signedStates: SignedState[]};
export function messageWithState(props?: Partial<Message>): Message & WithState {
  const defaults = _.merge(emptyMessage, {signedStates: [createState()]});

  return _.merge(defaults, props);
}

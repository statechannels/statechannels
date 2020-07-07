import {Bytes} from './types';
import {State} from '@statechannels/nitro-protocol';
import {queries} from './db/queries/channels';
import {formResponse, nextState, validSignature} from './services/channelManager';

import errors from './errors';
import {updateLedgerChannel} from './services/ledgerChannelManager';
export {errors};

export default class Wallet {
  sanitize: (appAttrs: any) => Bytes;
  validSignature = validSignature;
  updateChannel = queries.updateChannel;
  updateLedgerChannel = updateLedgerChannel;
  nextState = nextState;

  constructor(sanitizeAppAttrs) {
    this.sanitize = sanitizeAppAttrs;
  }

  formResponse = (state: State) => formResponse(state);
}

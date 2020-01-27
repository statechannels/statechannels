import {Bytes} from '../types';
import {State} from '@statechannels/nitro-protocol';
import {queries} from './db/queries/channels';
import {formResponse, nextState, validSignature} from './services/channelManager';

import errors from './errors';
import {getApplications} from './services/applicationManager';
import {updateLedgerChannel} from './services/ledgerChannelManager';
export {errors};

export default class Wallet {
  sanitize: (appAttrs: any) => Bytes;
  validSignature = validSignature;
  updateChannel = queries.updateChannel;
  updateLedgerChannel = updateLedgerChannel;
  nextState = nextState;
  getApplications = getApplications;

  constructor(sanitizeAppAttrs) {
    this.sanitize = sanitizeAppAttrs;
  }

  formResponse = (state: State) => formResponse(state);
}

export { ChannelResponse } from './services';
import { Bytes } from 'fmg-core';
import { queries } from './db/queries/allocator_channels';
import { formResponse, nextCommitment, validSignature } from './services/channelManagement';

import errors from './errors';
import { getApplications } from './services/applicationManager';
import { updateLedgerChannel } from './services/ledgerChannelManager';
export { errors };

export default class Wallet {
  sanitize: (appAttrs: any) => Bytes;
  validSignature = validSignature;
  updateChannel = queries.updateAllocatorChannel;
  updateLedgerChannel = updateLedgerChannel;
  nextCommitment = nextCommitment;
  getApplications = getApplications;

  constructor(sanitizeAppAttrs) {
    this.sanitize = sanitizeAppAttrs;
  }

  formResponse = channel_id => formResponse(channel_id, this.sanitize);
}

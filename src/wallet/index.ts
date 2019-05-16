export { ChannelResponse } from './services';
import { Bytes } from 'fmg-core';
import { queries } from './db/queries/allocator_channels';
import { formResponse, nextCommitment, validSignature } from './services/channelManagement';

import errors from './errors';
import AllocatorChannelCommitment from './models/allocatorChannelCommitment';
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

  formResponse = (commitment: AllocatorChannelCommitment) =>
    formResponse(commitment, this.sanitize);
}

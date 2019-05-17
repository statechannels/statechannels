import { Bytes, Commitment } from 'fmg-core';
export { SignedCommitment } from './services';
import { queries } from './db/queries/allocator_channels';
import { formResponse, nextCommitment, validSignature } from './services/channelManagement';

import errors from './errors';
import { getApplications } from './services/applicationManager';
import { openLedgerChannel, updateLedgerChannel } from './services/ledgerChannelManager';
export { errors };

export default class Wallet {
  sanitize: (appAttrs: any) => Bytes;
  validSignature = validSignature;
  updateChannel = queries.updateAllocatorChannel;
  openLedgerChannel = openLedgerChannel;
  updateLedgerChannel = updateLedgerChannel;
  nextCommitment = nextCommitment;
  getApplications = getApplications;

  constructor(sanitizeAppAttrs) {
    this.sanitize = sanitizeAppAttrs;
  }

  formResponse = (commitment: Commitment) => formResponse(commitment);
}

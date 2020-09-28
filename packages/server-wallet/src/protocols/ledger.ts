import {BN, isSimpleAllocation, checkThat, State} from '@statechannels/wallet-core';
import _ from 'lodash';

import {Protocol, ProtocolResult, ChannelState} from './state';
import {ledgerFundChannel, noAction} from './actions';

export type ProtocolState = {ledger: ChannelState};

const handleFundingRequests = (ps: ProtocolState): LedgerFundChannel | false =>
  (hasQueuedFundingRequest(ps) & ledgerFundChannel(...)) ||
  (hasPendingFundingRequests(ps) && queueFundingRequest(...))

export const protocol: Protocol<ProtocolState> = (ps: ProtocolState): ProtocolResult =>
  handleFundingRequests(ps) || noAction;

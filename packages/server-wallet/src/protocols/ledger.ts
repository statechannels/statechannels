import {Protocol, ProtocolResult, ChannelState} from './state';
import {ledgerFundChannels, LedgerFundChannels, LedgerProtocolAction, noAction} from './actions';

export type ProtocolState = {
  ledger: ChannelState;
  hasPendingRequests: boolean;
};

const hasPendingFundingRequests = (ps: ProtocolState): boolean => !!ps.hasPendingRequests;

const handleFundingRequests = (ps: ProtocolState): LedgerFundChannels | false =>
  hasPendingFundingRequests(ps) && ledgerFundChannels({channelId: ps.ledger.channelId});

export const protocol: Protocol<ProtocolState> = (
  ps: ProtocolState
): ProtocolResult<LedgerProtocolAction> => handleFundingRequests(ps) || noAction;

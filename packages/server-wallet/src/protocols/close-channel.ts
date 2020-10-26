import {checkThat, isSimpleAllocation, State} from '@statechannels/wallet-core';
import {Transaction} from 'knex';

import {Store} from '../wallet/store';
import {Bytes32} from '../type-aliases';
import {LedgerRequest} from '../models/ledger-request';

import {Protocol, ProtocolResult, ChannelState, stage, Stage} from './state';
import {
  signState,
  noAction,
  CompleteObjective,
  completeObjective,
  RequestLedgerDefunding,
  requestLedgerDefunding,
} from './actions';

export type ProtocolState = {
  app: ChannelState;
  ledgerDefundingRequested?: boolean;
  ledgerDefundingSucceeded?: boolean;
  ledgerChannelId?: Bytes32;
};

const stageGuard = (guardStage: Stage) => (s: State | undefined): s is State =>
  !!s && stage(s) === guardStage;

const isFinal = stageGuard('Final');

const signFinalState = (ps: ProtocolState): ProtocolResult | false =>
  !!ps.app.supported &&
  !isFinal(ps.app.latestSignedByMe) &&
  signState({
    channelId: ps.app.channelId,
    ...ps.app.supported,
    turnNum: ps.app.supported.turnNum + (isFinal(ps.app.supported) ? 0 : 1),
    isFinal: true,
  });

const defundIntoLedger = (ps: ProtocolState): RequestLedgerDefunding | false =>
  isLedgerFunded(ps.app) &&
  !ps.ledgerDefundingRequested &&
  !ps.ledgerDefundingSucceeded &&
  !!ps.app.supported &&
  ps.app.supported.isFinal &&
  requestLedgerDefunding({
    channelId: ps.app.channelId,
    assetHolderAddress: checkThat(ps.app.latest.outcome, isSimpleAllocation).assetHolderAddress,
  });

const isLedgerFunded = ({fundingStrategy}: ChannelState): boolean => fundingStrategy === 'Ledger';

const completeCloseChannel = (ps: ProtocolState): CompleteObjective | false =>
  (ps.app.support || []).every(isFinal) &&
  isFinal(ps.app.latestSignedByMe) &&
  ((isLedgerFunded(ps.app) && ps.ledgerDefundingSucceeded) || !isLedgerFunded(ps.app)) &&
  completeObjective({channelId: ps.app.channelId});

export const protocol: Protocol<ProtocolState> = (ps: ProtocolState): ProtocolResult =>
  completeCloseChannel(ps) || defundIntoLedger(ps) || signFinalState(ps) || noAction;

/**
 * Helper method to retrieve scoped data needed for CloseChannel protocol.
 */
export const getCloseChannelProtocolState = async (
  store: Store,
  channelId: Bytes32,
  tx: Transaction
): Promise<ProtocolState> => {
  const app = await store.getChannel(channelId, tx);
  switch (app.fundingStrategy) {
    case 'Direct':
    case 'Unfunded':
      return {app};
    case 'Ledger': {
      const req = await LedgerRequest.getRequest(app.channelId, 'defund', tx);
      return {
        app,
        ledgerDefundingRequested: !!req,
        ledgerDefundingSucceeded: req ? req.status === 'succeeded' : false,
        ledgerChannelId: req ? req.ledgerChannelId : undefined,
      };
    }
    case 'Unknown':
    case 'Virtual':
    default:
      throw new Error('getCloseChannelProtocolState: Unimplemented funding strategy');
  }
};

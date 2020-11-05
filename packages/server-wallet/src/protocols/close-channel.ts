import {BN, checkThat, isSimpleAllocation, State} from '@statechannels/wallet-core';
import {Transaction} from 'knex';

import {Store} from '../wallet/store';
import {Bytes32} from '../type-aliases';

import {Protocol, ProtocolResult, ChannelState, stage, Stage} from './state';
import {
  completeObjective,
  Withdraw,
  withdraw,
  signState,
  noAction,
  CompleteObjective,
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

function everyoneSignedFinalState(ps: ProtocolState): boolean {
  return (ps.app.support || []).every(isFinal) && isFinal(ps.app.latestSignedByMe);
}

// todo: where is the corresponding logic for ledger channels?
//       should there be a generic logic for computing whether a channel is defunded regardless of funding type?
function successfulWithdraw({app}: ProtocolState): boolean {
  if (app.fundingStrategy !== 'Direct') return true;
  if (!app.supported) return false;

  const {allocationItems, assetHolderAddress} = checkThat(
    app.supported.outcome,
    isSimpleAllocation
  );
  const myDestination = app.participants[app.myIndex].destination;
  const amountOwedToMe = allocationItems
    .filter(ai => ai.destination === myDestination)
    .reduce((soFar, currentAi) => BN.add(soFar, currentAi.amount), BN.from(0));
  const amountTransferredToMe = app
    .funding(assetHolderAddress)
    .transferredOut.filter(tf => tf.toAddress === myDestination)
    .reduce((soFar, currentAi) => BN.add(soFar, currentAi.amount), BN.from(0));
  return BN.eq(amountOwedToMe, amountTransferredToMe);
}

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
  everyoneSignedFinalState(ps) &&
  requestLedgerDefunding({
    channelId: ps.app.channelId,
    assetHolderAddress: checkThat(ps.app.latest.outcome, isSimpleAllocation).assetHolderAddress,
  });

const isLedgerFunded = ({fundingStrategy}: ChannelState): boolean => fundingStrategy === 'Ledger';

const completeCloseChannel = (ps: ProtocolState): CompleteObjective | false =>
  everyoneSignedFinalState(ps) &&
  ((isLedgerFunded(ps.app) && ps.ledgerDefundingSucceeded) || !isLedgerFunded(ps.app)) &&
  successfulWithdraw(ps) &&
  completeObjective({channelId: ps.app.channelId});

function chainWithdraw(ps: ProtocolState): Withdraw | false {
  return (
    everyoneSignedFinalState(ps) &&
    ps.app.fundingStrategy === 'Direct' &&
    ps.app.chainServiceRequests.indexOf('withdraw') === -1 &&
    withdraw(ps.app)
  );
}

export const protocol: Protocol<ProtocolState> = (ps: ProtocolState): ProtocolResult =>
  chainWithdraw(ps) ||
  completeCloseChannel(ps) ||
  defundIntoLedger(ps) ||
  signFinalState(ps) ||
  noAction;

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
    case 'Fake':
      return {app};
    case 'Ledger': {
      const req = await store.getLedgerRequest(app.channelId, 'defund', tx);
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

import {BN, isSimpleAllocation, checkThat} from '@statechannels/wallet-core';
import _ from 'lodash';
import {Transaction} from 'knex';

import {Store} from '../wallet/store';
import {Bytes32} from '../type-aliases';

import * as OpenChannelProtocol from './open-channel';
import {Protocol, ProtocolResult, ChannelState} from './state';
import {noAction, RequestLedgerFunding} from './actions';

export type ProtocolState = {
  apps: ChannelState[];
  ledger: ChannelState;
};

const openLedgerChannel = (ps: ProtocolState): ProtocolResult => {
  return OpenChannelProtocol.protocol({app: ps.ledger});
};

const signPreFundSetupsForApps = (ps: ProtocolState): ProtocolResult => {
  if (ps.ledger.supported && ps.ledger.supported.turnNum < 3) return noAction;

  for (const app of ps.apps) {
    const ret = OpenChannelProtocol.protocol({app});
    if (ret && ret.type !== 'RequestLedgerFunding') return ret;
  }

  return noAction;
};

const bulkFundApps = (ps: ProtocolState): ProtocolResult => {
  if (!_.every(ps.apps, a => !!a.supported && a.supported.turnNum === 1)) return noAction;

  const reqs: RequestLedgerFunding[] = [];
  for (const app of ps.apps) {
    const ret = OpenChannelProtocol.protocol({app});
    if (ret && ret.type === 'RequestLedgerFunding') reqs.push(ret);
    return noAction;
  }

  return {
    type: 'RequestBulkLedgerFunding',
    ledgerChannelId: ps.ledger.channelId,
    channelIds: reqs.map(r => r.channelId),
  };
};

const signPostFundSetupsForApps = (ps: ProtocolState): ProtocolResult => {
  if (!ps.ledger.supported) return noAction;

  const {allocationItems} = checkThat(ps.ledger.supported.outcome, isSimpleAllocation);

  if (!_.every(ps.apps, a => _.some(allocationItems, ['destination', a.channelId])))
    return noAction;

  for (const app of ps.apps) {
    const ret = OpenChannelProtocol.protocol({app});
    if (ret) return ret;
  }

  return noAction;
};

const completeOpenLedgerAndBulkFund = (ps: ProtocolState): ProtocolResult => {
  if (_.every(ps.apps, a => !!a.supported && a.supported.turnNum === 3))
    return {
      type: 'CompleteObjective',
      channelId: '???',
    };
};

/**
 * Re-use OpenChannelProtocol but re-wire RequestLedgerFunding requests into a
 * RequestBulkLedgerFunding request which has special meaning inside the
 * ProcessLedgerQueue workflow/protocol — otherwise do things as normal
 */
export const protocol: Protocol<ProtocolState> = (ps: ProtocolState): ProtocolResult =>
  openLedgerChannel(ps) ||
  signPreFundSetupsForApps(ps) ||
  bulkFundApps(ps) ||
  signPostFundSetupsForApps(ps) ||
  completeOpenLedgerAndBulkFund(ps) ||
  noAction;

export const getOpenLedgerAndBulkFund = async (
  store: Store,
  channelId: Bytes32,
  tx: Transaction
): Promise<ProtocolState> => {
  const app = await store.getChannel(channelId, tx);
  return {
    apps: [app], //FIXME:
    ledger: app, //FIXME:
  };
};

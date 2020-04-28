import React from 'react';
import {SiteBudget} from '@statechannels/client-api-schema';
import {ChannelState} from '../../clients/payment-channel-client';
import {prettyPrintWei} from '../../utils/calculateWei';
import {utils} from 'ethers';
import './SiteBudgetTable.scss';

const bigNumberify = utils.bigNumberify;

export type SiteBudgetTableProps = {
  channelCache: Record<string, ChannelState>;
  budgetCache: SiteBudget;
  mySigningAddress: string;
  withdraw: () => void;
};

export const SiteBudgetTable: React.FC<SiteBudgetTableProps> = props => {
  const {budgetCache, channelCache, mySigningAddress, withdraw} = props;

  const myPayingChannelIds: string[] = Object.keys(channelCache).filter(
    key => channelCache[key].payer === mySigningAddress
  );
  const myReceivingChannelIds: string[] = Object.keys(channelCache).filter(
    key => channelCache[key].beneficiary === mySigningAddress
  );

  const spent = myPayingChannelIds
    .map(id => channelCache[id].beneficiaryBalance)
    .reduce((a, b) => bigNumberify(a).add(bigNumberify(b)), bigNumberify(0));

  const received = myReceivingChannelIds
    .map(id => channelCache[id].beneficiaryBalance)
    .reduce((a, b) => bigNumberify(a).add(bigNumberify(b)), bigNumberify(0));

  const spendBudget = bigNumberify(budgetCache.budgets[0].availableSendCapacity);

  const receiveBudget = bigNumberify(budgetCache.budgets[0].availableReceiveCapacity);

  return (
    <>
      <table className="site-budget-table">
        <thead>
          <tr className="budget-info">
            <td className="budget-button">Wallet Action</td>
            <td className="budget-number"> Spent / Budget </td>
            <td className="budget-number"> Earned / Budget </td>
          </tr>
        </thead>
        <tbody>
          <tr className="budget-info">
            <td className="budget-button">
              <button id="budget-withdraw" onClick={withdraw}>
                Withdraw
              </button>
            </td>
            <td className="budget-number">
              {' '}
              {`${prettyPrintWei(spent)} / ${prettyPrintWei(spendBudget)}`}{' '}
            </td>
            <td className="budget-number">
              {' '}
              {`${prettyPrintWei(received)} / ${prettyPrintWei(receiveBudget)}`}{' '}
            </td>
          </tr>
        </tbody>
      </table>
    </>
  );
};

import React, {useContext} from 'react';
import {prettyPrintWei} from '../../utils/calculateWei';
import {utils} from 'ethers';
import './SiteBudgetTable.scss';

import {ChannelContext} from '../../context/channel-context';
import {BudgetContext} from '../../context/budget-context';

const bigNumberify = utils.bigNumberify;

export const SiteBudgetTable: React.FC = () => {
  const {channelState, mySigningAddress} = useContext(ChannelContext);
  const {closeBudget, budget} = useContext(BudgetContext);

  const myPayingChannelIds: string[] = Object.keys(channelState).filter(
    key => channelState[key].payer === mySigningAddress
  );
  const myReceivingChannelIds: string[] = Object.keys(channelState).filter(
    key => channelState[key].beneficiary === mySigningAddress
  );

  const spent = myPayingChannelIds
    .map(id => channelState[id].beneficiaryBalance)
    .reduce((a, b) => bigNumberify(a).add(bigNumberify(b)), bigNumberify(0));

  const received = myReceivingChannelIds
    .map(id => channelState[id].beneficiaryBalance)
    .reduce((a, b) => bigNumberify(a).add(bigNumberify(b)), bigNumberify(0));

  const spendBudget = bigNumberify(budget.budgets[0].availableSendCapacity);

  const receiveBudget = bigNumberify(budget.budgets[0].availableReceiveCapacity);

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
              <button id="budget-withdraw" onClick={closeBudget}>
                Withdraw
              </button>
            </td>
            <td className="budget-number">
              {`${prettyPrintWei(spent)} / ${prettyPrintWei(spendBudget)}`}
            </td>
            <td className="budget-number">
              {`${prettyPrintWei(received)} / ${prettyPrintWei(receiveBudget)}`}
            </td>
          </tr>
        </tbody>
      </table>
    </>
  );
};

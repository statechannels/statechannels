import React from 'react';
import {SiteBudget} from '@statechannels/client-api-schema';
import {prettyPrintWei} from '../../../utils/calculateWei';
import {utils} from 'ethers';
import './ChannelBudget.scss';

export type ChannelBudgetProps = {
  budget: SiteBudget;
};

class ChannelBudget extends React.Component<ChannelBudgetProps> {
  render() {
    const budget = this.props.budget;
    const spent = prettyPrintWei(utils.bigNumberify(budget.budgets[0].inUse.playerAmount));
    const spendBudget = prettyPrintWei(
      utils
        .bigNumberify(budget.budgets[0].inUse.playerAmount)
        .add(utils.bigNumberify(budget.budgets[0].free.playerAmount))
    );

    const received = prettyPrintWei(utils.bigNumberify(budget.budgets[0].inUse.hubAmount));
    const receiveBudget = prettyPrintWei(
      utils
        .bigNumberify(budget.budgets[0].inUse.hubAmount)
        .add(utils.bigNumberify(budget.budgets[0].free.hubAmount))
    );
    return (
      <table className="channel-budget-table">
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
              <button disabled>Withdraw</button>
            </td>
            <td className="budget-number"> {`${spent} / ${spendBudget}`} </td>
            <td className="budget-number"> {`${received} / ${receiveBudget}`} </td>
          </tr>
        </tbody>
      </table>
    );
  }
}

export {ChannelBudget};

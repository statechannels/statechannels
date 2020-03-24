import React from 'react';
import {SiteBudget} from '@statechannels/client-api-schema';
import {prettyPrintWei} from '../../utils/calculateWei';
import {utils} from 'ethers';
import './SiteBudgetTable.scss';

const bigNumberify = utils.bigNumberify;

export type SiteBudgetTableProps = {
  budget: SiteBudget;
};

class SiteBudgetTable extends React.Component<SiteBudgetTableProps> {
  render() {
    const budget = this.props.budget;
    const spent = prettyPrintWei(bigNumberify(budget.budgets[0].inUse.playerAmount));
    const spendBudget = prettyPrintWei(
      bigNumberify(budget.budgets[0].inUse.playerAmount).add(
        bigNumberify(budget.budgets[0].free.playerAmount)
      )
    );

    const received = prettyPrintWei(bigNumberify(budget.budgets[0].inUse.hubAmount));
    const receiveBudget = prettyPrintWei(
      bigNumberify(budget.budgets[0].inUse.hubAmount).add(
        bigNumberify(budget.budgets[0].free.hubAmount)
      )
    );
    return (
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

export {SiteBudgetTable};

import React, {useContext} from 'react';
import {SiteBudgetTable} from '../../components/site-budget-table/SiteBudgetTable';
import _ from 'lodash';
import {Spinner} from '../../components/form/spinner/Spinner';
import {FormButton} from '../../components/form';
import {BudgetContext} from '../../context/budget-context';

interface Props {
  ready: boolean;
}

export const Budgets: React.FC<Props> = props => {
  return (
    <div>
      <section className="section fill budget">
        <h1>What are budgets?</h1>
        <p>
          A budget represents the funds the application is managing on your behalf. These funds can
          be used to download files using Web3Torrent.
        </p>
      </section>
      <CurrentBudget ready={props.ready} />
    </div>
  );
};

const CurrentBudget: React.FC<Props> = props => {
  const {budget, loading: budgetLoading, createBudget} = useContext(BudgetContext);

  const budgetExists = !!budget && !_.isEmpty(budget);

  return (
    <section className="section fill budget">
      <h1>Your current budget</h1>
      {budgetLoading && <Spinner visible color="orange" content="Fetching your budget"></Spinner>}
      {!budgetLoading && budgetExists && <SiteBudgetTable />}
      {!budgetLoading && !budgetExists && (
        <div>
          <div>You don't have a budget yet!</div>
          <FormButton name="create-budget" disabled={!props.ready} onClick={createBudget}>
            Create a budget
          </FormButton>
        </div>
      )}
    </section>
  );
};

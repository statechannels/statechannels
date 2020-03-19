import React from 'react';
import {EventData} from 'xstate';
import './wallet.scss';
import {Button} from 'rimble-ui';
import {WorkflowState} from '../workflows/approve-budget-and-fund';
import {formatEther} from 'ethers/utils';
import {getAmountsFromPendingBudget} from './selectors';

interface Props {
  current: WorkflowState;
  send: (event: any, payload?: EventData | undefined) => WorkflowState;
}

export const ApproveBudgetAndFund = (props: Props) => {
  const current = props.current;
  const {budget} = current.context;
  const {playerAmount, hubAmount} = getAmountsFromPendingBudget(budget);

  const prompt = (
    <div
      style={{
        textAlign: 'center'
      }}
    >
      <h1>
        {budget.site} has requested a budget of {formatEther(playerAmount)} ETH for you and{' '}
        {formatEther(hubAmount)} ETH for the hub. Do you want to fund?
      </h1>
      <Button onClick={() => props.send('USER_APPROVES_BUDGET')}>Yes</Button>
      <Button.Text onClick={() => props.send('USER_REJECTS_BUDGET')}>No</Button.Text>
    </div>
  );
  if (current.value.toString() === 'waitForUserApproval') {
    return prompt;
  } else {
    return <div></div>;
  }
};

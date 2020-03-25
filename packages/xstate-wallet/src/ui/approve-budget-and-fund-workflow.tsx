import React from 'react';
import {EventData} from 'xstate';
import './wallet.scss';
import {WorkflowState} from '../workflows/approve-budget-and-fund';
import {formatEther} from 'ethers/utils';
import {Button, Heading, Flex, Text, Table} from 'rimble-ui';
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
    <Flex alignItems="center" flexDirection="column">
      <Heading>App Budget</Heading>

      <Text textAlign="center">
        The app <strong>{budget.site}</strong> wants to manage some of your funds in a state
        channel. It wants to be able to:
      </Text>

      <Table>
        <thead>
          <th>Send</th>
          <th>Receive</th>
        </thead>
        <tbody>
          <td>{formatEther(playerAmount)} ETH</td>
          <td>{formatEther(hubAmount)} ETH</td>
        </tbody>
      </Table>

      <Text>on your behalf.</Text>

      <Text textAlign="center" pb={3}>
        To enable this, you will need to make a deposit of {formatEther(playerAmount)} ETH.
      </Text>
      <Button onClick={() => props.send('USER_APPROVES_BUDGET')}>Approve budget</Button>
      <Button.Text onClick={() => props.send('USER_REJECTS_BUDGET')}>Cancel</Button.Text>
    </Flex>
  );
  if (current.value.toString() === 'waitForUserApproval') {
    return prompt;
  } else {
    return <div></div>;
  }
};

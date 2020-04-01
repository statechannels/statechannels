import React from 'react';
import {EventData} from 'xstate';
import './wallet.scss';
import {WorkflowState} from '../workflows/approve-budget-and-fund';
import {formatEther} from 'ethers/utils';
import {Button, Heading, Flex, Text, Table} from 'rimble-ui';
import {getAmountsFromBudget} from './selectors';

interface Props {
  current: WorkflowState;
  send: (event: any, payload?: EventData | undefined) => WorkflowState;
}

export const ApproveBudgetAndFund = (props: Props) => {
  const current = props.current;
  const {budget} = current.context;
  const {playerAmount, hubAmount} = getAmountsFromBudget(budget);

  const waitForUserApproval = ({waiting}: {waiting: boolean} = {waiting: false}) => (
    <Flex alignItems="center" flexDirection="column">
      <Heading>App Budget</Heading>

      <Text textAlign="center">
        The app <strong>{budget.domain}</strong> wants to manage some of your funds in a state
        channel. It wants to be able to:
      </Text>

      <Table>
        <thead>
          <tr>
            <th>Send</th>
            <th>Receive</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{formatEther(playerAmount)} ETH</td>
            <td>{formatEther(hubAmount)} ETH</td>
          </tr>
        </tbody>
      </Table>

      <Text>on your behalf.</Text>

      <Text textAlign="center" pb={3}>
        To enable this, you will need to make a deposit of {formatEther(playerAmount)} ETH.
      </Text>
      <Button disabled={waiting} onClick={() => props.send('USER_APPROVES_BUDGET')}>
        Approve budget
      </Button>
      <Button.Text onClick={() => props.send('USER_REJECTS_BUDGET')}>Cancel</Button.Text>
    </Flex>
  );

  const waitForPreFS = (
    <Flex alignItems="center" flexDirection="column">
      <Heading>App Budget</Heading>

      <Text textAlign="center">Waiting for the hub to respond.</Text>
    </Flex>
  );

  switch (current.value.toString()) {
    case 'waitForUserApproval':
      return waitForUserApproval();
    case 'createLedgerStartState':
      return waitForUserApproval({waiting: true});
    case 'waitForPreFS':
      return waitForPreFS;
    default:
      return <div>todo</div>;
  }
};

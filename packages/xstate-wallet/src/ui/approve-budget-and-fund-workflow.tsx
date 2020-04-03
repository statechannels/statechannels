import React from 'react';
import './wallet.scss';
import {ApproveBudgetAndFundService} from '../workflows/approve-budget-and-fund';
import {useService} from '@xstate/react';

import {formatEther} from 'ethers/utils';
import {Button, Heading, Flex, Text, Box} from 'rimble-ui';
import {getAmountsFromBudget} from './selectors';

interface Props {
  service: ApproveBudgetAndFundService;
}

export const ApproveBudgetAndFund = (props: Props) => {
  const [current, send] = useService(props.service);
  const {budget} = current.context;
  const {playerAmount, hubAmount} = getAmountsFromBudget(budget);

  const waitForUserApproval = ({waiting}: {waiting: boolean} = {waiting: false}) => (
    <Flex alignItems="left" flexDirection="column">
      <Heading textAlign="center">App Budget</Heading>
      <Text>
        The app <strong>{budget.domain}</strong> wants to manage some of your funds in a state
        channel. It wants to be able to:
      </Text>

      <Flex justifyContent="center">
        <Box>
          <Text>Send: {formatEther(playerAmount)} ETH</Text>
          <Text>Receive: {formatEther(hubAmount)} ETH</Text>
        </Box>
      </Flex>
      <Text>on your behalf.</Text>
      <Text pb={3}>
        To enable this, you will need to make a deposit of {formatEther(playerAmount)} ETH.
      </Text>
      <Button disabled={waiting} onClick={() => send('USER_APPROVES_BUDGET')}>
        Approve budget
      </Button>
      <Button.Text onClick={() => send('USER_REJECTS_BUDGET')}>Cancel</Button.Text>
    </Flex>
  );

  const waitForPreFS = (
    <Flex alignItems="center" flexDirection="column">
      <Heading>App Budget</Heading>

      <Text textAlign="center">Waiting for the hub to respond.</Text>
    </Flex>
  );

  if (current.matches('waitForUserApproval')) {
    return waitForUserApproval();
  } else if (current.matches('createBudgetAndLedger')) {
    return waitForUserApproval({waiting: true});
  } else if (current.matches('waitForPreFS')) {
    return waitForPreFS;
  } else if (current.matches({deposit: 'init'})) {
    return <div>{current.context.depositAt.toString()}</div>;
  } else if (current.matches({deposit: 'submitTransaction'})) {
    return <div>{current.context.depositAt.toString()}</div>;
  } else if (current.matches({deposit: 'waitMining'})) {
    return <div>{current.context.depositAt.toString()}</div>;
  } else if (current.matches({deposit: 'retry'})) {
    return <div>{current.context.depositAt.toString()}</div>;
  } else if (current.matches({deposit: 'waitFullyFunded'})) {
    return <div>{current.context.depositAt.toString()}</div>;
  } else {
    return <div>Todo</div>;
  }
};

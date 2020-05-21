import React from 'react';
import './wallet.scss';
import {ApproveBudgetAndFundService} from '../workflows/approve-budget-and-fund';
import {useService} from '@xstate/react';

import {formatEther} from 'ethers/utils';
import {Button, Heading, Flex, Text, Box} from 'rimble-ui';
import {getAmountsFromBudget} from './selectors';
import {Deposit} from './depositing';

interface Props {
  service: ApproveBudgetAndFundService;
}

export const ApproveBudgetAndFund = (props: Props) => {
  const [current, send]: any[] = useService(props.service);
  const {budget} = current.context;
  const {playerAmount, hubAmount} = getAmountsFromBudget(budget);

  const waitForUserApproval = ({waiting}: {waiting: boolean} = {waiting: false}) => (
    <Flex alignItems="left" flexDirection="column">
      <Heading textAlign="center" mb={2}>
        App Budget
      </Heading>

      <Text fontSize={1} pb={2}>
        Approve budget for <strong>{budget.domain}</strong>?
      </Text>

      <Flex justifyContent="center" pb={2}>
        <Box>
          <Text>Send: {formatEther(playerAmount)} ETH</Text>
          <Text>Receive: {formatEther(hubAmount)} ETH</Text>
        </Box>
      </Flex>
      <Text fontSize={1} pb={2}>
        The app will have full control to manage these funds on your behalf.
      </Text>
      <Text pb={3} fontSize={1}>
        You will need to deposit {formatEther(playerAmount)} ETH into a channel with a state channel
        hub.
      </Text>
      <Button
        disabled={waiting}
        onClick={() => send('USER_APPROVES_BUDGET')}
        className="approve-budget-button"
      >
        Approve budget
      </Button>
      <Button.Text onClick={() => send('USER_REJECTS_BUDGET')}>Cancel</Button.Text>
    </Flex>
  );

  const waitForPreFS = (
    <Flex alignItems="center" flexDirection="column">
      <Heading>Deposit funds</Heading>

      <Text textAlign="center">Waiting for the hub to respond.</Text>
    </Flex>
  );

  const depositing = depositingService => (
    <Flex alignItems="center" flexDirection="column">
      <Heading>Depositing funds</Heading>
      We are currently depositing funds into the ledger channel. We can add some
      approve-budget-and-fund specific stuff here. Then, we can add an element containing the status
      of the depositing service:
      <Deposit service={depositingService}></Deposit>
    </Flex>
  );

  if (current.matches('waitForUserApproval')) {
    return waitForUserApproval();
  } else if (current.matches('createLedger')) {
    return waitForUserApproval({waiting: true});
  } else if (current.matches('waitForPreFS')) {
    return waitForPreFS;
  } else if (current.matches('deposit')) {
    return depositing(current.children.depositingService);
  } else if (current.matches('done')) {
    // workflow hides ui, so user shouldn't ever see this
    return <div>Success! Returning to app..</div>;
  } else if (current.matches('failure')) {
    // workflow hides ui, so user shouldn't ever see this
    return <div>Failed :(. Returning to app..</div>;
  } else {
    return <div>Todo</div>;
  }
};

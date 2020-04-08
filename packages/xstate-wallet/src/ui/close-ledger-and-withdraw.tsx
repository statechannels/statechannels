import React from 'react';
import {EventData} from 'xstate';
import './wallet.scss';
import {Button, Heading, Flex, Text} from 'rimble-ui';
import {WorkflowState} from '../workflows/confirm';

interface Props {
  current: WorkflowState;
  send: (event: any, payload?: EventData | undefined) => WorkflowState;
}

export const CloseLedgerAndWithdraw = (props: Props) => {
  const current = props.current;
  const prompt = (
    <Flex alignItems="center" flexDirection="column">
      <Heading>Disconnect and withdraw</Heading>

      <Text pb={3} textAlign="center">
        In order to withdraw your funds, you must first disconnect from the hub.
      </Text>
      <Text pb={3} textAlign="center">
        Once you have disconnected, you will need an on-chain transaction before you open any more
        channels.
      </Text>

      <Button onClick={() => props.send('USER_APPROVES_CLOSE')}>Close and withdraw</Button>
      <Button.Text onClick={() => props.send('USER_REJECTS_CLOSE')}>Cancel</Button.Text>
    </Flex>
  );
  if (current.value.toString() === 'waitForUserApproval') {
    return prompt;
  } else {
    return <div></div>;
  }
};

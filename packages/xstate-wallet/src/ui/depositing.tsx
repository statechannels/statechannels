import React from 'react';
import './wallet.scss';
import {Button, Heading, Flex, Text, Link} from 'rimble-ui';
import {useService} from '@xstate/react';
import {ETH_ASSET_HOLDER_ADDRESS} from '../config';

interface Props {
  service: any;
}

export const Deposit = (props: Props) => {
  const [current, send]: any[] = useService(props.service);

  const depositInit = (
    <Flex alignItems="center" flexDirection="column">
      <Heading>Deposit funds</Heading>

      <Text textAlign="center">Querying blockchain</Text>
    </Flex>
  );

  const depositWaitTurn = (
    <Flex alignItems="center" flexDirection="column">
      <Heading>Deposit funds</Heading>

      <Text pb="2">The hub is now depositing funds on-chain. This may take a moment.</Text>

      <Text id="wait-for-transaction">
        Click{' '}
        <Link
          target="_blank"
          href={`https://ropsten.etherscan.io/address/${ETH_ASSET_HOLDER_ADDRESS}`}
        >
          here
        </Link>{' '}
        to follow the progress on etherscan.
      </Text>
    </Flex>
  );

  const depositSubmitTransaction = (
    <Flex alignItems="center" flexDirection="column">
      <Heading>Deposit funds</Heading>

      <Text textAlign="center" id="please-approve-transaction">
        Please approve the transaction in metamask
      </Text>
    </Flex>
  );

  const depositWaitMining = ({transactionId}: {transactionId: string}) => (
    <Flex alignItems="center" flexDirection="column">
      <Heading>Deposit funds</Heading>

      <Text pb={2}>Waiting for your transaction to be mined.</Text>

      <Text id="wait-for-transaction">
        Click{' '}
        <Link target="_blank" href={`https://ropsten.etherscan.io/tx/${transactionId}`}>
          here
        </Link>{' '}
        to follow the progress on etherscan.
      </Text>
    </Flex>
  );

  const depositRetry = () => (
    <Flex alignItems="left" justifyContent="space-between" flexDirection="column">
      <Heading textAlign="center">Deposit Funds</Heading>

      <Text pb={4}>Your deposit transaction failed. Do you want to retry?</Text>

      <Button onClick={() => send('USER_APPROVES_RETRY')}>Resubmit transaction</Button>
      <Button.Text onClick={() => send('USER_REJECTS_RETRY')}>Cancel</Button.Text>
    </Flex>
  );

  // in the current setup, the hub deposits first, so this should never be shown
  const depositFullyFunded = (
    <Flex alignItems="center" flexDirection="column">
      <Heading>Deposit funds</Heading>

      <Text textAlign="center">Waiting for hub to deposit</Text>
    </Flex>
  );

  if (current.matches({deposit: 'init'})) {
    return depositInit;
  } else if (current.matches({deposit: 'waitTurn'})) {
    return depositWaitTurn;
  } else if (current.matches({deposit: 'submitTransaction'})) {
    return depositSubmitTransaction;
  } else if (current.matches({deposit: 'waitMining'})) {
    return depositWaitMining(current.context);
  } else if (current.matches({deposit: 'retry'})) {
    return depositRetry();
  } else if (current.matches({deposit: 'waitFullyFunded'})) {
    return depositFullyFunded;
  } else if (current.matches('createBudget')) {
    return depositFullyFunded;
  } else {
    throw 'Whoops';
  }
};

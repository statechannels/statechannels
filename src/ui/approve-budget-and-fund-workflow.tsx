import React, {useEffect, useState} from 'react';
import './wallet.scss';
import {ApproveBudgetAndFundService} from '../workflows/approve-budget-and-fund';
import {useService} from '@xstate/react';

import {formatEther} from '@ethersproject/units';
import {Button, Heading, Flex, Text, Box, Link} from 'rimble-ui';
import {getAmountsFromBudget} from './selectors';
import {ETH_ASSET_HOLDER_ADDRESS} from '../config';
import {utils} from 'ethers';
interface Props {
  service: ApproveBudgetAndFundService;
}

export const ApproveBudgetAndFund = (props: Props) => {
  const [current, send] = useService(props.service);
  const {budget} = current.context;
  const {playerAmount, hubAmount} = getAmountsFromBudget(budget);

  // Sets a timer that expires after 1.5 minutes
  // Used to determine if we've timed out waiting for the hub
  let stateTimer;
  const [stateTimerExpired, setStateTimerExpired] = useState(false);
  useEffect(() => {
    setStateTimerExpired(false);
    stateTimer = setTimeout(() => setStateTimerExpired(true), 90_000 /* 1.5 min */);
    return () => {
      clearTimeout(stateTimer);
    };
  }, [current]);

  const waitForSufficientFundsInit = (
    <Flex alignItems="center" flexDirection="column">
      <Heading>App Budget</Heading>

      <Text textAlign="center">Checking if your Metamask account has sufficient ETH</Text>
    </Flex>
  );

  const waitForSufficientFunds = (
    <Flex alignItems="left" flexDirection="column">
      <Heading textAlign="center" mb={2}>
        App Budget
      </Heading>
      <Text pb={3} fontSize={1}>
        You don&#39;t have enough ETH in your wallet!
      </Text>
      <Text pb={3} fontSize={1}>
        You&#39;ll need at least {utils.formatEther(playerAmount)} ETH in your Metamask wallet to fund the
        channel. You can get more ETH{' '}
        <Link target="_blank" href={`https://faucet.ropsten.be/`}>
          here.
        </Link>
      </Text>
    </Flex>
  );
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

  const hubTimeout = (
    <Flex alignItems="center" flexDirection="column">
      <Heading>Deposit Funds</Heading>
      <Text pb={4} textAlign="center">
        We haven&apos;t heard back from the hub in a bit so something might have gone wrong.
      </Text>
      <Text pb={4} textAlign="center">
        You can click{' '}
        <Link
          target="_blank"
          href={`https://ropsten.etherscan.io/address/${ETH_ASSET_HOLDER_ADDRESS}`}
        >
          here
        </Link>{' '}
        to see the progress on etherscan or you can download your log files and reach out to us on{' '}
        <Link target="_blank" href={'https://github.com/statechannels/monorepo/issues'}>
          {' '}
          github.
        </Link>
      </Text>
      <Button
        onClick={() => {
          window.parent.postMessage('SAVE_WEB3_TORRENT_LOGS', '*');
        }}
      >
        Download logs
      </Button>
    </Flex>
  );

  if (current.matches('waitForUserApproval')) {
    return waitForUserApproval();
  } else if (current.matches({waitForSufficientFunds: 'init'})) {
    return waitForSufficientFundsInit;
  } else if (current.matches({waitForSufficientFunds: 'waitForFunds'})) {
    return waitForSufficientFunds;
  } else if (current.matches('createLedger')) {
    return waitForSufficientFunds;
  } else if (current.matches('waitForPreFS')) {
    return waitForPreFS;
  } else if (current.matches({deposit: 'init'})) {
    return depositInit;
  } else if (current.matches({deposit: 'waitTurn'})) {
    if (stateTimerExpired) {
      return hubTimeout;
    } else {
      return depositWaitTurn;
    }
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

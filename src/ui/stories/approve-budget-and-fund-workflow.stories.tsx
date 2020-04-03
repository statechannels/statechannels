import {machine as approveBudgetAndFundWorkflow} from '../../workflows/approve-budget-and-fund';
export default {title: 'X-state wallet'};
import {storiesOf} from '@storybook/react';
import {interpret} from 'xstate';
import {renderComponentInFrontOfApp} from './helpers';

import React from 'react';
import {ApproveBudgetAndFund} from '../approve-budget-and-fund-workflow';
import {SiteBudget, Participant} from '../../store/types';
import {MessagingServiceInterface, MessagingService} from '../../messaging';
import {XstateStore} from '../../store';
import {ethBudget} from '../../utils';
import {bigNumberify, parseEther} from 'ethers/utils';

const store = new XstateStore();

store.initialize(['0x8624ebe7364bb776f891ca339f0aaa820cc64cc9fca6a28eec71e6d8fc950f29']);
const messagingService: MessagingServiceInterface = new MessagingService(store);

const budget: SiteBudget = ethBudget('rps.statechannels.org', {
  availableReceiveCapacity: parseEther('0.05'),
  availableSendCapacity: parseEther('0.05')
});

const alice: Participant = {
  participantId: 'a',
  signingAddress: '0xa',
  destination: '0xad' as any
};

const hub: Participant = {
  participantId: 'b',
  signingAddress: '0xb',
  destination: '0xbd' as any
};

const addStory = (name, value, context) => {
  const workflow = approveBudgetAndFundWorkflow(store, messagingService, context);
  const machine = interpret(workflow, {devTools: true}); // start a new interpreted machine for each story
  machine.onEvent(event => console.log(event.type)).start(value);
  storiesOf('Workflows / Approve Budget And Fund', module).add(
    name,
    renderComponentInFrontOfApp(
      <ApproveBudgetAndFund current={machine.state} send={machine.send} />
    )
  );
  machine.stop(); // the machine will be stopped before it can be transitioned. This means the console.log on L49 throws a warning that we sent an event to a stopped machine.
};

const testContext = {
  budget,
  requestId: 55,
  player: alice,
  hub
};
const contextWithLedger = {...testContext, ledgerId: 'ledger123', ledgerState: {}};
const contextWithDeposit = {
  ...contextWithLedger,
  depositAt: bigNumberify(5),
  totalAfterDeposit: bigNumberify(10),
  fundedAt: bigNumberify(12)
};

const contextWaitTurn = {
  ...contextWithDeposit,
  ledgerTotal: bigNumberify(0),
  lastChangeBlockNum: 9792500,
  currentBlockNum: 9792500
};
const contextSubmitTransaction = {...contextWaitTurn, ledgerTotal: bigNumberify(5)};
const contextWaitMining = {...contextSubmitTransaction, transactionId: 'transaction-123'};
const contextWaitFullyFunded = {...contextWaitTurn, ledgerTotal: bigNumberify(10)};

addStory('waitForUserApproval', 'waitForUserApproval', testContext);
addStory('createBudgetAndLedger', 'createBudgetAndLedger', testContext);
addStory('waitForPreFS', 'waitForPreFS', contextWithLedger);
addStory('deposit.init', {deposit: 'init'}, contextWithDeposit);
addStory('deposit.waitTurn', {deposit: 'waitTurn'}, contextWaitTurn);
addStory('deposit.submitTransaction', {deposit: 'submitTransaction'}, contextSubmitTransaction);
addStory('deposit.retry', {deposit: 'retry'}, contextSubmitTransaction);
addStory('deposit.waitMining', {deposit: 'waitMining'}, contextWaitMining);
addStory('deposit.waitFullyFunded', {deposit: 'waitFullyFunded'}, contextWaitFullyFunded);

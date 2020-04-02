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

const store = new XstateStore();

store.initialize(['0x8624ebe7364bb776f891ca339f0aaa820cc64cc9fca6a28eec71e6d8fc950f29']);
const messagingService: MessagingServiceInterface = new MessagingService(store);

const budget: SiteBudget = ethBudget('rps.statechannels.org', {});

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
const testContext = {
  budget,
  requestId: 55,
  player: alice,
  hub
};
const workflow = approveBudgetAndFundWorkflow(store, messagingService, testContext);

if (workflow.states) {
  Object.keys(workflow.states).forEach(state => {
    const machine = interpret(workflow, {devTools: true}); // start a new interpreted machine for each story
    machine.onEvent(event => console.log(event.type)).start(state);
    storiesOf('Workflows / Approve Budget And Fund', module).add(
      state.toString(),
      renderComponentInFrontOfApp(
        <ApproveBudgetAndFund current={machine.state} send={machine.send} />
      )
    );
    machine.stop(); // the machine will be stopped before it can be transitioned. This means the console.log on L49 throws a warning that we sent an event to a stopped machine.
  });
}

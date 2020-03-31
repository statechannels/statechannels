import {
  workflow as closeLedgerWithdrawWorkflow,
  config,
  WorkflowContext
} from '../../workflows/close-ledger-and-withdraw';
export default {title: 'X-state wallet'};
import {storiesOf} from '@storybook/react';
import {interpret} from 'xstate';
import {renderComponentInFrontOfApp} from './helpers';
import {XstateStore} from '../../store';
import React from 'react';
import {CloseLegerWithdraw} from '../close-ledger-and-withdraw';
import {MessagingService, MessagingServiceInterface} from '../../messaging';
import {Participant} from '../../store/types';

const store = new XstateStore();
store.initialize(['0x8624ebe7364bb776f891ca339f0aaa820cc64cc9fca6a28eec71e6d8fc950f29']);
const messagingService: MessagingServiceInterface = new MessagingService(store);

const alice: Participant = {
  participantId: 'a',
  signingAddress: '0xa',
  destination: '0xad' as any
};

const bob: Participant = {
  participantId: 'b',
  signingAddress: '0xb',
  destination: '0xbd' as any
};

const testContext: WorkflowContext = {
  player: alice,
  opponent: bob,
  requestId: 123,
  ledgerId: 'ledger-id-123',
  site: 'abc.com'
};

if (config.states) {
  Object.keys(config.states).forEach(state => {
    const machine = interpret<any, any, any>(
      closeLedgerWithdrawWorkflow(store, messagingService, testContext).withContext(testContext),
      {
        devTools: true
      }
    ); // start a new interpreted machine for each story
    machine.onEvent(event => console.log(event.type)).start(state);
    storiesOf('Workflows / Close And Withdraw', module).add(
      state.toString(),
      renderComponentInFrontOfApp(
        <CloseLegerWithdraw current={machine.state} send={machine.send} />
      )
    );
    machine.stop(); // the machine will be stopped before it can be transitioned. This means the console.log on L49 throws a warning that we sent an event to a stopped machine.
  });
}
